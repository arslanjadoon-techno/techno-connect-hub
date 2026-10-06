import { useState, useEffect, useRef, useMemo } from "react";
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
import { Loader2, Search, XCircle } from "lucide-react";
import { storesService, statesService, marketsService, districtsService } from "@/services";

interface Store {
  id: number;
  name: string;
  number: string | null;
  address: string;
  email: string;
  phone: string;
  doorCode: string;
  state: {
    id: number;
    name: string;
  } | null;
  market: {
    id: number;
    name: string;
  } | null;
  district: {
    id: number;
    name: string;
  } | null;
  createdAt?: string;
  updatedAt?: string;
  techId?: string | null;
  isOperating?: boolean | null;
}

interface State {
  id: number;
  name: string;
  symbol: string;
}

interface Market {
  id: number;
  name: string;
  state?: {
    id: number;
    name: string;
  } | null;
  district?: {
    id: number;
    name: string;
  } | null;
}

interface District {
  id: number;
  name: string;
  state?: {
    id: number;
    name: string;
  } | null;
}

export default function StoresPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [states, setStates] = useState<State[]>([]);

  // Cascading lists for toolbar selection: State -> Market -> District
  const [marketsForFilter, setMarketsForFilter] = useState<Market[]>([]);
  const [districtsForFilter, setDistrictsForFilter] = useState<District[]>([]);

  // Toolbar state selection tracking
  const [selectedStateFilter, setSelectedStateFilter] = useState<string>("all");
  const [selectedMarketFilter, setSelectedMarketFilter] = useState<string>("all");
  const [selectedDistrictFilter, setSelectedDistrictFilter] = useState<string>("all");

  // Search filter query buffers
  const [mainStateSearch, setMainStateSearch] = useState("");
  const [mainMarketSearch, setMainMarketSearch] = useState("");
  const [mainDistrictSearch, setMainDistrictSearch] = useState("");

  const mainStateSearchRef = useRef<HTMLInputElement>(null);
  const mainMarketSearchRef = useRef<HTMLInputElement>(null);
  const mainDistrictSearchRef = useRef<HTMLInputElement>(null);

  // Search state & debounce
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isSearchingBackend, setIsSearchingBackend] = useState(false);

  // Loaders flags
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [filterMarketsLoading, setFilterMarketsLoading] = useState(false);
  const [filterDistrictsLoading, setFilterDistrictsLoading] = useState(false);

  // Pagination states
  const [page, setPage] = useState<number>(0);
  const [size, setSize] = useState<number>(15);
  const [totalRecords, setTotalRecords] = useState<number>(0);

  // Synchronous atomic state blockers
  const lastFetchedKey = useRef<string>("");
  const isFetchingRef = useRef<boolean>(false);
  const initialLookupsFetchedRef = useRef<boolean>(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Helper to extract active filter names/values for the API call
  const getFilterParams = (targetState: string, targetMarket: string, targetDistrict: string) => {
    let stateVal: string | undefined = undefined;
    if (targetState && targetState !== "all") {
      const match = states.find((s) => s.id.toString() === targetState || s.name === targetState);
      stateVal = match ? match.name : targetState;
    }

    let marketVal: string | undefined = undefined;
    if (targetMarket && targetMarket !== "all") {
      const match = marketsForFilter.find(
        (m) => m.id.toString() === targetMarket || m.name === targetMarket,
      );
      marketVal = match ? match.name : targetMarket;
    }

    let districtVal: string | undefined = undefined;
    if (targetDistrict && targetDistrict !== "all") {
      const match = districtsForFilter.find(
        (d) => d.id.toString() === targetDistrict || d.name === targetDistrict,
      );
      districtVal = match ? match.name : targetDistrict;
    }

    return { stateVal, marketVal, districtVal };
  };

  // Dynamic master fetch handler supporting backend search without pagination and paginated browse
  const fetchStores = async (
    targetPage: number,
    targetSize: number,
    targetState: string,
    targetMarket: string,
    targetDistrict: string,
    search?: string,
  ) => {
    const trimmedSearch = (search ?? "").trim();
    const currentRequestKey = trimmedSearch
      ? `search-${trimmedSearch}-${targetState}-${targetMarket}-${targetDistrict}`
      : `page-${targetPage}-${targetSize}-${targetState}-${targetMarket}-${targetDistrict}`;

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

      // 1. Initial lookups for states
      if (!initialLookupsFetchedRef.current) {
        const statesRes = await statesService.getAll();
        if (statesRes.success) {
          setStates(statesRes.data);
          initialLookupsFetchedRef.current = true;
        }
      }

      const { stateVal, marketVal, districtVal } = getFilterParams(
        targetState,
        targetMarket,
        targetDistrict,
      );

      // Call API without pagination when searching
      const res = trimmedSearch
        ? await storesService.getAll({
            search: trimmedSearch,
            state: stateVal,
            market: marketVal,
            district: districtVal,
          })
        : await storesService.getAll({
            page: targetPage,
            size: targetSize,
            state: stateVal,
            market: marketVal,
            district: districtVal,
          });

      if (res.success) {
        // Fallback guard if paginated items on current page turn empty
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

        setStores(res.data);
        if (trimmedSearch) {
          setTotalRecords(res.data.length);
        } else if (res.pagination && typeof res.pagination.totalRecords === "number") {
          setTotalRecords(res.pagination.totalRecords);
        } else {
          setTotalRecords(res.data.length);
        }
      } else {
        toast.error(res.message || "Failed to load stores");
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

  // Master fetch effect watcher
  useEffect(() => {
    fetchStores(
      page,
      size,
      selectedStateFilter,
      selectedMarketFilter,
      selectedDistrictFilter,
      debouncedSearch,
    );
  }, [
    page,
    size,
    selectedStateFilter,
    selectedMarketFilter,
    selectedDistrictFilter,
    debouncedSearch,
  ]);

  // CASCADING HIERARCHY LAYER 1: State selection triggers Market load
  useEffect(() => {
    if (!selectedStateFilter || selectedStateFilter === "all") {
      setMarketsForFilter([]);
      setDistrictsForFilter([]);
      return;
    }

    const loadMarketsForToolbarFilter = async () => {
      try {
        setFilterMarketsLoading(true);
        const match = states.find(
          (s) => s.id.toString() === selectedStateFilter || s.name === selectedStateFilter,
        );
        const stateParam = match ? match.name : selectedStateFilter;
        const res = await marketsService.getAll({ state: stateParam });
        if (res.success) {
          setMarketsForFilter(res.data);
        }
      } catch (err) {
        console.error("Failed to load cascading market options", err);
      } finally {
        setFilterMarketsLoading(false);
      }
    };

    loadMarketsForToolbarFilter();
  }, [selectedStateFilter, states]);

  // CASCADING HIERARCHY LAYER 2: Market selection triggers District load
  useEffect(() => {
    if (!selectedMarketFilter || selectedMarketFilter === "all") {
      setDistrictsForFilter([]);
      return;
    }

    const loadDistrictsForToolbarFilter = async () => {
      try {
        setFilterDistrictsLoading(true);
        const match = marketsForFilter.find(
          (m) => m.id.toString() === selectedMarketFilter || m.name === selectedMarketFilter,
        );
        const marketParam = match ? match.name : selectedMarketFilter;
        const res = await districtsService.getAll({ market: marketParam });
        if (res.success) {
          setDistrictsForFilter(res.data);
        }
      } catch (err) {
        console.error("Failed to load cascading district options", err);
      } finally {
        setFilterDistrictsLoading(false);
      }
    };

    loadDistrictsForToolbarFilter();
  }, [selectedMarketFilter, marketsForFilter]);

  const handleStateFilterChange = (newState: string) => {
    lastFetchedKey.current = "";
    setPage(0);
    setSelectedMarketFilter("all");
    setSelectedDistrictFilter("all");
    setMarketsForFilter([]);
    setDistrictsForFilter([]);
    setSelectedStateFilter(newState);
  };

  const handleMarketFilterChange = (newMarket: string) => {
    lastFetchedKey.current = "";
    setPage(0);
    setSelectedDistrictFilter("all");
    setDistrictsForFilter([]);
    setSelectedMarketFilter(newMarket);
  };

  const handleDistrictFilterChange = (newDistrict: string) => {
    lastFetchedKey.current = "";
    setPage(0);
    setSelectedDistrictFilter(newDistrict);
  };

  const handleResetFilters = () => {
    if (
      selectedStateFilter === "all" &&
      selectedMarketFilter === "all" &&
      selectedDistrictFilter === "all"
    )
      return;
    lastFetchedKey.current = "";
    setPage(0);
    setSelectedStateFilter("all");
    setSelectedMarketFilter("all");
    setSelectedDistrictFilter("all");
    setMarketsForFilter([]);
    setDistrictsForFilter([]);
    toast.success("Filters cleared successfully");
  };

  const handleDelete = async (s: Store) => {
    try {
      setActionLoading(true);
      const res = await storesService.delete(s.id);
      if (res.success) {
        toast.success(res.message || "Store deleted successfully");
        lastFetchedKey.current = "";
        fetchStores(
          page,
          size,
          selectedStateFilter,
          selectedMarketFilter,
          selectedDistrictFilter,
          debouncedSearch,
        );
      } else {
        toast.error(res.message || "Could not delete store");
      }
    } catch (err: any) {
      toast.error(err?.message || "Delete failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSave = async (
    initial: Store | null,
    formData: {
      name: string;
      number: string;
      address: string;
      email: string;
      phone: string;
      doorCode: string;
      stateId: number;
      marketId: number;
      districtId: number;
    },
    close: () => void,
  ) => {
    try {
      setActionLoading(true);
      if (initial) {
        const res = await storesService.update({
          id: initial.id,
          name: formData.name,
          number: formData.number,
          address: formData.address,
          email: formData.email,
          phone: formData.phone,
          doorCode: formData.doorCode,
          stateId: formData.stateId,
          marketId: formData.marketId,
          districtId: formData.districtId,
        });
        if (res.success) {
          toast.success(res.message || "Store updated successfully");
          lastFetchedKey.current = "";
          fetchStores(
            page,
            size,
            selectedStateFilter,
            selectedMarketFilter,
            selectedDistrictFilter,
            debouncedSearch,
          );
          close();
        } else {
          toast.error(res.message || "Update failed");
        }
      } else {
        const res = await storesService.add(formData);
        if (res.success) {
          toast.success(res.message || "Store added successfully");
          lastFetchedKey.current = "";
          fetchStores(
            page,
            size,
            selectedStateFilter,
            selectedMarketFilter,
            selectedDistrictFilter,
            debouncedSearch,
          );
          close();
        } else {
          toast.error(res.message || "Failed to create store");
        }
      }
    } catch (err: any) {
      toast.error(err?.message || "Operation failed");
    } finally {
      setActionLoading(false);
    }
  };

  // Inline dropdown query filter matching optimization hooks
  const filteredMainStatesOptions = useMemo(() => {
    return states.filter((s) => s.name.toLowerCase().includes(mainStateSearch.toLowerCase()));
  }, [states, mainStateSearch]);

  const filteredMainMarketsOptions = useMemo(() => {
    return marketsForFilter.filter((m) =>
      m.name.toLowerCase().includes(mainMarketSearch.toLowerCase()),
    );
  }, [marketsForFilter, mainMarketSearch]);

  const filteredMainDistrictsOptions = useMemo(() => {
    return districtsForFilter.filter((d) =>
      d.name.toLowerCase().includes(mainDistrictSearch.toLowerCase()),
    );
  }, [districtsForFilter, mainDistrictSearch]);

  if (loading && stores.length === 0 && !debouncedSearch) {
    return (
      <div className="flex h-[50vh] w-full flex-col items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-medium">Loading Stores Management Portal...</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="w-full border-0 shadow-none bg-transparent [&_input]:bg-white dark:[&_input]:bg-zinc-950 [&_button.w-\[180px\]]:bg-white dark:[&_button.w-\[180px\]]:bg-zinc-950 [&_thead]:bg-zinc-200 dark:[&_thead]:bg-zinc-800 [&_thead]:border-b-2 [&_thead]:border-border [&_th]:font-bold [&_th]:text-zinc-900 dark:[&_th]:text-zinc-100 [&_th]:h-12 [&_tbody_tr]:bg-background [&_tbody_tr]:even:bg-zinc-50/50 dark:[&_tbody_tr]:even:bg-zinc-900/30 [&_tbody_tr]:hover:bg-muted/40 [&_th:last-child]:text-right [&_th:last-child]:pr-10 [&_td:last-child]:text-right [&_td[colspan]]:text-center [&_td[colspan]]:font-medium">
        <div className="[&_.flex-col]:flex-row [&_.flex-col]:items-center [&_.flex-col]:justify-between [&_.max-w-sm]:order-last [&_.max-w-sm]:ml-auto">
          <CrudPage<Store>
            title="Stores"
            subtitle="Manage operational storefront settings, parameters, and localized mappings."
            rows={stores}
            rowKey={(s) => s.id.toString()}
            isSaving={actionLoading}
            isLoading={loading && !debouncedSearch}
            rowCount={totalRecords}
            page={page}
            pageSize={size}
            onPageChange={(newPage) => setPage(newPage)}
            onPageSizeChange={(newSize) => setSize(newSize)}
            serverSearch={true}
            searchValue={searchQuery}
            onSearchChange={(val) => {
              lastFetchedKey.current = "";
              setSearchQuery(val);
              if (page !== 0) setPage(0);
            }}
            isSearching={isSearchingBackend || searchQuery !== debouncedSearch}
            searchPlaceholder="Search stores..."
            extraToolbar={
              <div className="flex items-end gap-3 pb-0.5">
                {/* 1. STATE TOOLBAR FILTER */}
                <div className="relative flex flex-col pt-2.5">
                  <span className="absolute -top-1 left-2 bg-background px-1 text-[11px] font-semibold text-muted-foreground z-10">
                    State
                  </span>
                  <Select
                    value={selectedStateFilter}
                    onValueChange={handleStateFilterChange}
                    onOpenChange={(open) => {
                      if (!open) setMainStateSearch("");
                      else setTimeout(() => mainStateSearchRef.current?.focus(), 100);
                    }}
                  >
                    <SelectTrigger className="w-[180px] h-9 focus:ring-0 border-muted-foreground/40">
                      <SelectValue placeholder="Filter by State" />
                    </SelectTrigger>
                    <SelectContent
                      onKeyDown={(e) => e.stopPropagation()}
                      onKeyUp={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center px-2 py-1.5 border-b sticky top-0 bg-popover z-10">
                        <Search className="h-3.5 w-3.5 mr-2 text-muted-foreground shrink-0" />
                        <input
                          ref={mainStateSearchRef}
                          placeholder="Search states..."
                          value={mainStateSearch}
                          onChange={(e) => {
                            setMainStateSearch(e.target.value);
                            setTimeout(() => mainStateSearchRef.current?.focus(), 0);
                          }}
                          className="w-full text-xs bg-transparent outline-none placeholder:text-muted-foreground"
                        />
                      </div>
                      <SelectItem value="all">All States</SelectItem>
                      {filteredMainStatesOptions.map((s) => (
                        <SelectItem key={s.id} value={s.id.toString()}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 2. CASCADING DEPENDENT MARKET TOOLBAR FILTER (State -> Market) */}
                <div className="relative flex flex-col pt-2.5">
                  <span className="absolute -top-1 left-2 bg-background px-1 text-[11px] font-semibold text-muted-foreground z-10">
                    Market
                  </span>
                  <Select
                    value={selectedMarketFilter}
                    disabled={selectedStateFilter === "all" || filterMarketsLoading}
                    onValueChange={handleMarketFilterChange}
                    onOpenChange={(open) => {
                      if (!open) setMainMarketSearch("");
                      else setTimeout(() => mainMarketSearchRef.current?.focus(), 100);
                    }}
                  >
                    <SelectTrigger className="w-[180px] h-9 focus:ring-0 border-muted-foreground/40 disabled:bg-zinc-100 dark:disabled:bg-zinc-900 disabled:opacity-60 disabled:cursor-not-allowed">
                      {filterMarketsLoading ? (
                        <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                          <Loader2 className="h-3 w-3 animate-spin" /> Loading...
                        </div>
                      ) : (
                        <SelectValue placeholder="All Markets" />
                      )}
                    </SelectTrigger>
                    <SelectContent
                      onKeyDown={(e) => e.stopPropagation()}
                      onKeyUp={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center px-2 py-1.5 border-b sticky top-0 bg-popover z-10">
                        <Search className="h-3.5 w-3.5 mr-2 text-muted-foreground shrink-0" />
                        <input
                          ref={mainMarketSearchRef}
                          placeholder="Search markets..."
                          value={mainMarketSearch}
                          onChange={(e) => {
                            setMainMarketSearch(e.target.value);
                            setTimeout(() => mainMarketSearchRef.current?.focus(), 0);
                          }}
                          className="w-full text-xs bg-transparent outline-none placeholder:text-muted-foreground"
                        />
                      </div>
                      <SelectItem value="all">All Markets</SelectItem>
                      {filteredMainMarketsOptions.map((m) => (
                        <SelectItem key={m.id} value={m.id.toString()}>
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 3. CASCADING DEPENDENT DISTRICT TOOLBAR FILTER (Market -> District) */}
                <div className="relative flex flex-col pt-2.5">
                  <span className="absolute -top-1 left-2 bg-background px-1 text-[11px] font-semibold text-muted-foreground z-10">
                    District
                  </span>
                  <Select
                    value={selectedDistrictFilter}
                    disabled={selectedMarketFilter === "all" || filterDistrictsLoading}
                    onValueChange={handleDistrictFilterChange}
                    onOpenChange={(open) => {
                      if (!open) setMainDistrictSearch("");
                      else setTimeout(() => mainDistrictSearchRef.current?.focus(), 100);
                    }}
                  >
                    <SelectTrigger className="w-[180px] h-9 focus:ring-0 border-muted-foreground/40 disabled:bg-zinc-100 dark:disabled:bg-zinc-900 disabled:opacity-60 disabled:cursor-not-allowed">
                      {filterDistrictsLoading ? (
                        <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                          <Loader2 className="h-3 w-3 animate-spin" /> Loading...
                        </div>
                      ) : (
                        <SelectValue placeholder="All Districts" />
                      )}
                    </SelectTrigger>
                    <SelectContent
                      onKeyDown={(e) => e.stopPropagation()}
                      onKeyUp={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center px-2 py-1.5 border-b sticky top-0 bg-popover z-10">
                        <Search className="h-3.5 w-3.5 mr-2 text-muted-foreground shrink-0" />
                        <input
                          ref={mainDistrictSearchRef}
                          placeholder="Search districts..."
                          value={mainDistrictSearch}
                          onChange={(e) => {
                            setMainDistrictSearch(e.target.value);
                            setTimeout(() => mainDistrictSearchRef.current?.focus(), 0);
                          }}
                          className="w-full text-xs bg-transparent outline-none placeholder:text-muted-foreground"
                        />
                      </div>
                      <SelectItem value="all">All Districts</SelectItem>
                      {filteredMainDistrictsOptions.map((d) => (
                        <SelectItem key={d.id} value={d.id.toString()}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 4. RESET ACTION TRIGGER BUTTON */}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={
                    selectedStateFilter === "all" &&
                    selectedMarketFilter === "all" &&
                    selectedDistrictFilter === "all"
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
                key: "number",
                header: "Number",
                accessor: (s) => (
                  <div className="py-2 text-left font-mono font-medium text-xs">
                    {s.number ?? "—"}
                  </div>
                ),
                searchValue: (s) => s.number ?? "",
              },
              {
                key: "name",
                header: "Name",
                accessor: (s) => <div className="py-2 text-left font-medium">{s.name}</div>,
                searchValue: (s) => s.name,
              },
              {
                key: "address",
                header: "Address",
                accessor: (s) => (
                  <div
                    className="py-2 text-left text-xs text-muted-foreground max-w-[200px] truncate"
                    title={s.address}
                  >
                    {s.address}
                  </div>
                ),
                searchValue: (s) => s.address,
              },
              {
                key: "email",
                header: "Email",
                accessor: (s) => <div className="py-2 text-left text-xs">{s.email}</div>,
                searchValue: (s) => s.email,
              },
              {
                key: "phone",
                header: "Phone",
                accessor: (s) => (
                  <div className="py-2 text-left text-xs text-zinc-600 dark:text-zinc-400">
                    {s.phone}
                  </div>
                ),
                searchValue: (s) => s.phone,
              },
              {
                key: "state",
                header: "State",
                accessor: (s) => (
                  <div className="py-2 text-left text-muted-foreground">{s.state?.name ?? "—"}</div>
                ),
                searchValue: (s) => s.state?.name ?? "",
              },
              {
                key: "market",
                header: "Market",
                accessor: (s) => (
                  <div className="py-2 text-left text-zinc-700 dark:text-zinc-300 font-medium">
                    {s.market?.name ?? "—"}
                  </div>
                ),
                searchValue: (s) => s.market?.name ?? "",
              },
              {
                key: "district",
                header: "District",
                accessor: (s) => (
                  <div className="py-2 text-left text-zinc-700 dark:text-zinc-300 font-medium">
                    {s.district?.name ?? "—"}
                  </div>
                ),
                searchValue: (s) => s.district?.name ?? "",
              },
            ]}
            onDelete={handleDelete}
            renderForm={(initial, close) => (
              <StoreForm
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

// ==========================================
// FORM COMPONENT WITH STATE -> MARKET -> DISTRICT
// ==========================================

interface StoreFormProps {
  initial: Store | null;
  states: State[];
  isSaving: boolean;
  onSave: (data: {
    name: string;
    number: string;
    address: string;
    email: string;
    phone: string;
    doorCode: string;
    stateId: number;
    marketId: number;
    districtId: number;
  }) => void;
}

function StoreForm({ initial, states, isSaving, onSave }: StoreFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [number, setNumber] = useState(initial?.number ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [doorCode, setDoorCode] = useState(initial?.doorCode ?? "");

  const [stateId, setStateId] = useState<string>(
    initial?.state?.id ? initial.state.id.toString() : "",
  );
  const [marketId, setMarketId] = useState<string>(
    initial?.market?.id ? initial.market.id.toString() : "",
  );
  const [districtId, setDistrictId] = useState<string>(
    initial?.district?.id ? initial.district.id.toString() : "",
  );

  // Form dependent state spaces
  const [markets, setMarkets] = useState<Market[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);

  const [marketsLoading, setMarketsLoading] = useState(false);
  const [districtsLoading, setDistrictsLoading] = useState(false);

  const [stateSearch, setStateSearch] = useState("");
  const [marketSearch, setMarketSearch] = useState("");
  const [districtSearch, setDistrictSearch] = useState("");

  const stateSearchRef = useRef<HTMLInputElement>(null);
  const marketSearchRef = useRef<HTMLInputElement>(null);
  const districtSearchRef = useRef<HTMLInputElement>(null);

  // Form Level Cascading Trigger 1: State sets up Valid Market Listings
  useEffect(() => {
    if (!stateId) {
      setMarkets([]);
      setDistricts([]);
      return;
    }

    const loadStateSpecificMarkets = async () => {
      try {
        setMarketsLoading(true);
        const match = states.find((s) => s.id.toString() === stateId || s.name === stateId);
        const stateParam = match ? match.name : stateId;
        const res = await marketsService.getAll({ state: stateParam });
        if (res.success) {
          setMarkets(res.data);
          if (initial && initial.state?.id?.toString() === stateId) {
            setMarketId(initial.market?.id?.toString() ?? "");
          } else {
            setMarketId("");
            setDistrictId("");
            setDistricts([]);
          }
        }
      } catch (err) {
        console.error("Failed to load markets for form", err);
      } finally {
        setMarketsLoading(false);
      }
    };

    loadStateSpecificMarkets();
  }, [stateId, initial, states]);

  // Form Level Cascading Trigger 2: Market sets up Valid District Listings
  useEffect(() => {
    if (!marketId) {
      setDistricts([]);
      return;
    }

    const loadMarketSpecificDistricts = async () => {
      try {
        setDistrictsLoading(true);
        const match = markets.find((m) => m.id.toString() === marketId || m.name === marketId);
        const marketParam = match ? match.name : marketId;
        const res = await districtsService.getAll({ market: marketParam });
        if (res.success) {
          setDistricts(res.data);
          if (initial && initial.market?.id?.toString() === marketId) {
            setDistrictId(initial.district?.id?.toString() ?? "");
          } else {
            setDistrictId("");
          }
        }
      } catch (err) {
        console.error("Failed to load districts for form", err);
      } finally {
        setDistrictsLoading(false);
      }
    };

    loadMarketSpecificDistricts();
  }, [marketId, initial, markets]);

  const filteredStates = useMemo(() => {
    return states.filter((s) => s.name.toLowerCase().includes(stateSearch.toLowerCase()));
  }, [states, stateSearch]);

  const filteredMarkets = useMemo(() => {
    return markets.filter((m) => m.name.toLowerCase().includes(marketSearch.toLowerCase()));
  }, [markets, marketSearch]);

  const filteredDistricts = useMemo(() => {
    return districts.filter((d) => d.name.toLowerCase().includes(districtSearch.toLowerCase()));
  }, [districts, districtSearch]);

  return (
    <div className="space-y-4">
      {/* Row 1: Name & Number */}
      <div className="grid grid-cols-1 gap-3">
        <div className="space-y-1.5">
          <Label>Store Name</Label>
          <Input
            value={name}
            disabled={isSaving}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Westside Retail Hub"
          />
        </div>
      </div>

      {/* Row 2: Address & Door Code */}
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2 space-y-1.5">
          <Label>Address</Label>
          <Input
            value={address}
            disabled={isSaving}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Complete street address details"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Door Code</Label>
          <Input
            value={doorCode}
            disabled={isSaving}
            onChange={(e) => setDoorCode(e.target.value)}
            placeholder="123456"
          />
        </div>
      </div>

      {/* Row 3: Email & Phone */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Email Contact</Label>
          <Input
            type="email"
            value={email}
            disabled={isSaving}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="store@email.com"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Phone Number</Label>
          <Input
            value={phone}
            disabled={isSaving}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1 23 456 865"
          />
        </div>
      </div>

      {/* Cascading Drops Hierarchy Matrix: State -> Market -> District */}
      <div className="grid grid-cols-3 gap-3">
        {/* Drop 1: State Selection */}
        <div className="space-y-1.5">
          <Label>State</Label>
          <Select
            value={stateId}
            disabled={isSaving || !!initial}
            onValueChange={setStateId}
            onOpenChange={(open) => {
              if (!open) setStateSearch("");
              else setTimeout(() => stateSearchRef.current?.focus(), 100);
            }}
          >
            <SelectTrigger className="w-full bg-white dark:bg-zinc-950">
              <SelectValue placeholder="Select state" />
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

        {/* Drop 2: Dependent Market Selection (State -> Market) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label>Market</Label>
            {marketsLoading && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
          </div>
          <Select
            value={marketId}
            disabled={isSaving || !stateId || marketsLoading || !!initial}
            onValueChange={setMarketId}
            onOpenChange={(open) => {
              if (!open) setMarketSearch("");
              else setTimeout(() => marketSearchRef.current?.focus(), 100);
            }}
          >
            <SelectTrigger className="w-full bg-white dark:bg-zinc-950">
              <SelectValue placeholder={!stateId ? "Choose state" : "Select market"} />
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
              {filteredMarkets.length === 0 ? (
                <p className="text-[11px] text-center text-muted-foreground p-2">
                  {marketsLoading ? "Fetching records..." : "No markets found"}
                </p>
              ) : (
                filteredMarkets.map((m) => (
                  <SelectItem key={m.id} value={m.id.toString()}>
                    {m.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Drop 3: Dependent District Selection (Market -> District) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label>District</Label>
            {districtsLoading && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
          </div>
          <Select
            value={districtId}
            disabled={isSaving || !marketId || districtsLoading || !!initial}
            onValueChange={setDistrictId}
            onOpenChange={(open) => {
              if (!open) setDistrictSearch("");
              else setTimeout(() => districtSearchRef.current?.focus(), 100);
            }}
          >
            <SelectTrigger className="w-full bg-white dark:bg-zinc-950">
              <SelectValue placeholder={!marketId ? "Choose market" : "Select district"} />
            </SelectTrigger>
            <SelectContent
              onKeyDown={(e) => e.stopPropagation()}
              onKeyUp={(e) => e.stopPropagation()}
            >
              <div className="flex items-center px-2 py-1.5 border-b sticky top-0 bg-popover z-10">
                <Search className="h-3.5 w-3.5 mr-2 text-muted-foreground shrink-0" />
                <input
                  ref={districtSearchRef}
                  placeholder="Search districts..."
                  value={districtSearch}
                  onChange={(e) => {
                    setDistrictSearch(e.target.value);
                    setTimeout(() => districtSearchRef.current?.focus(), 0);
                  }}
                  className="w-full text-xs bg-transparent outline-none placeholder:text-muted-foreground"
                />
              </div>
              {filteredDistricts.length === 0 ? (
                <p className="text-[11px] text-center text-muted-foreground p-2">
                  {districtsLoading ? "Fetching records..." : "No districts found"}
                </p>
              ) : (
                filteredDistricts.map((d) => (
                  <SelectItem key={d.id} value={d.id.toString()}>
                    {d.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button
        className="w-full flex items-center justify-center gap-2"
        disabled={
          !name.trim() ||
          !address.trim() ||
          !email.trim() ||
          !phone.trim() ||
          !doorCode.trim() ||
          !stateId ||
          !marketId ||
          !districtId ||
          isSaving ||
          marketsLoading ||
          districtsLoading
        }
        onClick={() =>
          onSave({
            name: name.trim(),
            number: number.trim(),
            address: address.trim(),
            email: email.trim(),
            phone: phone.trim(),
            doorCode: doorCode.trim(),
            stateId: Number(stateId),
            marketId: Number(marketId),
            districtId: Number(districtId),
          })
        }
      >
        {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
        {initial ? "Update Store" : "Save Store"}
      </Button>
    </div>
  );
}
