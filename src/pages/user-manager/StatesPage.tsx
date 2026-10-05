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
import { Loader2, Search } from "lucide-react";
import { StatesApi, usersApi } from "@/lib/api/client";

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
  email: string;
  phone: string;
  managerId: number;
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

  // Pre-loaded users list for both Add and Edit modal manager dropdowns
  const [usersList, setUsersList] = useState<
    Array<{ id: number; fullName: string; email: string; phone?: string | null }>
  >([]);
  const [loadingUsers, setLoadingUsers] = useState<boolean>(false);

  // Synchronous atomic locker to prevent simultaneous duplicate fetches
  const lastFetchedKey = useRef<string>("");
  const isFetchingRef = useRef<boolean>(false);

  // Load users list at the page level so it is immediately ready for Add and Edit state modals
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoadingUsers(true);
        const res = await usersApi.getAll({ page: 0, size: 200 });
        if (active && res.success && Array.isArray(res.data)) {
          setUsersList(
            res.data.map((u: any) => ({
              id: u.id,
              fullName:
                u.fullName ||
                u.name ||
                `${u.firstName || ""} ${u.lastName || ""}`.trim() ||
                `User #${u.id}`,
              email: u.email || "",
              phone: u.phone || "",
            })),
          );
        }
      } catch (err) {
        console.error("Error loading users for state manager dropdown:", err);
      } finally {
        if (active) setLoadingUsers(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

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
        ? await StatesApi.getAll({ search: trimmedSearch })
        : await StatesApi.getAll({ page: targetPage, size: targetSize });

      if (res.success) {
        // EDGE CASE FIX: If current page has no data but database has records, fallback to previous page
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
      const res = await StatesApi.delete(s.id);
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

  // Save/Update Call
  const handleSave = async (
    initial: State | null,
    formData: StateFormData,
    close: () => void,
  ) => {
    try {
      setActionLoading(true);
      if (initial) {
        const payload = {
          id: initial.id,
          name: formData.name,
          symbol: formData.symbol,
          email: formData.email ?? "",
          phone: formData.phone ?? "",
          managerId: Number(formData.managerId) || 0,
        };
        const res = await StatesApi.update(payload);
        if (res.success) {
          toast.success(res.message || "State updated successfully");
          lastFetchedKey.current = "";
          fetchStates(page, size, debouncedSearch);
          close();
        } else {
          toast.error(res.message);
        }
      } else {
        const payload = {
          name: formData.name,
          symbol: formData.symbol,
          email: formData.email ?? "",
          phone: formData.phone ?? "",
          managerId: Number(formData.managerId) || 0,
        };
        const res = await StatesApi.add(payload);
        if (res.success) {
          toast.success(res.message || "State added successfully");
          lastFetchedKey.current = "";
          fetchStates(page, size, debouncedSearch);
          close();
        } else {
          toast.error(res.message);
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
              accessor: (s) => <div className="py-2 text-left font-medium">{s.name}</div>,
              searchValue: (s) => s.name,
            },
            {
              key: "manager",
              header: "Manager",
              accessor: (s) => {
                const mgr = s.assignedUsers?.[0]?.name || s.manager || "—";
                return <div className="py-2 text-left font-medium text-foreground">{mgr}</div>;
              },
              searchValue: (s) => s.assignedUsers?.[0]?.name || s.manager || "",
            },
            {
              key: "email",
              header: "Email",
              accessor: (s) => {
                const mail = s.assignedUsers?.[0]?.email || s.email || "—";
                return (
                  <div className="py-2 text-left text-muted-foreground">
                    {mail !== "—" ? (
                      <span className="text-foreground/90">{mail}</span>
                    ) : (
                      "—"
                    )}
                  </div>
                );
              },
              searchValue: (s) => s.assignedUsers?.[0]?.email || s.email || "",
            },
            {
              key: "phone",
              header: "Phone",
              accessor: (s) => {
                const ph = s.assignedUsers?.[0]?.phone || s.phone || "—";
                return <div className="py-2 text-left text-muted-foreground">{ph}</div>;
              },
              searchValue: (s) => s.assignedUsers?.[0]?.phone || s.phone || "",
            },
          ]}
          onDelete={handleDelete}
          renderForm={(initial, close) => (
            <StateForm
              initial={initial}
              isSaving={actionLoading}
              usersList={usersList}
              loadingUsers={loadingUsers}
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
  usersList: Array<{ id: number; fullName: string; email: string; phone?: string | null }>;
  loadingUsers: boolean;
  onSave: (data: StateFormData) => void;
}

function StateForm({ initial, isSaving, usersList, loadingUsers, onSave }: StateFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [symbol, setSymbol] = useState(initial?.symbol ?? "");
  const [managerId, setManagerId] = useState<number>(
    initial?.assignedUsers?.[0]?.id ?? (initial as any)?.managerId ?? 0,
  );
  const [manager, setManager] = useState(
    initial?.assignedUsers?.[0]?.name ?? initial?.manager ?? "",
  );
  const [email, setEmail] = useState(
    initial?.assignedUsers?.[0]?.email ?? initial?.email ?? "",
  );
  const [phone, setPhone] = useState(
    initial?.assignedUsers?.[0]?.phone ?? initial?.phone ?? "",
  );

  const [searchManagerQuery, setSearchManagerQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Ensure initial assigned user is present in the list even if not in the first 200
  const mergedUsersList = useMemo(() => {
    if (initial?.assignedUsers?.[0]?.id) {
      const initUser = initial.assignedUsers[0];
      const exists = usersList.some((u) => u.id === initUser.id);
      if (!exists) {
        return [
          {
            id: initUser.id,
            fullName: initUser.name,
            email: initUser.email || "",
            phone: initUser.phone || "",
          },
          ...usersList,
        ];
      }
    }
    return usersList;
  }, [usersList, initial]);

  const filteredUsers = useMemo(() => {
    if (!searchManagerQuery.trim()) return mergedUsersList;
    const q = searchManagerQuery.toLowerCase().trim();
    return mergedUsersList.filter(
      (u) =>
        u.fullName.toLowerCase().includes(q) ||
        (u.email || "").toLowerCase().includes(q) ||
        String(u.id).includes(q),
    );
  }, [mergedUsersList, searchManagerQuery]);

  const handleManagerSelect = (val: string) => {
    const numId = Number(val) || 0;
    setManagerId(numId);
    if (numId === 0) {
      setManager("");
    } else {
      const found = mergedUsersList.find((u) => u.id === numId);
      if (found) {
        setManager(found.fullName);
        if (found.email) setEmail(found.email);
        if (found.phone) setPhone(found.phone);
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
            {/* Embedded Search Input field */}
            <div className="flex items-center px-2 py-1.5 border-b sticky top-0 bg-popover z-10">
              <Search className="h-3.5 w-3.5 mr-2 text-muted-foreground shrink-0" />
              <input
                ref={searchInputRef}
                placeholder="Search managers by name or email..."
                value={searchManagerQuery}
                onChange={(e) => setSearchManagerQuery(e.target.value)}
                className="w-full text-xs bg-transparent outline-none h-6"
              />
            </div>

            <SelectItem value="0">
              <span className="text-muted-foreground italic text-xs">None / No Manager</span>
            </SelectItem>

            {filteredUsers.length === 0 ? (
              <div className="text-xs text-muted-foreground p-2 text-center">
                {loadingUsers ? "Loading users..." : "No users found"}
              </div>
            ) : (
              filteredUsers.map((u) => (
                <SelectItem key={u.id} value={String(u.id)}>
                  <div className="flex flex-col text-left">
                    <span className="font-medium text-xs">{u.fullName}</span>
                    {u.email && (
                      <span className="text-[10px] text-muted-foreground">{u.email}</span>
                    )}
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
            email: email.trim(),
            phone: phone.trim(),
            managerId: Number(managerId) || 0,
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
