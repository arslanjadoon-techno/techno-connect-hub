import { useState, useEffect, useRef } from "react";
import { AdminGuard, CrudPage } from "@/components/crud-page";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Search, X } from "lucide-react";
import { statesService, usersService } from "@/services";

interface StateAssignedUser {
  id: number;
  name: string;
  email?: string;
  phone?: string;
}

interface State {
  id: number;
  name: string;
  symbol: string;
  assignedUsers?: StateAssignedUser[];
  manager?: string;
  managerId?: number;
  email?: string;
  phone?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface StateFormData {
  name: string;
  symbol: string;
  email?: string | null;
  phone?: string | null;
  managerId?: number | null;
  manager?: string;
}

export default function StatesPage() {
  const [states, setStates] = useState<State[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // States for tracking server side pagination parameters
  const [page, setPage] = useState<number>(0);
  const [size, setSize] = useState<number>(15);
  const [totalRecords, setTotalRecords] = useState<number>(0);

  // Server-side backend search states
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  const [isSearchingBackend, setIsSearchingBackend] = useState<boolean>(false);

  // Synchronous atomic locker to prevent simultaneous duplicate fetches
  const lastFetchedKey = useRef<string>("");
  const isFetchingRef = useRef<boolean>(false);

  // Debounce search query changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Single dynamic fetch method supporting both pagination and backend search
  const fetchStates = async (targetPage: number, targetSize: number, search?: string) => {
    const trimmedSearch = (search ?? "").trim();
    const currentRequestKey = trimmedSearch
      ? `search-${trimmedSearch}`
      : `page-${targetPage}-${targetSize}`;

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

      const res = trimmedSearch
        ? await statesService.getAll({ search: trimmedSearch })
        : await statesService.getAll({ page: targetPage, size: targetSize });

      if (res.success) {
        // Fallback if current page has no data but database has records
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

        setStates(res.data);

        if (trimmedSearch) {
          setTotalRecords(res.data.length);
        } else if (res.pagination && typeof res.pagination.totalRecords === "number") {
          setTotalRecords(res.pagination.totalRecords);
        } else {
          setTotalRecords(res.data.length);
        }
      } else {
        toast.error(res.message || "Failed to load states");
        lastFetchedKey.current = "";
      }
    } catch (err: any) {
      toast.error(err?.message || "Something went wrong while fetching states");
      lastFetchedKey.current = "";
    } finally {
      setLoading(false);
      setIsSearchingBackend(false);
      isFetchingRef.current = false;
    }
  };

  // Synchronized effect wrapper to trigger fetch on page, size, or search query change
  useEffect(() => {
    fetchStates(page, size, debouncedSearch);
  }, [page, size, debouncedSearch]);

  // Delete Call
  const handleDelete = async (s: State) => {
    try {
      setActionLoading(true);
      const res = await statesService.delete(s.id);
      if (res.success) {
        toast.success(res.message || "State deleted successfully");
        lastFetchedKey.current = "";
        fetchStates(page, size, debouncedSearch);
      } else {
        toast.error(res.message || "Could not delete state");
      }
    } catch (err: any) {
      toast.error(err?.message || "Delete failed");
    } finally {
      setActionLoading(false);
    }
  };

  // Save/Update Call - Sets managerId, email, and phone to null if no manager is selected or if removed
  const handleSave = async (initial: State | null, formData: StateFormData, close: () => void) => {
    try {
      setActionLoading(true);
      const isManagerSelected = formData.managerId && Number(formData.managerId) > 0;

      if (initial) {
        const payload: Record<string, any> = {
          id: initial.id,
          name: formData.name.trim(),
          symbol: formData.symbol.trim().toUpperCase(),
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

        const res = await statesService.update(payload as any);
        if (res.success) {
          toast.success(res.message || "State updated successfully");
          lastFetchedKey.current = "";
          fetchStates(page, size, debouncedSearch);
          close();
        } else {
          toast.error(res.message || "Failed to update state");
        }
      } else {
        const payload: Record<string, any> = {
          name: formData.name.trim(),
          symbol: formData.symbol.trim().toUpperCase(),
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

        const res = await statesService.add(payload as any);
        if (res.success) {
          toast.success(res.message || "State added successfully");
          lastFetchedKey.current = "";
          fetchStates(page, size, debouncedSearch);
          close();
        } else {
          toast.error(res.message || "Failed to create state");
        }
      }
    } catch (err: any) {
      toast.error(err?.message || "Operation failed");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && states.length === 0 && !debouncedSearch) {
    return (
      <div className="flex h-[50vh] w-full flex-col items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-medium">Loading States...</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="w-full border-0 shadow-none bg-transparent [&_input]:bg-white dark:[&_input]:bg-zinc-950 [&_thead]:bg-zinc-200 dark:[&_thead]:bg-zinc-800 [&_thead]:border-b-2 [&_thead]:border-border [&_th]:font-bold [&_th]:text-zinc-900 dark:[&_th]:text-zinc-100 [&_th]:h-12 [&_tbody_tr]:bg-background [&_tbody_tr]:even:bg-zinc-50/50 dark:[&_tbody_tr]:even:bg-zinc-900/30 [&_tbody_tr]:hover:bg-muted/40 [&_th:last-child]:text-right [&_th:last-child]:pr-10 [&_td:last-child]:text-right">
        <CrudPage<State>
          title="States"
          subtitle="Manage US states the company operates in."
          rows={states}
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
          columns={[
            {
              key: "symbol",
              header: "Symbol (Code)",
              accessor: (s) => (
                <div className="font-mono py-2 text-left text-muted-foreground">{s.symbol}</div>
              ),
              searchValue: (s) => s.symbol,
            },
            {
              key: "name",
              header: "Name",
              accessor: (s) => <div className="font-medium py-2 text-left">{s.name}</div>,
              searchValue: (s) => s.name,
            },
            {
              key: "manager",
              header: "Manager",
              accessor: (s) => {
                const assigned = s.assignedUsers?.[0];
                const mgrName = assigned?.name || s.manager || "—";
                return (
                  <div className="py-2 text-left text-zinc-800 dark:text-zinc-200 font-medium">
                    {mgrName}
                  </div>
                );
              },
              searchValue: (s) => s.assignedUsers?.[0]?.name || s.manager || "",
            },
            {
              key: "email",
              header: "Email",
              accessor: (s) => {
                const assigned = s.assignedUsers?.[0];
                const mgrEmail = assigned?.email || s.email || "—";
                return (
                  <div className="py-2 text-left text-xs text-muted-foreground">{mgrEmail}</div>
                );
              },
              searchValue: (s) => s.assignedUsers?.[0]?.email || s.email || "",
            },
            {
              key: "phone",
              header: "Phone",
              accessor: (s) => {
                const assigned = s.assignedUsers?.[0];
                const mgrPhone = assigned?.phone || s.phone || "—";
                return (
                  <div className="py-2 text-left text-xs text-zinc-600 dark:text-zinc-400 font-mono">
                    {mgrPhone}
                  </div>
                );
              },
              searchValue: (s) => s.assignedUsers?.[0]?.phone || s.phone || "",
            },
          ]}
          onDelete={handleDelete}
          renderForm={(initial, close) => (
            <StateForm
              initial={initial}
              isSaving={actionLoading}
              onSave={(formData) => handleSave(initial, formData, close)}
            />
          )}
        />
      </div>
    </div>
  );
}

interface StateFormProps {
  initial: State | null;
  isSaving: boolean;
  onSave: (data: StateFormData) => void;
}

function StateForm({ initial, isSaving, onSave }: StateFormProps) {
  const initialUser = initial?.assignedUsers?.[0];
  const [name, setName] = useState(initial?.name ?? "");
  const [symbol, setSymbol] = useState(initial?.symbol ?? "");
  const [managerId, setManagerId] = useState<number | null>(
    initialUser?.id ?? (initial?.managerId && initial.managerId > 0 ? initial.managerId : null),
  );
  const [manager, setManager] = useState<string>(initialUser?.name ?? initial?.manager ?? "");
  const [email, setEmail] = useState<string>(initialUser?.email ?? initial?.email ?? "");
  const [phone, setPhone] = useState<string>(initialUser?.phone ?? initial?.phone ?? "");

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    Array<{ id: number; fullName: string; email?: string; phone?: string }>
  >([]);
  const [loadingUsers, setLoadingUsers] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState(false);

  const searchContainerRef = useRef<HTMLDivElement>(null);

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

  // Debounce the search query
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

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>
          Name <span className="text-destructive">*</span>
        </Label>
        <Input
          value={name}
          disabled={isSaving}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Texas"
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label>
          Symbol <span className="text-destructive">*</span>
        </Label>
        <Input
          value={symbol}
          disabled={isSaving}
          onChange={(e) => setSymbol(e.target.value)}
          maxLength={3}
          placeholder="e.g. TX"
          required
        />
      </div>

      {/* MANAGER SEARCHBOX SECTION */}
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
        disabled={!name.trim() || !symbol.trim() || isSaving}
        onClick={() =>
          onSave({
            name: name.trim(),
            symbol: symbol.trim().toUpperCase(),
            email: email.trim() || null,
            phone: phone.trim() || null,
            managerId: managerId && Number(managerId) > 0 ? Number(managerId) : null,
            manager: manager.trim() || undefined,
          })
        }
      >
        {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
        {initial ? "Update State" : "Save State"}
      </Button>
    </div>
  );
}
