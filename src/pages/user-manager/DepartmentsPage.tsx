import { useState, useEffect, useRef, useMemo } from "react";
import { AdminGuard, CrudPage } from "@/components/crud-page";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Search } from "lucide-react";
// 🌟 usersApi ko import kiya manager searchable dropdown ke liye
import { DepartmentsApi, usersApi, type DepartmentEntity } from "@/lib/api/client";

export default function DepartmentsPage() {
  const [rows, setRows] = useState<any[]>([]);
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
      const res = await DepartmentsApi.getAll({ page: targetPage, size: targetSize });
      if (res.success) {
        if (res.data.length === 0 && res.pagination && res.pagination.totalRecords > 0 && targetPage > 0) {
          const fallback = Math.max(0, Math.ceil(res.pagination.totalRecords / targetSize) - 1);
          isFetchingRef.current = false;
          lastFetchedKey.current = "";
          setPage(fallback);
          return;
        }
        setRows(res.data);
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

  useEffect(() => { fetchRows(page, size); }, [page, size]);

  const handleDelete = async (d: any) => {
    try {
      setActionLoading(true);
      const res = await DepartmentsApi.delete(d.id);
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
    initial: any | null,
    formData: { name: string; email: string; phone: string; managerId: number | null },
    close: () => void,
  ) => {
    try {
      setActionLoading(true);
      
      const payload = {
        name: formData.name,
        email: formData.email || null,
        phone: formData.phone || null,
        managerId: formData.managerId ? Number(formData.managerId) : null
      };

      const res = initial
        ? await DepartmentsApi.update({ id: initial.id, ...payload })
        : await DepartmentsApi.add(payload);

      if (res.success) {
        toast.success(res.message || (initial ? "Department updated successfully" : "Department added successfully"));
        lastFetchedKey.current = "";
        fetchRows(page, size);
        close();
      } else {
        toast.error(res.message);
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
        <CrudPage<any>
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
            // 🌟 Naye Columns response ke mutabik add kiye gaye hain
            {
              key: "name",
              header: "Department Name",
              accessor: (d) => <div className="py-2 font-semibold text-zinc-900 dark:text-zinc-100">{d.name}</div>,
              searchValue: (d) => d.name,
            },
            {
              key: "email",
              header: "Email",
              accessor: (d) => <div className="py-2 text-muted-foreground">{d.email || "—"}</div>,
            },
            {
              key: "phone",
              header: "Phone",
              accessor: (d) => <div className="py-2 text-muted-foreground">{d.phone || "—"}</div>,
            },
            {
              key: "managerName",
              header: "Manager Name",
              accessor: (d) => <div className="py-2 font-medium text-indigo-600 dark:text-indigo-400">{d.manager?.fullName || "—"}</div>,
            },
            {
              key: "managerEmail",
              header: "Manager Email",
              accessor: (d) => <div className="py-2 text-xs text-muted-foreground">{d.manager?.email || "—"}</div>,
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
// SEARCHABLE DROPDOWN FORM COMPONENT
// =======================================================
function DepartmentForm({
  initial, isSaving, onSave,
}: {
  initial: any | null;
  isSaving: boolean;
  onSave: (data: { name: string; email: string; phone: string; managerId: number | null }) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  
  // States for Manager Dropdown API implementation
  const [managerId, setManagerId] = useState<string>(initial?.manager?.id ? initial.manager.id.toString() : "placeholder");
  const [usersList, setUsersList] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Users list fetch karne ke liye effect
  useEffect(() => {
    usersApi.getAll({ page: 0, size: 200 }).then((res) => {
      if (res.success && Array.isArray(res.data)) {
        setUsersList(res.data);
      }
    }).catch(err => console.error("Error loading users for dropdown:", err));
  }, []);

  // Inline dynamic filter framework execution
  const filteredUsers = useMemo(() => {
    return usersList.filter((u) => 
      (u.fullName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.email || "").toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [usersList, searchQuery]);

  const canSave = name.trim().length > 0 && managerId !== "placeholder" && !!managerId;

  return (
    <div className="space-y-4">
      {/* Name Input */}
      <div className="space-y-1.5">
        <Label>Department Name <span className="text-destructive">*</span></Label>
        <Input
          value={name}
          disabled={isSaving}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. IT, HR, Finance"
        />
      </div>

      {/* Email Input */}
      <div className="space-y-1.5">
        <Label>Department Email</Label>
        <Input
          type="email"
          value={email}
          disabled={isSaving}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="dept@company.com"
        />
      </div>

      {/* Phone Input */}
      <div className="space-y-1.5">
        <Label>Phone Number</Label>
        <Input
          value={phone}
          disabled={isSaving}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="e.g. +1 (555) 123 432"
        />
      </div>

      {/* 🌟 SEARCHABLE MANAGER DROPDOWN COMPONENT */}
      <div className="space-y-1.5">
        <Label>Assigned Manager <span className="text-destructive">*</span></Label>
        <Select 
          value={managerId} 
          disabled={isSaving}
          onValueChange={setManagerId} 
          onOpenChange={(open) => { if (!open) setSearchQuery(""); else setTimeout(() => searchInputRef.current?.focus(), 100); }}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select Manager" />
          </SelectTrigger>
          <SelectContent onKeyDown={(e) => e.stopPropagation()}>
            {/* Embedded Search Input field */}
            <div className="flex items-center px-2 py-1.5 border-b sticky top-0 bg-popover z-10">
              <Search className="h-3.5 w-3.5 mr-2 text-muted-foreground shrink-0" />
              <input 
                ref={searchInputRef} 
                placeholder="Search managers by name..." 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
                className="w-full text-xs bg-transparent outline-none h-6" 
              />
            </div>
            
            <SelectItem value="placeholder" disabled>Choose a Manager</SelectItem>
            
            {filteredUsers.length === 0 ? (
              <div className="text-xs text-muted-foreground p-2 text-center">No users found</div>
            ) : (
              filteredUsers.map((u) => (
                <SelectItem key={u.id} value={u.id.toString()}>
                  <div className="flex flex-col text-left">
                    <span className="font-medium text-xs">{u.fullName}</span>
                    <span className="text-[10px] text-muted-foreground">{u.email}</span>
                  </div>
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Save Button */}
      <Button
        className="w-full flex items-center justify-center gap-2 mt-2"
        disabled={!canSave || isSaving}
        onClick={() => onSave({ 
          name: name.trim(), 
          email: email.trim(), 
          phone: phone.trim(), 
          managerId: managerId !== "placeholder" ? Number(managerId) : null 
        })}
      >
        {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
        {initial ? "Update Department" : "Save Department"}
      </Button>
    </div>
  );
}