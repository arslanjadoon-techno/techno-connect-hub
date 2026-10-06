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
import { Loader2, Search, X, XCircle } from "lucide-react";
import { marketsService, statesService, usersService, districtsService } from "@/services";
import type { Market } from "@/lib/api/client";

interface State {
  id: number;
  name: string;
  symbol: string;
}

interface District {
  id: number;
  name: string;
  state?: {
    id: number;
    name: string;
  } | null;
}

interface MarketFormData {
  name: string;
  stateId: number;
  districtId?: number;
  managerId?: number | null;
  manager?: string;
  email?: string | null;
  phone?: string | null;
}

export default function MarketsPage() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [districtsList, setDistrictsList] = useState<District[]>([]);

  const [selectedStateFilter, setSelectedStateFilter] = useState<string>("all");
  const [mainStateSearch, setMainStateSearch] = useState("");
  const mainStateSearchRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Pagination tracking states
  const [page, setPage] = useState<number>(0);
  const [size, setSize] = useState<number>(15);
  const [totalRecords, setTotalRecords] = useState<number>(0);

  // Synchronous atomic lockers
  const lastFetchedKey = useRef<string>("");
  const isFetchingRef = useRef<boolean>(false);
  const initialLookupsFetchedRef = useRef<boolean>(false);

  // Dynamic fetch handler
  const fetchMarkets = async (targetPage: number, targetSize: number, targetState: string) => {
    const currentRequestKey = `${targetPage}-${targetSize}-${targetState}`;

    if (lastFetchedKey.current === currentRequestKey || isFetchingRef.current) {
      return;
    }

    try {
      setLoading(true);
      isFetchingRef.current = true;
      lastFetchedKey.current = currentRequestKey;

      if (!initialLookupsFetchedRef.current) {
        const [statesRes, districtsRes] = await Promise.all([
          statesService.getAll(),
          districtsService.getAll(),
        ]);

        if (statesRes.success) setStates(statesRes.data);
        if (districtsRes.success) setDistrictsList(districtsRes.data);

        if (statesRes.success && districtsRes.success) {
          initialLookupsFetchedRef.current = true;
        }
      }

      const res = await marketsService.getAll({
        page: targetPage,
        size: targetSize,
        state: targetState !== "all" ? targetState : undefined,
      });

      if (res.success) {
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
    fetchMarkets(page, size, selectedStateFilter);
  }, [page, size, selectedStateFilter]);

  const handleStateFilterChange = (newState: string) => {
    lastFetchedKey.current = "";
    setPage(0);
    setSelectedStateFilter(newState);
  };

  const handleResetFilters = () => {
    if (selectedStateFilter === "all") return;
    lastFetchedKey.current = "";
    setPage(0);
    setSelectedStateFilter("all");
    toast.success("Filters cleared successfully");
  };

  const handleDelete = async (m: Market) => {
    try {
      setActionLoading(true);
      const res = await marketsService.delete(m.id);
      if (res.success) {
        toast.success(res.message || "Market deleted successfully");
        lastFetchedKey.current = "";
        fetchMarkets(page, size, selectedStateFilter);
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
    formData: MarketFormData,
    close: () => void,
  ) => {
    try {
      setActionLoading(true);
      const isManagerSelected = formData.managerId && Number(formData.managerId) > 0;

      if (initial) {
        const payload = {
          id: initial.id,
          name: formData.name.trim(),
          stateId: formData.stateId,
          districtId: initial.district?.id ?? formData.districtId,
          managerId: isManagerSelected ? Number(formData.managerId) : null,
          email:
            isManagerSelected && formData.email && formData.email.trim()
              ? formData.email.trim()
              : null,
          phone:
            isManagerSelected && formData.phone && formData.phone.trim()
              ? formData.phone.trim()
              : null,
        };

        const res = await marketsService.update(payload);
        if (res.success) {
          toast.success(res.message || "Market updated successfully");
          lastFetchedKey.current = "";
          fetchMarkets(page, size, selectedStateFilter);
          close();
        } else {
          toast.error(res.message || "Update failed");
        }
      } else {
        // Resolve districtId for backend requirement if needed
        const matchedDistrict =
          districtsList.find((d) => d.state?.id === formData.stateId) || districtsList[0];
        const effectiveDistrictId = formData.districtId || matchedDistrict?.id || 6;

        const payload = {
          name: formData.name.trim(),
          stateId: formData.stateId,
          districtId: effectiveDistrictId,
          managerId: isManagerSelected ? Number(formData.managerId) : null,
          email:
            isManagerSelected && formData.email && formData.email.trim()
              ? formData.email.trim()
              : null,
          phone:
            isManagerSelected && formData.phone && formData.phone.trim()
              ? formData.phone.trim()
              : null,
        };

        const res = await marketsService.add(payload);
        if (res.success) {
          toast.success(res.message || "Market added successfully");
          lastFetchedKey.current = "";
          fetchMarkets(page, size, selectedStateFilter);
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

  const filteredMainStatesOptions = useMemo(() => {
    return states.filter((s) => s.name.toLowerCase().includes(mainStateSearch.toLowerCase()));
  }, [states, mainStateSearch]);

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
            subtitle="Manage regional market definitions, zones, and assigned team managers."
            rows={markets}
            rowKey={(m) => m.id.toString()}
            isSaving={actionLoading}
            isLoading={loading}
            rowCount={totalRecords}
            page={page}
            pageSize={size}
            onPageChange={(newPage) => setPage(newPage)}
            onPageSizeChange={(newSize) => setSize(newSize)}
            searchPlaceholder="Search markets..."
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

                {/* 2. RESET FILTERS BUTTON */}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={selectedStateFilter === "all"}
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
                accessor: (m) => (
                  <div className="py-2 text-left text-muted-foreground">{m.state?.name ?? "—"}</div>
                ),
                searchValue: (m) => m.state?.name ?? "",
              },
              {
                key: "manager",
                header: "Manager",
                accessor: (m) => {
                  const assigned = m.assignedUsers?.[0];
                  const mgrName = assigned?.name || m.manager || "—";
                  return (
                    <div className="py-2 text-left text-zinc-800 dark:text-zinc-200 font-medium">
                      {mgrName}
                    </div>
                  );
                },
                searchValue: (m) => m.assignedUsers?.[0]?.name || m.manager || "",
              },
              {
                key: "email",
                header: "Email",
                accessor: (m) => {
                  const assigned = m.assignedUsers?.[0];
                  const mgrEmail = assigned?.email || m.email || "—";
                  return (
                    <div className="py-2 text-left text-xs text-muted-foreground">{mgrEmail}</div>
                  );
                },
                searchValue: (m) => m.assignedUsers?.[0]?.email || m.email || "",
              },
              {
                key: "phone",
                header: "Phone",
                accessor: (m) => {
                  const assigned = m.assignedUsers?.[0];
                  const mgrPhone = assigned?.phone || m.phone || "—";
                  return (
                    <div className="py-2 text-left text-xs text-zinc-600 dark:text-zinc-400 font-mono">
                      {mgrPhone}
                    </div>
                  );
                },
                searchValue: (m) => m.assignedUsers?.[0]?.phone || m.phone || "",
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
  onSave: (data: MarketFormData) => void;
}

function MarketForm({ initial, states, isSaving, onSave }: MarketFormProps) {
  const initialUser = initial?.assignedUsers?.[0];
  const [name, setName] = useState(initial?.name ?? "");
  const [stateId, setStateId] = useState<string>(
    initial?.state?.id ? initial.state.id.toString() : "",
  );

  const [managerId, setManagerId] = useState<number | null>(
    initialUser?.id ?? (initial?.managerId && initial.managerId > 0 ? initial.managerId : null),
  );
  const [manager, setManager] = useState<string>(initialUser?.name ?? initial?.manager ?? "");
  const [email, setEmail] = useState<string>(initialUser?.email ?? initial?.email ?? "");
  const [phone, setPhone] = useState<string>(initialUser?.phone ?? initial?.phone ?? "");

  // Searchbox states for Manager
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    Array<{ id: number; fullName: string; email?: string; phone?: string }>
  >([]);
  const [loadingUsers, setLoadingUsers] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // State search input state
  const [stateSearch, setStateSearch] = useState("");
  const stateSearchRef = useRef<HTMLInputElement>(null);

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

  // Debounce the manager search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Search users via GET /api/users/search?search=...
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

  // When a user is selected from the searchbox results
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

  // When the manager is removed: automatically clear managerId, email, and phone
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

  return (
    <div className="space-y-4">
      {/* 1. Market Name */}
      <div className="space-y-1.5">
        <Label>
          Market Name <span className="text-destructive">*</span>
        </Label>
        <Input
          value={name}
          disabled={isSaving}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Downtown Central Market"
          required
        />
      </div>

      {/* 2. State Selection */}
      <div className="space-y-1.5">
        <Label>
          State <span className="text-destructive">*</span>
        </Label>
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

      {/* 3. MANAGER SEARCHBOX */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label>
            Manager <span className="text-xs text-muted-foreground font-normal">(Optional)</span>
          </Label>
          {managerId ? (
            <button
              type="button"
              onClick={handleRemoveManager}
              disabled={isSaving}
              className="text-xs text-destructive hover:underline cursor-pointer flex items-center gap-1 font-medium"
            >
              <X className="h-3 w-3" /> Remove manager
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
                placeholder="Search user by name, email to assign as manager..."
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

      {/* 4. Email */}
      <div className="space-y-1.5">
        <Label>
          Email <span className="text-xs text-muted-foreground font-normal">(Optional)</span>
        </Label>
        <Input
          type="email"
          value={email}
          disabled={isSaving}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="e.g. john.doe@example.com"
        />
      </div>

      {/* 5. Phone */}
      <div className="space-y-1.5">
        <Label>
          Phone <span className="text-xs text-muted-foreground font-normal">(Optional)</span>
        </Label>
        <Input
          value={phone}
          disabled={isSaving}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="e.g. +1 (123) 456-7890"
        />
      </div>

      <Button
        className="w-full flex items-center justify-center gap-2 cursor-pointer"
        disabled={!name.trim() || !stateId || isSaving}
        onClick={() =>
          onSave({
            name: name.trim(),
            stateId: Number(stateId),
            districtId: initial?.district?.id,
            managerId: managerId && Number(managerId) > 0 ? Number(managerId) : null,
            manager: manager.trim() || undefined,
            email: email.trim() || null,
            phone: phone.trim() || null,
          })
        }
      >
        {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
        {initial ? "Update Market" : "Save Market"}
      </Button>
    </div>
  );
}
