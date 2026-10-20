import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AdminGuard, CrudPage } from "@/components/crud-page";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Eye, Loader2, Search, X, XCircle } from "lucide-react";
import type { District, Market } from "@/lib/api/client";
import { districtsService, statesService, marketsService, usersService } from "@/services";

interface State {
  id: number;
  name: string;
  symbol: string;
}

const getDistrictMarket = (d: District) => {
  if (d.market?.name) return d.market.name;
  if (typeof (d as any).market === "string" && (d as any).market) return (d as any).market;
  return "—";
};

export default function DistrictsPage() {
  const navigate = useNavigate();
  const [districts, setDistricts] = useState<District[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [marketsLoading, setMarketsLoading] = useState<boolean>(false);
  const [selectedStateFilter, setSelectedStateFilter] = useState<string>("all");
  const [selectedMarketFilter, setSelectedMarketFilter] = useState<string>("all");

  // Search box state (backend search)
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isSearchingBackend, setIsSearchingBackend] = useState(false);

  // Search text states for dropdown menus
  const [mainFilterSearch, setMainFilterSearch] = useState("");
  const [marketFilterSearch, setMarketFilterSearch] = useState("");

  // Refs for auto-focusing inputs on open
  const mainSearchInputRef = useRef<HTMLInputElement>(null);
  const marketSearchInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Server-side pagination parameters
  const [page, setPage] = useState<number>(0);
  const [size, setSize] = useState<number>(25);
  const [totalRecords, setTotalRecords] = useState<number>(0);

  // Synchronous atomic locker to prevent simultaneous duplicate fetches
  const lastFetchedKey = useRef<string>("");
  const isFetchingRef = useRef<boolean>(false);
  const statesFetchedRef = useRef<boolean>(false);

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 400);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Master fetch handler supporting backend search and paginated list with state/market filters
  const fetchDistricts = async (
    targetPage: number,
    targetSize: number,
    targetState: string,
    targetMarket: string,
    search?: string,
  ) => {
    const trimmedSearch = (search ?? "").trim();
    const currentRequestKey = trimmedSearch
      ? `search-${trimmedSearch}-${targetState}-${targetMarket}`
      : `page-${targetPage}-${targetSize}-${targetState}-${targetMarket}`;

    if (lastFetchedKey.current === currentRequestKey || isFetchingRef.current) {
      return;
    }

    try {
      if (trimmedSearch) {
        setIsSearchingBackend(true);
      } else {
        setLoading(true);
      }
      isFetchingRef.current = true;
      lastFetchedKey.current = currentRequestKey;

      // 1. Fetch States static filter options dropdown list only once
      if (!statesFetchedRef.current) {
        const statesRes = await statesService.getAll();
        if (statesRes.success && Array.isArray(statesRes.data)) {
          setStates(statesRes.data);
          statesFetchedRef.current = true;
        } else {
          toast.error(statesRes.message || "Failed to load states filter options");
        }
      }

      // 2. Resolve state filter parameter (by state name)
      let stateParam: string | undefined = undefined;
      if (targetState && targetState !== "all") {
        const matchState = states.find(
          (s) => s.id.toString() === targetState || s.name === targetState,
        );
        stateParam = matchState ? matchState.name : targetState;
      }

      // 3. Resolve market filter parameter
      let marketParam: string | undefined = undefined;
      if (targetMarket && targetMarket !== "all") {
        const matchMarket = markets.find(
          (m) => m.id.toString() === targetMarket || m.name === targetMarket,
        );
        marketParam = matchMarket ? matchMarket.name : targetMarket;
      }

      // 4. Fetch data directly from backend with service class
      const res = trimmedSearch
        ? await districtsService.getAll({
            Search: trimmedSearch,
            state: stateParam,
            market: marketParam,
          })
        : await districtsService.getAll({
            page: targetPage,
            size: targetSize,
            state: stateParam,
            market: marketParam,
          });

      if (res.success) {
        if (
          !trimmedSearch &&
          res.data.length === 0 &&
          res.pagination &&
          res.pagination.totalRecords > 0 &&
          targetPage > 0
        ) {
          const maxAvailablePage = Math.ceil(res.pagination.totalRecords / targetSize) - 1;
          const fallbackPage = Math.max(0, maxAvailablePage);

          isFetchingRef.current = false;
          lastFetchedKey.current = "";
          setPage(fallbackPage);
          return;
        }

        setDistricts(Array.isArray(res.data) ? res.data : []);
        setTotalRecords(
          res.pagination?.totalRecords ?? (Array.isArray(res.data) ? res.data.length : 0),
        );
      } else {
        toast.error(res.message || "Failed to load districts");
        lastFetchedKey.current = "";
      }
    } catch (err: any) {
      toast.error(err?.message || "Something went wrong while fetching data");
      lastFetchedKey.current = "";
    } finally {
      setLoading(false);
      setIsSearchingBackend(false);
      isFetchingRef.current = false;
    }
  };

  useEffect(() => {
    fetchDistricts(page, size, selectedStateFilter, selectedMarketFilter, debouncedSearch);
  }, [page, size, selectedStateFilter, selectedMarketFilter, debouncedSearch]);

  const handleStateFilterChange = async (newState: string) => {
    lastFetchedKey.current = "";
    setPage(0);
    setSelectedStateFilter(newState);
    setSelectedMarketFilter("all");

    if (newState === "all") {
      setMarkets([]);
      return;
    }

    // Call markets API for the selected state
    const match = states.find((s) => s.id.toString() === newState || s.name === newState);
    const stateName = match ? match.name : newState;

    try {
      setMarketsLoading(true);
      const res = await marketsService.getAll({ State: stateName });
      if (res.success && Array.isArray(res.data)) {
        setMarkets(res.data);
      } else {
        setMarkets([]);
      }
    } catch (err) {
      console.error("Failed to load markets for selected state:", err);
      setMarkets([]);
    } finally {
      setMarketsLoading(false);
    }
  };

  const handleResetFilters = () => {
    if (selectedStateFilter === "all" && selectedMarketFilter === "all" && !searchQuery) return;
    lastFetchedKey.current = "";
    setPage(0);
    setSelectedStateFilter("all");
    setSelectedMarketFilter("all");
    setMarkets([]);
    setSearchQuery("");
    toast.success("Filters cleared successfully");
  };

  const handleDelete = async (d: District) => {
    try {
      setActionLoading(true);
      const res = await districtsService.delete(d.id);
      if (res.success) {
        toast.success(res.message || "District deleted successfully");
        lastFetchedKey.current = "";
        fetchDistricts(page, size, selectedStateFilter, selectedMarketFilter, debouncedSearch);
      } else {
        toast.error(res.message || "Could not delete district");
      }
    } catch (err: any) {
      toast.error(err?.message || "Delete failed");
    } finally {
      setActionLoading(false);
    }
  };

  interface DistrictFormData {
    name: string;
    marketId: string | number;
    market?: string;
    stateId: number;
    managerId: number | null;
    manager?: string;
    email: string | null;
    phone: string | null;
  }

  const handleSave = async (
    initial: District | null,
    formData: DistrictFormData,
    close: () => void,
  ) => {
    try {
      setActionLoading(true);
      const payload: any = {
        name: formData.name.trim(),
        stateId: Number(formData.stateId),
        marketId:
          formData.marketId && formData.marketId !== "none" && Number(formData.marketId) > 0
            ? Number(formData.marketId)
            : undefined,
        managerId:
          formData.managerId && Number(formData.managerId) > 0 ? Number(formData.managerId) : null,
        manager: formData.manager?.trim() || undefined,
        email: formData.email?.trim() || null,
        phone: formData.phone?.trim() || null,
      };

      if (initial) {
        payload.id = initial.id;
        const res = await districtsService.update(payload);
        if (res.success) {
          toast.success(res.message || "District updated successfully");
          lastFetchedKey.current = "";
          fetchDistricts(page, size, selectedStateFilter, selectedMarketFilter, debouncedSearch);
          close();
        } else {
          toast.error(res.message || "Update failed");
        }
      } else {
        const res = await districtsService.add(payload);
        if (res.success) {
          toast.success(res.message || "District added successfully");
          lastFetchedKey.current = "";
          fetchDistricts(page, size, selectedStateFilter, selectedMarketFilter, debouncedSearch);
          close();
        } else {
          toast.error(res.message || "Failed to create district");
        }
      }
    } catch (err: any) {
      toast.error(err?.message || "Operation failed");
    } finally {
      setActionLoading(false);
    }
  };

  const filteredMainStatesOptions = useMemo(() => {
    return states.filter((s) => s.name.toLowerCase().includes(mainFilterSearch.toLowerCase()));
  }, [states, mainFilterSearch]);

  const filteredMarketOptions = useMemo(() => {
    return markets.filter((m) => m.name.toLowerCase().includes(marketFilterSearch.toLowerCase()));
  }, [markets, marketFilterSearch]);

  if (loading && districts.length === 0) {
    return (
      <div className="flex h-[50vh] w-full flex-col items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-medium">Loading Districts...</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="w-full border-0 shadow-none bg-transparent [&_input]:bg-white dark:[&_input]:bg-zinc-950 [&_button.w-\[180px\]]:bg-white dark:[&_button.w-\[180px\]]:bg-zinc-950 [&_thead]:bg-zinc-200 dark:[&_thead]:bg-zinc-800 [&_thead]:border-b-2 [&_thead]:border-border [&_th]:font-bold [&_th]:text-zinc-900 dark:[&_th]:text-zinc-100 [&_th]:h-12 [&_tbody_tr]:bg-background [&_tbody_tr]:even:bg-zinc-50/50 dark:[&_tbody_tr]:even:bg-zinc-900/30 [&_tbody_tr]:hover:bg-muted/40 [&_th:last-child]:text-right [&_th:last-child]:pr-10 [&_td:last-child]:text-right [&_td[colspan]]:text-center [&_td[colspan]]:font-medium">
        <div className="[&_.flex-col]:flex-row [&_.flex-col]:items-center [&_.flex-col]:justify-between [&_.max-w-sm]:order-last [&_.max-w-sm]:ml-auto">
          <CrudPage<District>
            title="Districts"
            subtitle="Manage districts and map them to operating states."
            rows={districts}
            rowKey={(d) => d.id.toString()}
            isSaving={actionLoading}
            isLoading={loading && !debouncedSearch}
            rowCount={totalRecords}
            page={page}
            pageSize={size}
            onPageChange={(newPage) => setPage(newPage)}
            onPageSizeChange={(newSize) => setSize(newSize)}
            searchPlaceholder="Search districts..."
            serverSearch={true}
            searchValue={searchQuery}
            onSearchChange={(val) => {
              lastFetchedKey.current = "";
              setSearchQuery(val);
              if (page !== 0) setPage(0);
            }}
            isSearching={isSearchingBackend || searchQuery !== debouncedSearch}
            extraToolbar={
              <div className="flex flex-wrap items-center gap-3">
                {/* 1. State Filter */}
                <div className="relative flex flex-col pt-2.5">
                  <span className="absolute -top-1 left-2 bg-background px-1 text-[11px] font-semibold text-muted-foreground z-10">
                    State
                  </span>

                  <Select
                    value={selectedStateFilter}
                    onValueChange={handleStateFilterChange}
                    onOpenChange={(open) => {
                      if (!open) {
                        setMainFilterSearch("");
                      } else {
                        setTimeout(() => mainSearchInputRef.current?.focus(), 100);
                      }
                    }}
                  >
                    <SelectTrigger className="w-[180px] h-9 focus:ring-0 border-muted-foreground/40 bg-white dark:bg-zinc-950">
                      <SelectValue placeholder="Filter by State" />
                    </SelectTrigger>

                    <SelectContent
                      onKeyDown={(e) => e.stopPropagation()}
                      onKeyUp={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center px-2 py-1.5 border-b sticky top-0 bg-popover z-10">
                        <Search className="h-3.5 w-3.5 mr-2 text-muted-foreground shrink-0" />
                        <input
                          ref={mainSearchInputRef}
                          placeholder="Search states..."
                          value={mainFilterSearch}
                          onChange={(e) => {
                            setMainFilterSearch(e.target.value);
                            setTimeout(() => mainSearchInputRef.current?.focus(), 0);
                          }}
                          className="w-full text-xs bg-transparent outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
                        />
                      </div>

                      <SelectItem value="all">All States</SelectItem>
                      {filteredMainStatesOptions.length === 0 ? (
                        <p className="text-[11px] text-center text-muted-foreground p-2">
                          No matching states
                        </p>
                      ) : (
                        filteredMainStatesOptions.map((s) => (
                          <SelectItem key={s.id} value={s.id.toString()}>
                            {s.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* 2. Market Filter (Disabled by default, enabled when State is selected) */}
                <div className="relative flex flex-col pt-2.5">
                  <span className="absolute -top-1 left-2 bg-background px-1 text-[11px] font-semibold text-muted-foreground z-10">
                    Market
                  </span>

                  <Select
                    value={selectedMarketFilter}
                    disabled={selectedStateFilter === "all" || marketsLoading}
                    onValueChange={(newMarket) => {
                      lastFetchedKey.current = "";
                      setSelectedMarketFilter(newMarket);
                      setPage(0);
                    }}
                    onOpenChange={(open) => {
                      if (!open) {
                        setMarketFilterSearch("");
                      } else {
                        setTimeout(() => marketSearchInputRef.current?.focus(), 100);
                      }
                    }}
                  >
                    <SelectTrigger className="w-[180px] h-9 focus:ring-0 border-muted-foreground/40 bg-white dark:bg-zinc-950 disabled:opacity-50 disabled:cursor-not-allowed">
                      <SelectValue
                        placeholder={
                          selectedStateFilter === "all"
                            ? "Select State First"
                            : marketsLoading
                              ? "Loading markets..."
                              : "Filter by Market"
                        }
                      />
                    </SelectTrigger>

                    <SelectContent
                      onKeyDown={(e) => e.stopPropagation()}
                      onKeyUp={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center px-2 py-1.5 border-b sticky top-0 bg-popover z-10">
                        <Search className="h-3.5 w-3.5 mr-2 text-muted-foreground shrink-0" />
                        <input
                          ref={marketSearchInputRef}
                          placeholder="Search markets..."
                          value={marketFilterSearch}
                          onChange={(e) => {
                            setMarketFilterSearch(e.target.value);
                            setTimeout(() => marketSearchInputRef.current?.focus(), 0);
                          }}
                          className="w-full text-xs bg-transparent outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
                        />
                      </div>

                      <SelectItem value="all">All Markets</SelectItem>
                      {filteredMarketOptions.length === 0 ? (
                        <p className="text-[11px] text-center text-muted-foreground p-2">
                          {marketsLoading ? "Loading..." : "No markets found"}
                        </p>
                      ) : (
                        filteredMarketOptions.map((m) => (
                          <SelectItem key={m.id} value={m.id.toString()}>
                            {m.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* 3. Reset Filters Button */}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={
                    selectedStateFilter === "all" && selectedMarketFilter === "all" && !searchQuery
                  }
                  onClick={handleResetFilters}
                  className="h-9 px-3 text-xs font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 border border-dashed border-muted-foreground/30 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted-foreground transition-all duration-300 ease-out group active:scale-95"
                >
                  <XCircle className="h-3.5 w-3.5 mr-1.5 text-muted-foreground/70 group-hover:text-destructive group-hover:rotate-90 transition-transform duration-300 ease-in-out" />
                  Reset Filters
                </Button>
              </div>
            }

            columns={[
              {
                key: "name",
                header: "Name",
                accessor: (d) => <div className="py-2 text-left font-medium">{d.name}</div>,
                searchValue: (d) => d.name,
              },
              {
                key: "market",
                header: "Market",
                accessor: (d) => (
                  <div className="py-2 text-left text-zinc-700 dark:text-zinc-300 font-medium">
                    {getDistrictMarket(d)}
                  </div>
                ),
                searchValue: (d) => getDistrictMarket(d),
              },
              {
                key: "state",
                header: "State",
                accessor: (d) => (
                  <div className="py-2 text-left text-muted-foreground">{d.state?.name ?? "—"}</div>
                ),
                searchValue: (d) => d.state?.name ?? "",
              },
              {
                key: "manager",
                header: "Manager",
                accessor: (d) => {
                  const assigned = d.assignedUsers?.[0];
                  const mgrName =
                    assigned?.name || (d as any).manager || (d as any).districtManager || "—";
                  return (
                    <div className="py-2 text-left text-zinc-800 dark:text-zinc-200 font-medium">
                      {mgrName}
                    </div>
                  );
                },
                searchValue: (d) => d.assignedUsers?.[0]?.name || (d as any).manager || "",
              },
              {
                key: "email",
                header: "Email",
                accessor: (d) => {
                  const assigned = d.assignedUsers?.[0];
                  const mgrEmail = assigned?.email || (d as any).email || "—";
                  return (
                    <div className="py-2 text-left text-xs text-muted-foreground">{mgrEmail}</div>
                  );
                },
                searchValue: (d) => d.assignedUsers?.[0]?.email || (d as any).email || "",
              },
              {
                key: "phone",
                header: "Phone",
                accessor: (d) => {
                  const assigned = d.assignedUsers?.[0];
                  const mgrPhone = assigned?.phone || (d as any).phone || "—";
                  return (
                    <div className="py-2 text-left text-xs text-zinc-600 dark:text-zinc-400 font-mono">
                      {mgrPhone}
                    </div>
                  );
                },
                searchValue: (d) => d.assignedUsers?.[0]?.phone || (d as any).phone || "",
              },
            ]}
            extraRowActions={(d) => (
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
                title="View District Details"
                onClick={() => navigate(`/admin/districts/${d.id}`)}
              >
                <Eye className="h-4 w-4" />
              </Button>
            )}
            onDelete={handleDelete}
            renderForm={(initial, close) => (
              <DistrictForm
                initial={initial}
                states={states}
                isSaving={actionLoading}
                onSave={(formData) => handleSave(initial, formData, close)}
              />
            )}
          />
        </div>
      </div>
    </div>
  );
}

interface DistrictFormProps {
  initial: District | null;
  states: State[];
  isSaving: boolean;
  onSave: (data: DistrictFormData) => void;
}

function DistrictForm({ initial, states, isSaving, onSave }: DistrictFormProps) {
  const initialUser = initial?.assignedUsers?.[0];
  const [name, setName] = useState(initial?.name ?? "");

  // Resolve state ID robustly (whether state is an object, or stateId property exists, or matched by state name)
  const resolvedStateId = (() => {
    if (initial?.state?.id) return initial.state.id.toString();
    if ((initial as any)?.stateId) return String((initial as any).stateId);
    if (initial?.state?.name) {
      const match = states.find((s) => s.name.toLowerCase() === initial.state!.name.toLowerCase());
      if (match) return match.id.toString();
    }
    return "";
  })();

  const [stateId, setStateId] = useState<string>(resolvedStateId);

  // Resolve market ID robustly
  const resolvedMarketId = (() => {
    if (initial?.market?.id) return initial.market.id.toString();
    if ((initial as any)?.marketId) return String((initial as any).marketId);
    return "";
  })();

  const [marketId, setMarketId] = useState<string>(resolvedMarketId);

  const [managerId, setManagerId] = useState<number | null>(
    initialUser?.id ??
      (initial?.managerId && (initial as any).managerId > 0 ? (initial as any).managerId : null),
  );
  const [manager, setManager] = useState<string>(initialUser?.name ?? initial?.manager ?? "");
  const [email, setEmail] = useState<string>(initialUser?.email ?? initial?.email ?? "");
  const [phone, setPhone] = useState<string>(initialUser?.phone ?? initial?.phone ?? "");

  // Searchbox states for District Manager
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    Array<{ id: number; fullName: string; email?: string; phone?: string }>
  >([]);
  const [loadingUsers, setLoadingUsers] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Search states for dropdowns
  const [stateSearch, setStateSearch] = useState("");
  const stateSearchRef = useRef<HTMLInputElement>(null);
  const [marketSearch, setMarketSearch] = useState("");
  const marketSearchRef = useRef<HTMLInputElement>(null);

  // Close search results dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounce manager search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch users from API
  useEffect(() => {
    let active = true;
    const fetchUsers = async () => {
      if (!isOpen && !debouncedSearchQuery) return;
      setLoadingUsers(true);
      try {
        const res = await usersService.search({ search: debouncedSearchQuery });
        if (active && res.success && Array.isArray(res.data)) {
          const mapped = res.data.map((u: any) => ({
            id: u.id,
            fullName:
              u.fullName ||
              u.name ||
              `${u.firstName || ""} ${u.lastName || ""}`.trim() ||
              `User #${u.id}`,
            email: u.email || "",
            phone: u.phone || "",
          }));
          setSearchResults(mapped);
        }
      } catch (err) {
        console.error("Failed to search users:", err);
      } finally {
        if (active) setLoadingUsers(false);
      }
    };

    fetchUsers();

    return () => {
      active = false;
    };
  }, [debouncedSearchQuery, isOpen]);

  const handleSelectUser = (user: {
    id: number;
    fullName: string;
    email?: string;
    phone?: string;
  }) => {
    setManagerId(user.id);
    setManager(user.fullName);
    setEmail(user.email || "");
    setPhone(user.phone || "");
    setSearchQuery("");
    setIsOpen(false);
  };

  const handleRemoveManager = () => {
    setManagerId(null);
    setManager("");
    setEmail("");
    setPhone("");
    setSearchQuery("");
  };

  const filteredStates = useMemo(() => {
    return states.filter((s) => s.name.toLowerCase().includes(stateSearch.toLowerCase()));
  }, [states, stateSearch]);

  const [formMarkets, setFormMarkets] = useState<Market[]>(() => {
    if (initial?.market?.id && initial?.market?.name) {
      return [{ id: initial.market.id, name: initial.market.name } as Market];
    }
    return [];
  });
  const [loadingFormMarkets, setLoadingFormMarkets] = useState(false);

  useEffect(() => {
    if (!stateId) {
      setFormMarkets([]);
      return;
    }
    const match = states.find((s) => s.id.toString() === stateId || s.name === stateId);
    const stateName = match ? match.name : stateId;

    let active = true;
    setLoadingFormMarkets(true);
    marketsService
      .getAll({ State: stateName })
      .then((res) => {
        if (active && res.success && Array.isArray(res.data)) {
          setFormMarkets(res.data);
        }
      })
      .catch((err) => {
        console.error("Failed to load markets for form:", err);
      })
      .finally(() => {
        if (active) setLoadingFormMarkets(false);
      });

    return () => {
      active = false;
    };
  }, [stateId, states]);

  const formMarketOptions = useMemo(() => {
    return formMarkets.filter((m) => m.name.toLowerCase().includes(marketSearch.toLowerCase()));
  }, [formMarkets, marketSearch]);

  // District name, state, and market are all required
  const isFormValid =
    Boolean(name.trim()) && Boolean(stateId) && Boolean(marketId) && marketId !== "none";

  return (
    <div className="space-y-4">
      {/* 1. District Name (Required) */}
      <div className="space-y-1.5">
        <Label>
          District Name <span className="text-destructive">*</span>
        </Label>
        <Input
          value={name}
          disabled={isSaving}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Central District"
          required
        />
      </div>

      {/* 2. State (Required) */}
      <div className="space-y-1.5">
        <Label>
          State <span className="text-destructive">*</span>
        </Label>
        <Select
          value={stateId}
          disabled={isSaving}
          onValueChange={(val) => {
            setStateId(val);
            setMarketId("");
          }}
          onOpenChange={(open) => {
            if (!open) setStateSearch("");
            else setTimeout(() => stateSearchRef.current?.focus(), 100);
          }}
        >
          <SelectTrigger className="w-full bg-white dark:bg-zinc-950">
            <SelectValue placeholder="Select operating state" />
          </SelectTrigger>
          <SelectContent
            onKeyDown={(e) => e.stopPropagation()}
            onKeyUp={(e) => e.stopPropagation()}
          >
            <div className="flex items-center px-2 py-1.5 border-b sticky top-0 bg-popover z-10">
              <Search className="h-3.5 w-3.5 mr-2 text-muted-foreground shrink-0" />
              <input
                ref={stateSearchRef}
                placeholder="Search states..."
                value={stateSearch}
                onChange={(e) => {
                  setStateSearch(e.target.value);
                  setTimeout(() => stateSearchRef.current?.focus(), 0);
                }}
                className="w-full text-xs bg-transparent outline-none placeholder:text-muted-foreground"
              />
            </div>
            {filteredStates.map((s) => (
              <SelectItem key={s.id} value={s.id.toString()}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 3. Market (Required) */}
      <div className="space-y-1.5">
        <Label>
          Market <span className="text-destructive">*</span>
        </Label>
        <Select
          value={marketId}
          disabled={isSaving || !stateId || loadingFormMarkets}
          onValueChange={setMarketId}
          onOpenChange={(open) => {
            if (!open) setMarketSearch("");
            else setTimeout(() => marketSearchRef.current?.focus(), 100);
          }}
        >
          <SelectTrigger className="w-full bg-white dark:bg-zinc-950 disabled:opacity-50 disabled:cursor-not-allowed">
            <SelectValue
              placeholder={
                !stateId
                  ? "Select State First"
                  : loadingFormMarkets
                    ? "Loading markets..."
                    : formMarketOptions.length === 0
                      ? "No markets available for this state"
                      : "Select associated market"
              }
            />
          </SelectTrigger>
          <SelectContent
            onKeyDown={(e) => e.stopPropagation()}
            onKeyUp={(e) => e.stopPropagation()}
          >
            <div className="flex items-center px-2 py-1.5 border-b sticky top-0 bg-popover z-10">
              <Search className="h-3.5 w-3.5 mr-2 text-muted-foreground shrink-0" />
              <input
                ref={marketSearchRef}
                placeholder="Search markets..."
                value={marketSearch}
                onChange={(e) => {
                  setMarketSearch(e.target.value);
                  setTimeout(() => marketSearchRef.current?.focus(), 0);
                }}
                className="w-full text-xs bg-transparent outline-none placeholder:text-muted-foreground"
              />
            </div>
            {formMarketOptions.length === 0 ? (
              <div className="p-3 text-xs text-center text-muted-foreground">
                {loadingFormMarkets ? "Loading markets..." : "No markets found"}
              </div>
            ) : (
              formMarketOptions.map((m) => (
                <SelectItem key={m.id} value={m.id.toString()}>
                  {m.name}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      {/* 4. District Manager (Optional) */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label>
            District Manager{" "}
            <span className="text-xs text-muted-foreground font-normal">(Optional)</span>
          </Label>
          {managerId || manager ? (
            <button
              type="button"
              onClick={handleRemoveManager}
              disabled={isSaving}
              className="text-xs text-destructive hover:underline cursor-pointer flex items-center gap-1 font-medium"
            >
              <X className="h-3 w-3" /> Change manager
            </button>
          ) : null}
        </div>

        {managerId || manager ? (
          /* Selected Manager display card */
          <div className="flex items-center justify-between rounded-md border border-input bg-muted/40 px-3 py-2.5">
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-xs text-foreground truncate">
                  {manager || "Assigned Manager"}
                </span>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium px-1.5 py-0.5 rounded">
                  Assigned
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                {email ? <span>{email}</span> : <span className="italic">No email</span>}
                {phone ? <span>• {phone}</span> : null}
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isSaving}
              onClick={handleRemoveManager}
              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full cursor-pointer shrink-0 ml-2"
              title="Remove manager"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          /* Interactive Search Box */
          <div className="relative" ref={searchContainerRef}>
            <div className="relative flex items-center">
              <Search className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                value={searchQuery}
                disabled={isSaving}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsOpen(true);
                }}
                onFocus={() => setIsOpen(true)}
                placeholder="Search user by name, email to assign as district manager..."
                className="pl-9 pr-9"
              />
              {loadingUsers && (
                <Loader2 className="absolute right-3 h-4 w-4 animate-spin text-muted-foreground pointer-events-none" />
              )}
            </div>

            {/* Dropdown list of matching users */}
            {isOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 max-h-60 overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-lg z-50 py-1">
                {searchResults.length === 0 ? (
                  <div className="py-4 text-center text-xs text-muted-foreground">
                    {loadingUsers ? "Searching users..." : "No users found"}
                  </div>
                ) : (
                  searchResults.map((user) => (
                    <div
                      key={user.id}
                      onClick={() => handleSelectUser(user)}
                      className="flex flex-col px-3 py-2 text-xs hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors border-b last:border-b-0 border-border/40"
                    >
                      <span className="font-semibold">{user.fullName}</span>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                        {user.email && <span>{user.email}</span>}
                        {user.phone && <span>• {user.phone}</span>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 5. Non-editable Manager Email */}
      <div className="space-y-1.5">
        <Label>
          Manager Email{" "}
          <span className="text-xs text-muted-foreground font-normal">(Auto-populated)</span>
        </Label>
        <Input
          type="email"
          value={email}
          readOnly
          tabIndex={-1}
          placeholder="Auto-populated from manager selection"
          className="bg-muted/50 text-muted-foreground cursor-not-allowed select-none"
        />
      </div>

      {/* 6. Non-editable Manager Phone */}
      <div className="space-y-1.5">
        <Label>
          Manager Phone{" "}
          <span className="text-xs text-muted-foreground font-normal">(Auto-populated)</span>
        </Label>
        <Input
          value={phone}
          readOnly
          tabIndex={-1}
          placeholder="Auto-populated from manager selection"
          className="bg-muted/50 text-muted-foreground cursor-not-allowed select-none"
        />
      </div>

      <Button
        className="w-full flex items-center justify-center gap-2 cursor-pointer"
        disabled={!isFormValid || isSaving}
        onClick={() => {
          const selectedMarketObj = formMarketOptions.find((m) => m.id.toString() === marketId);
          onSave({
            name: name.trim(),
            marketId: marketId && marketId !== "none" ? Number(marketId) : "",
            market: selectedMarketObj?.name,
            stateId: Number(stateId),
            managerId: managerId && Number(managerId) > 0 ? Number(managerId) : null,
            manager: manager.trim() || undefined,
            email: email.trim() || null,
            phone: phone.trim() || null,
          });
        }}
      >
        {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
        {initial ? "Update District" : "Save District"}
      </Button>
    </div>
  );
}
