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
import { Eye, Loader2, Search, X } from "lucide-react";
import { DistrictsApi, StatesApi } from "@/lib/api/client";
import { usersService } from "@/services";

interface District {
  id: number;
  name: string;
  state: {
    id: number;
    name: string;
  };
  market?: {
    id: number;
    name: string;
  };
  assignedUsers?: Array<{
    id: number;
    name: string;
    email?: string;
    phone?: string;
  }>;
  manager?: string;
  email?: string;
  phone?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface State {
  id: number;
  name: string;
  symbol: string;
}

const STATIC_MARKETS = [
  { id: "all", name: "All Markets" },
  { id: "market-1", name: "Market 1" },
  { id: "market-2", name: "Market 2" },
  { id: "market-3", name: "Market 3" },
];

const getDistrictMarket = (d: District) => {
  if (d.market?.name) return d.market.name;
  if (typeof (d as any).market === "string" && (d as any).market) return (d as any).market;
  const staticNames = ["Market 1", "Market 2", "Market 3"];
  return staticNames[d.id % staticNames.length];
};

export default function DistrictsPage() {
  const navigate = useNavigate();
  const [districts, setDistricts] = useState<District[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [selectedStateFilter, setSelectedStateFilter] = useState<string>("all");
  const [selectedMarketFilter, setSelectedMarketFilter] = useState<string>("all");

  // Search text states
  const [mainFilterSearch, setMainFilterSearch] = useState("");
  const [marketFilterSearch, setMarketFilterSearch] = useState("");

  // Refs for auto-focusing input on open
  const mainSearchInputRef = useRef<HTMLInputElement>(null);
  const marketSearchInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // States for tracking server side pagination parameters
  const [page, setPage] = useState<number>(0);
  const [size, setSize] = useState<number>(25);
  const [totalRecords, setTotalRecords] = useState<number>(0);

  // Synchronous atomic locker to prevent simultaneous duplicate fetches
  const lastFetchedKey = useRef<string>("");
  const isFetchingRef = useRef<boolean>(false);
  const statesFetchedRef = useRef<boolean>(false);

  // Dynamic fetch method synced directly with pagination and dropdown states filter
  const fetchDistricts = async (targetPage: number, targetSize: number, targetState: string) => {
    // Included state value inside the atomic key block to prevent race conditions on fast switching
    const currentRequestKey = `${targetPage}-${targetSize}-${targetState}`;

    if (lastFetchedKey.current === currentRequestKey || isFetchingRef.current) {
      return;
    }

    try {
      setLoading(true);
      isFetchingRef.current = true;
      lastFetchedKey.current = currentRequestKey;

      // 1. Fetch States static filter options dropdown list only once
      if (!statesFetchedRef.current) {
        const statesRes = await StatesApi.getAll();
        if (statesRes.success) {
          setStates(statesRes.data);
          statesFetchedRef.current = true;
        } else {
          toast.error(statesRes.message || "Failed to load states filter options");
        }
      }

      // 2. Fetch data directly from backend with flexible route queries
      const apiClient = DistrictsApi.getAll as any;
      const res = await apiClient({
        page: targetPage,
        size: targetSize,
        state: targetState !== "all" ? targetState : undefined,
      });

      if (res.success) {
        // EDGE CASE FIX: If current page has no data but database has records, fallback to previous page
        if (
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

        setDistricts(res.data);

        if (res.pagination && typeof res.pagination.totalRecords === "number") {
          setTotalRecords(res.pagination.totalRecords);
        } else {
          setTotalRecords(res.data.length);
        }
      } else {
        toast.error(res.message || "Failed to load districts");
        lastFetchedKey.current = "";
      }
    } catch (err: any) {
      toast.error(err?.message || "Something went wrong while fetching data");
      lastFetchedKey.current = "";
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  };

  // UPDATED: Added selectedStateFilter into dependencies to handle reactive network triggering
  useEffect(() => {
    fetchDistricts(page, size, selectedStateFilter);
  }, [page, size, selectedStateFilter]);

  // Handler to safely reset page parameters when user changes the dropdown option
  const handleStateFilterChange = (newState: string) => {
    lastFetchedKey.current = ""; // Reset atom key to allow seamless intermediate execution
    setPage(0); // Send user back to first page chunk
    setSelectedStateFilter(newState);
  };

  // Delete Call
  const handleDelete = async (d: District) => {
    try {
      setActionLoading(true);
      const res = await DistrictsApi.delete(d.id);
      if (res.success) {
        toast.success(res.message || "District deleted successfully");
        lastFetchedKey.current = "";
        fetchDistricts(page, size, selectedStateFilter);
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

  // Save/Update Call
  const handleSave = async (
    initial: District | null,
    formData: DistrictFormData,
    close: () => void,
  ) => {
    try {
      setActionLoading(true);
      const payload: any = {
        name: formData.name,
        stateId: Number(formData.stateId),
        marketId:
          typeof formData.marketId === "number"
            ? formData.marketId
            : Number(formData.marketId) || 1,
        managerId:
          formData.managerId && Number(formData.managerId) > 0 ? Number(formData.managerId) : null,
        manager: formData.manager?.trim() || undefined,
        email: formData.email?.trim() || null,
        phone: formData.phone?.trim() || null,
      };

      if (initial) {
        payload.id = initial.id;
        const res = await DistrictsApi.update(payload);
        if (res.success) {
          toast.success(res.message || "District updated successfully");
          lastFetchedKey.current = "";
          fetchDistricts(page, size, selectedStateFilter);
          close();
        } else {
          toast.error(res.message || "Update failed");
        }
      } else {
        const res = await DistrictsApi.add(payload);
        if (res.success) {
          toast.success(res.message || "District added successfully");
          lastFetchedKey.current = "";
          fetchDistricts(page, size, selectedStateFilter);
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

  const getStateName = (id: number) => states.find((s) => s.id === id)?.name ?? "—";

  const filteredMainStatesOptions = useMemo(() => {
    return states.filter((s) => s.name.toLowerCase().includes(mainFilterSearch.toLowerCase()));
  }, [states, mainFilterSearch]);

  const filteredMarketOptions = useMemo(() => {
    return STATIC_MARKETS.filter((m) =>
      m.name.toLowerCase().includes(marketFilterSearch.toLowerCase()),
    );
  }, [marketFilterSearch]);

  const displayedDistricts = useMemo(() => {
    if (selectedMarketFilter === "all") return districts;
    const matchMarket = STATIC_MARKETS.find((m) => m.id === selectedMarketFilter);
    if (!matchMarket) return districts;
    return districts.filter((d) => getDistrictMarket(d) === matchMarket.name);
  }, [districts, selectedMarketFilter]);

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
            rows={displayedDistricts}
            rowKey={(d) => d.id.toString()}
            isSaving={actionLoading}
            isLoading={loading}

            rowCount={selectedMarketFilter === "all" ? totalRecords : displayedDistricts.length}
            page={page}
            pageSize={size}
            onPageChange={(newPage) => setPage(newPage)}
            onPageSizeChange={(newSize) => setSize(newSize)}

            extraToolbar={
              <div className="flex flex-wrap items-center gap-3">
                {/* State Filter */}
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

                {/* Market Filter (Static options, no API calls) */}
                <div className="relative flex flex-col pt-2.5">
                  <span className="absolute -top-1 left-2 bg-background px-1 text-[11px] font-semibold text-muted-foreground z-10">
                    Market
                  </span>

                  <Select
                    value={selectedMarketFilter}
                    onValueChange={(newMarket) => {
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
                    <SelectTrigger className="w-[180px] h-9 focus:ring-0 border-muted-foreground/40 bg-white dark:bg-zinc-950">
                      <SelectValue placeholder="Filter by Market" />
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

                      {filteredMarketOptions.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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
  const [marketId, setMarketId] = useState<string>(
    initial?.market?.id
      ? initial.market.id.toString()
      : initial?.id
        ? initial.id % 3 === 1
          ? "1"
          : initial.id % 3 === 2
            ? "2"
            : "3"
        : "1",
  );
  const [stateId, setStateId] = useState<string>(
    initial?.state?.id ? initial.state.id.toString() : "",
  );

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

  const formMarketOptions = useMemo(() => {
    const opts = [
      { id: "1", name: "Market 1" },
      { id: "2", name: "Market 2" },
      { id: "3", name: "Market 3" },
    ];
    return opts.filter((m) => m.name.toLowerCase().includes(marketSearch.toLowerCase()));
  }, [marketSearch]);

  // All fields required check: name, market, state, manager, email, phone
  const isFormValid =
    Boolean(name.trim()) &&
    Boolean(marketId) &&
    Boolean(stateId) &&
    Boolean(managerId || manager.trim()) &&
    Boolean(email.trim()) &&
    Boolean(phone.trim());

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
          onValueChange={setStateId}
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
          disabled={isSaving}
          onValueChange={setMarketId}
          onOpenChange={(open) => {
            if (!open) setMarketSearch("");
            else setTimeout(() => marketSearchRef.current?.focus(), 100);
          }}
        >
          <SelectTrigger className="w-full bg-white dark:bg-zinc-950">
            <SelectValue placeholder="Select associated market" />
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
            {formMarketOptions.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 4. District Manager (Required - User Search API) */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label>
            District Manager <span className="text-destructive">*</span>
          </Label>
          {managerId ? (
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

        {managerId ? (
          /* Selected Manager display card */
          <div className="flex items-center justify-between rounded-md border border-input bg-muted/40 px-3 py-2.5">
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-xs text-foreground truncate">{manager}</span>
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

      {/* 5. Manager Email (Required - Auto-populated, Non-editable) */}
      <div className="space-y-1.5">
        <Label>
          Manager Email <span className="text-destructive">*</span>{" "}
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

      {/* 6. Manager Phone (Required - Auto-populated, Non-editable) */}
      <div className="space-y-1.5">
        <Label>
          Manager Phone <span className="text-destructive">*</span>{" "}
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
          const selectedMarketObj = formMarketOptions.find((m) => m.id === marketId);
          onSave({
            name: name.trim(),
            marketId: Number(marketId),
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
