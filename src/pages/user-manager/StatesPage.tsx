import { useState, useEffect, useRef } from "react";
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
import { Loader2, Search } from "lucide-react";
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
  email?: string;
  phone?: string;
  managerId?: number;
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

  // Save/Update Call - Omits managerId, email, and phone if unselected or empty
  const handleSave = async (initial: State | null, formData: StateFormData, close: () => void) => {
    try {
      setActionLoading(true);
      if (initial) {
        const payload: Record<string, any> = {
          id: initial.id,
          name: formData.name.trim(),
          symbol: formData.symbol.trim().toUpperCase(),
        };

        if (formData.email && formData.email.trim()) {
          payload.email = formData.email.trim();
        }
        if (formData.phone && formData.phone.trim()) {
          payload.phone = formData.phone.trim();
        }
        if (formData.managerId && Number(formData.managerId) > 0) {
          payload.managerId = Number(formData.managerId);
        }

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
        };

        if (formData.email && formData.email.trim()) {
          payload.email = formData.email.trim();
        }
        if (formData.phone && formData.phone.trim()) {
          payload.phone = formData.phone.trim();
        }
        if (formData.managerId && Number(formData.managerId) > 0) {
          payload.managerId = Number(formData.managerId);
        }

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
  const [managerId, setManagerId] = useState<number>(initialUser?.id ?? initial?.managerId ?? 0);
  const [manager, setManager] = useState<string>(initialUser?.name ?? initial?.manager ?? "");
  const [email, setEmail] = useState<string>(initialUser?.email ?? initial?.email ?? "");
  const [phone, setPhone] = useState<string>(initialUser?.phone ?? initial?.phone ?? "");

  const [usersList, setUsersList] = useState<
    Array<{ id: number; fullName: string; email?: string; phone?: string }>
  >(
    initialUser
      ? [
          {
            id: initialUser.id,
            fullName: initialUser.name,
            email: initialUser.email || "",
            phone: initialUser.phone || "",
          },
        ]
      : [],
  );
  const [loadingUsers, setLoadingUsers] = useState<boolean>(false);
  const [searchManagerQuery, setSearchManagerQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Debounce the manager search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchManagerQuery.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchManagerQuery]);

  // Search users via GET /api/users/search?search=...
  useEffect(() => {
    let active = true;
    const fetchUsers = async () => {
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

          // Preserve selected initial user so Select displays their name properly
          if (initialUser && !mapped.some((m) => m.id === initialUser.id)) {
            mapped.unshift({
              id: initialUser.id,
              fullName: initialUser.name,
              email: initialUser.email || "",
              phone: initialUser.phone || "",
            });
          }

          setUsersList(mapped);
        }
      } catch (err) {
        console.error("Failed to search users for manager dropdown:", err);
      } finally {
        if (active) setLoadingUsers(false);
      }
    };

    fetchUsers();

    return () => {
      active = false;
    };
  }, [debouncedSearchQuery]);

  const handleManagerSelect = (val: string) => {
    const numId = Number(val) || 0;
    setManagerId(numId);
    if (numId === 0) {
      setManager("");
    } else {
      const found = usersList.find((u) => u.id === numId);
      if (found) {
        setManager(found.fullName);
        setEmail(found.email || "");
        setPhone(found.phone || "");
      }
    }
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
      <div className="space-y-1.5">
        <Label>
          Manager <span className="text-xs text-muted-foreground font-normal">(Optional)</span>
        </Label>
        <Select
          value={String(managerId)}
          onValueChange={handleManagerSelect}
          disabled={isSaving}
          onOpenChange={(open) => {
            if (!open) setSearchManagerQuery("");
            else setTimeout(() => searchInputRef.current?.focus(), 100);
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue
              placeholder={
                loadingUsers && usersList.length === 0
                  ? "Loading users..."
                  : "Select Manager (Optional)"
              }
            />
          </SelectTrigger>
          <SelectContent onKeyDown={(e) => e.stopPropagation()}>
            {/* Embedded Search Input field connected to GET /api/users/search */}
            <div className="flex items-center px-2 py-1.5 border-b sticky top-0 bg-popover z-10">
              <Search className="h-3.5 w-3.5 mr-2 text-muted-foreground shrink-0" />
              <input
                ref={searchInputRef}
                placeholder="Search managers by name, email..."
                value={searchManagerQuery}
                onChange={(e) => setSearchManagerQuery(e.target.value)}
                className="w-full text-xs bg-transparent outline-none h-6"
              />
              {loadingUsers && (
                <Loader2 className="h-3 w-3 animate-spin text-muted-foreground ml-1 shrink-0" />
              )}
            </div>

            <SelectItem value="0">
              <span className="text-muted-foreground italic text-xs">None / No Manager</span>
            </SelectItem>

            {usersList.length === 0 ? (
              <div className="text-xs text-muted-foreground p-2 text-center">
                {loadingUsers ? "Searching users..." : "No users found"}
              </div>
            ) : (
              usersList.map((u) => (
                <SelectItem key={u.id} value={String(u.id)}>
                  <div className="flex flex-col text-left">
                    <span className="font-medium text-xs">{u.fullName}</span>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      {u.email && <span>{u.email}</span>}
                      {u.phone && <span>{u.phone}</span>}
                    </div>
                  </div>
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
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
            email: email.trim() || undefined,
            phone: phone.trim() || undefined,
            managerId: Number(managerId) > 0 ? Number(managerId) : undefined,
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
