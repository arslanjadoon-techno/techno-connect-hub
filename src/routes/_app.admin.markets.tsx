import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef, useMemo } from "react";
import { AdminGuard, CrudPage } from "@/components/crud-page";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Search, XCircle } from "lucide-react"; // XCircle added for reset icon
import { MarketsApi, StatesApi, DistrictsApi } from "@/lib/api/client"; 

interface Market {
  id: number;
  name: string;
  stateId: number;
  districtId: number;
  createdAt?: string;
  updatedAt?: string;
}

interface State {
  id: number;
  name: string;
  symbol: string;
}

interface District {
  id: number;
  name: string;
  stateId: number;
}

export const Route = createFileRoute("/_app/admin/markets")({
  head: () => ({ meta: [{ title: "Markets — Admin" }] }),
  component: () => <AdminGuard><MarketsPage /></AdminGuard>,
});

function MarketsPage() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [districtsForFilter, setDistrictsForFilter] = useState<District[]>([]); 
  
  const [selectedStateFilter, setSelectedStateFilter] = useState<string>("all");
  const [selectedDistrictFilter, setSelectedDistrictFilter] = useState<string>("all");
  
  const [mainStateSearch, setMainStateSearch] = useState("");
  const [mainDistrictSearch, setMainDistrictSearch] = useState("");
  const [allDistrictsForLookup, setAllDistrictsForLookup] = useState<District[]>([]); 

  const mainStateSearchRef = useRef<HTMLInputElement>(null);
  const mainDistrictSearchRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [filterDistrictsLoading, setFilterDistrictsLoading] = useState(false);

  // Pagination tracking states
  const [page, setPage] = useState<number>(0);
  const [size, setSize] = useState<number>(10);
  const [totalRecords, setTotalRecords] = useState<number>(0);

  // Synchronous atomic lockers
  const lastFetchedKey = useRef<string>("");
  const isFetchingRef = useRef<boolean>(false);
  const initialLookupsFetchedRef = useRef<boolean>(false);

  // Dynamic fetch handler
  const fetchMarkets = async (targetPage: number, targetSize: number, targetState: string, targetDistrict: string) => {
    const currentRequestKey = `${targetPage}-${targetSize}-${targetState}-${targetDistrict}`;
    
    if (lastFetchedKey.current === currentRequestKey || isFetchingRef.current) {
      return;
    }
    
    try {
      setLoading(true);
      isFetchingRef.current = true;
      lastFetchedKey.current = currentRequestKey;

      if (!initialLookupsFetchedRef.current) {
        const [statesRes, districtsRes] = await Promise.all([
          StatesApi.getAll(),
          DistrictsApi.getAll() 
        ]);

        if (statesRes.success) setStates(statesRes.data);
        if (districtsRes.success) setAllDistrictsForLookup(districtsRes.data);
        
        if (statesRes.success && districtsRes.success) {
          initialLookupsFetchedRef.current = true;
        }
      }

      const res = await MarketsApi.getAll({ 
        page: targetPage, 
        size: targetSize, 
        state: targetState !== "all" ? targetState : undefined,
        district: targetDistrict !== "all" ? targetDistrict : undefined 
      });
      
      if (res.success) {
        if (res.data.length === 0 && res.pagination && res.pagination.totalRecords > 0 && targetPage > 0) {
          const maxAvailablePage = Math.ceil(res.pagination.totalRecords / targetSize) - 1;
          const fallbackPage = Math.max(0, maxAvailablePage);
          
          isFetchingRef.current = false;
          lastFetchedKey.current = "";
          setPage(fallbackPage);
          return;
        }

        setMarkets(res.data);
        setTotalRecords(res.pagination?.totalRecords ?? res.data.length);
      } else {
        toast.error(res.message || "Failed to load markets");
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

  useEffect(() => {
    fetchMarkets(page, size, selectedStateFilter, selectedDistrictFilter);
  }, [page, size, selectedStateFilter, selectedDistrictFilter]);

  // FIX: Added dynamic blocker guard condition to prevent eager api hit when state is "all" or unselected
  useEffect(() => {
    if (!selectedStateFilter || selectedStateFilter === "all") {
      setDistrictsForFilter([]);
      return;
    }

    const loadDistrictsForToolbarFilter = async () => {
      try {
        setFilterDistrictsLoading(true);
        const apiClient = DistrictsApi.getAll as any;
        const res = await apiClient({ state: selectedStateFilter });
        if (res.success) {
          setDistrictsForFilter(res.data);
        }
      } catch (err) {
        console.error("Failed to load cascading filter options", err);
      } finally {
        setFilterDistrictsLoading(false);
      }
    };

    loadDistrictsForToolbarFilter();
  }, [selectedStateFilter]);

  const handleStateFilterChange = (newState: string) => {
    lastFetchedKey.current = "";
    setPage(0);
    setSelectedDistrictFilter("all"); // Reset child selection instantly
    setSelectedStateFilter(newState);
  };

  const handleDistrictFilterChange = (newDistrict: string) => {
    lastFetchedKey.current = "";
    setPage(0);
    setSelectedDistrictFilter(newDistrict);
  };

  // FEATURE IMPLEMENTED: Reset Filters Action with dynamic trigger locks clearing
  const handleResetFilters = () => {
    if (selectedStateFilter === "all" && selectedDistrictFilter === "all") return;
    lastFetchedKey.current = "";
    setPage(0);
    setSelectedStateFilter("all");
    setSelectedDistrictFilter("all");
    setDistrictsForFilter([]);
    toast.success("Filters cleared successfully");
  };

  const handleDelete = async (m: Market) => {
    try {
      setActionLoading(true);
      const res = await MarketsApi.delete({ id: m.id });
      if (res.success) {
        toast.success(res.message || "Market deleted successfully");
        lastFetchedKey.current = "";
        fetchMarkets(page, size, selectedStateFilter, selectedDistrictFilter);
      } else {
        toast.error(res.message || "Could not delete market");
      }
    } catch (err: any) {
      toast.error(err?.message || "Delete failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSave = async (
    initial: Market | null,
    formData: { name: string; stateId: number; districtId: number },
    close: () => void
  ) => {
    try {
      setActionLoading(true);
      if (initial) {
        const res = await MarketsApi.update({
          id: initial.id,
          name: formData.name,
          districtId: formData.districtId,
        });
        if (res.success) {
          toast.success(res.message || "Market updated successfully");
          lastFetchedKey.current = "";
          initialLookupsFetchedRef.current = false; 
          fetchMarkets(page, size, selectedStateFilter, selectedDistrictFilter);
          close();
        } else {
          toast.error(res.message || "Update failed");
        }
      } else {
        const res = await MarketsApi.add(formData);
        if (res.success) {
          toast.success(res.message || "Market added successfully");
          lastFetchedKey.current = "";
          fetchMarkets(page, size, selectedStateFilter, selectedDistrictFilter);
          close();
        } else {
          toast.error(res.message || "Failed to create market");
        }
      }
    } catch (err: any) {
      toast.error(err?.message || "Operation failed");
    } finally {
      setActionLoading(false);
    }
  };

  const getStateName = (id: number) => states.find((s) => s.id === id)?.name ?? "—";
  const getDistrictName = (id: number) => allDistrictsForLookup.find((d) => d.id === id)?.name ?? `—`;

  const filteredMainStatesOptions = useMemo(() => {
    return states.filter((s) => s.name.toLowerCase().includes(mainStateSearch.toLowerCase()));
  }, [states, mainStateSearch]);

  const filteredMainDistrictsOptions = useMemo(() => {
    return districtsForFilter.filter((d) => d.name.toLowerCase().includes(mainDistrictSearch.toLowerCase()));
  }, [districtsForFilter, mainDistrictSearch]);

  if (loading && markets.length === 0) {
    return (
      <div className="flex h-[50vh] w-full flex-col items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-medium">Loading Markets Management Portal...</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="w-full border-0 shadow-none bg-transparent [&_input]:bg-white dark:[&_input]:bg-zinc-950 [&_button.w-\[180px\]]:bg-white dark:[&_button.w-\[180px\]]:bg-zinc-950 [&_thead]:bg-zinc-200 dark:[&_thead]:bg-zinc-800 [&_thead]:border-b-2 [&_thead]:border-border [&_th]:font-bold [&_th]:text-zinc-900 dark:[&_th]:text-zinc-100 [&_th]:h-12 [&_tbody_tr]:bg-background [&_tbody_tr]:even:bg-zinc-50/50 dark:[&_tbody_tr]:even:bg-zinc-900/30 [&_tbody_tr]:hover:bg-muted/40 [&_th:last-child]:text-right [&_th:last-child]:pr-10 [&_td:last-child]:text-right [&_td[colspan]]:text-center [&_td[colspan]]:font-medium">
        
        <div className="[&_.flex-col]:flex-row [&_.flex-col]:items-center [&_.flex-col]:justify-between [&_.max-w-sm]:order-last [&_.max-w-sm]:ml-auto">
          <CrudPage<Market>
            title="Markets"
            subtitle="Manage markets, assign states, and link specific active operational districts."
            rows={markets}
            rowKey={(m) => m.id.toString()}
            isSaving={actionLoading}
            isLoading={loading}
            
            rowCount={totalRecords}
            page={page}
            pageSize={size}
            onPageChange={(newPage) => setPage(newPage)}
            onPageSizeChange={(newSize) => setSize(newSize)}
            
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
                    <SelectContent onKeyDown={(e) => e.stopPropagation()} onKeyUp={(e) => e.stopPropagation()}>
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
                        <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 2. CASCADING DEPENDENT DISTRICT TOOLBAR FILTER */}
                <div className="relative flex flex-col pt-2.5">
                  <span className="absolute -top-1 left-2 bg-background px-1 text-[11px] font-semibold text-muted-foreground z-10">
                    District
                  </span>
                  <Select 
                    value={selectedDistrictFilter} 
                    disabled={selectedStateFilter === "all" || filterDistrictsLoading}
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
                    <SelectContent onKeyDown={(e) => e.stopPropagation()} onKeyUp={(e) => e.stopPropagation()}>
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
                        <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 3. FEATURE IMPLEMENTED: ANIMATED RESET FILTERS BUTTON */}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={selectedStateFilter === "all" && selectedDistrictFilter === "all"}
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
                accessor: (m) => <div className="py-2 text-left font-medium">{m.name}</div>,
                searchValue: (m) => m.name,
              },
              {
                key: "state",
                header: "State",
                accessor: (m) => <div className="py-2 text-left text-muted-foreground">{getStateName(m.stateId)}</div>,
                searchValue: (m) => getStateName(m.stateId),
              },
              {
                key: "district",
                header: "District",
                accessor: (m) => <div className="py-2 text-left text-zinc-700 dark:text-zinc-300 font-medium">{getDistrictName(m.districtId)}</div>,
                searchValue: (m) => getDistrictName(m.districtId),
              },
            ]}
            onDelete={handleDelete}
            renderForm={(initial, close) => (
              <MarketForm
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

interface MarketFormProps {
  initial: Market | null;
  states: State[];
  isSaving: boolean;
  onSave: (data: { name: string; stateId: number; districtId: number }) => void;
}

function MarketForm({ initial, states, isSaving, onSave }: MarketFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [stateId, setStateId] = useState<string>(initial?.stateId ? initial.stateId.toString() : "");
  const [districtId, setDistrictId] = useState<string>(initial?.districtId ? initial.districtId.toString() : "");

  const [districts, setDistricts] = useState<District[]>([]);
  const [districtsLoading, setDistrictsLoading] = useState(false);

  const [stateSearch, setStateSearch] = useState("");
  const [districtSearch, setDistrictSearch] = useState("");

  const stateSearchRef = useRef<HTMLInputElement>(null);
  const districtSearchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!stateId) {
      setDistricts([]);
      return;
    }

    const loadStateSpecificDistricts = async () => {
      try {
        setDistrictsLoading(true);
        const apiClient = DistrictsApi.getAll as any;
        const res = await apiClient({ state: stateId });
        if (res.success) {
          setDistricts(res.data);
          if (initial && initial.stateId.toString() === stateId) {
             setDistrictId(initial.districtId.toString());
          } else {
             setDistrictId("");
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setDistrictsLoading(false);
      }
    };

    loadStateSpecificDistricts();
  }, [stateId, initial]);

  const filteredStates = useMemo(() => {
    return states.filter((s) => s.name.toLowerCase().includes(stateSearch.toLowerCase()));
  }, [states, stateSearch]);

  const filteredDistricts = useMemo(() => {
    return districts.filter((d) => d.name.toLowerCase().includes(districtSearch.toLowerCase()));
  }, [districts, districtSearch]);

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Market Name</Label>
        <Input
          value={name}
          disabled={isSaving}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Downtown Central Market"
        />
      </div>
      
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
            <SelectValue placeholder="Select operating state" />
          </SelectTrigger>
          <SelectContent onKeyDown={(e) => e.stopPropagation()} onKeyUp={(e) => e.stopPropagation()}>
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
              <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label>District</Label>
          {districtsLoading && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
        </div>
        <Select 
          value={districtId} 
          disabled={isSaving || !stateId || districtsLoading || !!initial} 
          onValueChange={setDistrictId}
          onOpenChange={(open) => {
            if (!open) setDistrictSearch("");
            else setTimeout(() => districtSearchRef.current?.focus(), 100);
          }}
        >
          <SelectTrigger className="w-full bg-white dark:bg-zinc-950">
            <SelectValue placeholder={!stateId ? "Please choose state first" : "Select mapped district"} />
          </SelectTrigger>
          <SelectContent onKeyDown={(e) => e.stopPropagation()} onKeyUp={(e) => e.stopPropagation()}>
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
                <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      <Button
        className="w-full flex items-center justify-center gap-2"
        disabled={!name.trim() || !stateId || !districtId || isSaving || districtsLoading}
        onClick={() => onSave({ 
          name: name.trim(), 
          stateId: Number(stateId), 
          districtId: Number(districtId) 
         })}
      >
        {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
        {initial ? "Update Market" : "Save Market"}
      </Button>
    </div>
  );
}