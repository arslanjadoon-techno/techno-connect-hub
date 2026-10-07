import { useState, useEffect, useRef } from "react";
import { CrudPage } from "@/components/crud-page";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Search, X } from "lucide-react";
import { departmentsService, usersService } from "@/services";

interface DepartmentManager {
  id: number;
  fullName?: string;
  name?: string;
  email?: string;
  phone?: string;
}

interface DepartmentItem {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  manager?: DepartmentManager | null;
  managerId?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

interface DepartmentFormData {
  name: string;
  email: string;
  phone: string;
  managerId: number | null;
}

export default function DepartmentsPage() {
  const [rows, setRows] = useState<DepartmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [page, setPage] = useState<number>(0);
  const [size, setSize] = useState<number>(15);
  const [totalRecords, setTotalRecords] = useState<number>(0);

  const lastFetchedKey = useRef<string>("");
  const isFetchingRef = useRef<boolean>(false);

  const fetchRows = async (targetPage: number, targetSize: number) => {
    const key = `${targetPage}-${targetSize}`;
    if (lastFetchedKey.current === key || isFetchingRef.current) return;

    try {
      setLoading(true);
      isFetchingRef.current = true;
      lastFetchedKey.current = key;
      const res = await departmentsService.getAll({ page: targetPage, size: targetSize });
      if (res.success) {
        if (
          res.data.length === 0 &&
          res.pagination &&
          res.pagination.totalRecords > 0 &&
          targetPage > 0
        ) {
          const fallback = Math.max(0, Math.ceil(res.pagination.totalRecords / targetSize) - 1);
          isFetchingRef.current = false;
          lastFetchedKey.current = "";
          setPage(fallback);
          return;
        }
        setRows(res.data as DepartmentItem[]);
        setTotalRecords(res.pagination?.totalRecords ?? res.data.length);
      } else {
        toast.error(res.message || "Failed to load departments");
        lastFetchedKey.current = "";
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to fetch departments");
      lastFetchedKey.current = "";
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  };

  useEffect(() => {
    fetchRows(page, size);
  }, [page, size]);

  const handleDelete = async (d: DepartmentItem) => {
    try {
      setActionLoading(true);
      const res = await departmentsService.delete(d.id);
      if (res.success) {
        toast.success(res.message || "Department deleted successfully");
        lastFetchedKey.current = "";
        fetchRows(page, size);
      } else {
        toast.error(res.message || "Could not delete department");
      }
    } catch (err: any) {
      toast.error(err?.message || "Delete failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSave = async (
    initial: DepartmentItem | null,
    formData: DepartmentFormData,
    close: () => void,
  ) => {
    try {
      setActionLoading(true);

      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        managerId: formData.managerId ? Number(formData.managerId) : null,
      };

      const res = initial
        ? await departmentsService.update({ id: initial.id, ...payload })
        : await departmentsService.add(payload);

      if (res.success) {
        toast.success(
          res.message ||
            (initial ? "Department updated successfully" : "Department added successfully"),
        );
        lastFetchedKey.current = "";
        fetchRows(page, size);
        close();
      } else {
        toast.error(res.message || "Failed to save department");
      }
    } catch (err: any) {
      toast.error(err?.message || "Operation failed");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && rows.length === 0) {
    return (
      <div className="flex h-[50vh] w-full flex-col items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-medium">Loading Departments...</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="w-full border-0 shadow-none bg-transparent [&_input]:bg-white dark:[&_input]:bg-zinc-950 [&_thead]:bg-zinc-200 dark:[&_thead]:bg-zinc-800 [&_thead]:border-b-2 [&_thead]:border-border [&_th]:font-bold [&_th]:text-zinc-900 dark:[&_th]:text-zinc-100 [&_th]:h-12 [&_tbody_tr]:bg-background [&_tbody_tr]:even:bg-zinc-50/50 dark:[&_tbody_tr]:even:bg-zinc-900/30 [&_tbody_tr]:hover:bg-muted/40 [&_th:last-child]:text-right [&_th:last-child]:pr-10 [&_td:last-child]:text-right">
        <CrudPage<DepartmentItem>
          title="Departments"
          subtitle="Manage company departments used across portals."
          rows={rows}
          rowKey={(d) => d.id.toString()}
          isSaving={actionLoading}
          isLoading={loading}
          rowCount={totalRecords}
          page={page}
          pageSize={size}
          onPageChange={(p) => setPage(p)}
          onPageSizeChange={(s) => setSize(s)}
          columns={[
            {
              key: "name",
              header: "Department Name",
              accessor: (d) => (
                <div className="py-2 font-semibold text-zinc-900 dark:text-zinc-100">{d.name}</div>
              ),
              searchValue: (d) => d.name || "",
            },
            {
              key: "email",
              header: "Email",
              accessor: (d) => <div className="py-2 text-muted-foreground">{d.email || "—"}</div>,
              searchValue: (d) => d.email || "",
            },
            {
              key: "phone",
              header: "Phone",
              accessor: (d) => <div className="py-2 text-muted-foreground">{d.phone || "—"}</div>,
              searchValue: (d) => d.phone || "",
            },
            {
              key: "managerName",
              header: "Manager Name",
              accessor: (d) => (
                <div className="py-2 font-medium text-foreground">
                  {d.manager?.fullName || d.manager?.name || "—"}
                </div>
              ),
              searchValue: (d) => d.manager?.fullName || d.manager?.name || "",
            },
            {
              key: "managerEmail",
              header: "Manager Email",
              accessor: (d) => (
                <div className="py-2 text-xs text-muted-foreground">{d.manager?.email || "—"}</div>
              ),
              searchValue: (d) => d.manager?.email || "",
            },
            {
              key: "managerPhone",
              header: "Manager Phone",
              accessor: (d) => (
                <div className="py-2 text-xs text-muted-foreground font-mono">
                  {d.manager?.phone || "—"}
                </div>
              ),
              searchValue: (d) => d.manager?.phone || "",
            },
          ]}
          onDelete={handleDelete}
          renderForm={(initial, close) => (
            <DepartmentForm
              initial={initial}
              isSaving={actionLoading}
              onSave={(data) => handleSave(initial, data, close)}
            />
          )}
        />
      </div>
    </div>
  );
}

// =======================================================
// DEPARTMENT FORM COMPONENT WITH SEARCHBAR MANAGER
// =======================================================
function DepartmentForm({
  initial,
  isSaving,
  onSave,
}: {
  initial: DepartmentItem | null;
  isSaving: boolean;
  onSave: (data: DepartmentFormData) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");

  // Manager state
  const initialManager = initial?.manager;
  const [managerId, setManagerId] = useState<number | null>(
    initialManager?.id ? initialManager.id : initial?.managerId ? initial.managerId : null,
  );
  const [managerName, setManagerName] = useState<string>(
    initialManager?.fullName || initialManager?.name || "",
  );
  const [managerEmail, setManagerEmail] = useState<string>(initialManager?.email || "");
  const [managerPhone, setManagerPhone] = useState<string>(initialManager?.phone || "");

  // Manager Searchbox state
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    Array<{ id: number; fullName: string; email?: string; phone?: string }>
  >([]);
  const [loadingUsers, setLoadingUsers] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Close search dropdown on click outside
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
    setManagerName(user.fullName);
    setManagerEmail(user.email || "");
    setManagerPhone(user.phone || "");
    setSearchQuery("");
    setIsOpen(false);
  };

  // When manager is removed
  const handleRemoveManager = () => {
    setManagerId(null);
    setManagerName("");
    setManagerEmail("");
    setManagerPhone("");
    setSearchQuery("");
  };

  const canSave = name.trim().length > 0;

  return (
    <div className="space-y-4">
      {/* 1. Department Name */}
      <div className="space-y-1.5">
        <Label>
          Department Name <span className="text-destructive">*</span>
        </Label>
        <Input
          value={name}
          disabled={isSaving}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. IT, HR, Finance, Operations"
          required
        />
      </div>

      {/* 2. Department Email */}
      <div className="space-y-1.5">
        <Label>
          Department Email <span className="text-xs text-muted-foreground font-normal">(Optional)</span>
        </Label>
        <Input
          type="email"
          value={email}
          disabled={isSaving}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="dept@company.com"
        />
      </div>

      {/* 3. Department Phone */}
      <div className="space-y-1.5">
        <Label>
          Department Phone <span className="text-xs text-muted-foreground font-normal">(Optional)</span>
        </Label>
        <Input
          value={phone}
          disabled={isSaving}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="e.g. +1 (555) 123-4567"
        />
      </div>

      {/* 4. Manager Searchbar Section */}
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
                <span className="font-semibold text-xs text-foreground truncate">{managerName}</span>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium px-1.5 py-0.5 rounded">
                  Assigned
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                {managerEmail ? <span>{managerEmail}</span> : <span className="italic">No email</span>}
                {managerPhone ? <span>• {managerPhone}</span> : null}
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

      {/* 5. Non-editable Manager Email */}
      <div className="space-y-1.5">
        <Label>
          Manager Email <span className="text-xs text-muted-foreground font-normal">(Auto-populated)</span>
        </Label>
        <Input
          type="email"
          value={managerEmail}
          readOnly
          tabIndex={-1}
          placeholder="Auto-populated from manager selection"
          className="bg-muted/50 text-muted-foreground cursor-not-allowed select-none"
        />
      </div>

      {/* 6. Non-editable Manager Phone */}
      <div className="space-y-1.5">
        <Label>
          Manager Phone <span className="text-xs text-muted-foreground font-normal">(Auto-populated)</span>
        </Label>
        <Input
          value={managerPhone}
          readOnly
          tabIndex={-1}
          placeholder="Auto-populated from manager selection"
          className="bg-muted/50 text-muted-foreground cursor-not-allowed select-none"
        />
      </div>

      {/* Save Button */}
      <Button
        className="w-full flex items-center justify-center gap-2 mt-2"
        disabled={!canSave || isSaving}
        onClick={() =>
          onSave({
            name: name.trim(),
            email: email.trim(),
            phone: phone.trim(),
            managerId: managerId ? Number(managerId) : null,
          })
        }
      >
        {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
        {initial ? "Update Department" : "Save Department"}
      </Button>
    </div>
  );
}
