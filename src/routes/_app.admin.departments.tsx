import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { AdminGuard, CrudPage } from "@/components/crud-page";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { DepartmentsApi, type DepartmentEntity } from "@/lib/api/client";

export const Route = createFileRoute("/_app/admin/departments")({
  head: () => ({ meta: [{ title: "Departments — Admin" }] }),
  component: () => <AdminGuard><DepartmentsPage /></AdminGuard>,
});

function DepartmentsPage() {
  const [rows, setRows] = useState<DepartmentEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [page, setPage] = useState<number>(0);
  const [size, setSize] = useState<number>(10);
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

  const handleDelete = async (d: DepartmentEntity) => {
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
    initial: DepartmentEntity | null,
    formData: { name: string },
    close: () => void,
  ) => {
    try {
      setActionLoading(true);
      const res = initial
        ? await DepartmentsApi.update({ id: initial.id, name: formData.name })
        : await DepartmentsApi.add(formData);
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
        <CrudPage<DepartmentEntity>
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
              accessor: (d) => <div className="py-2 text-left font-medium">{d.name}</div>,
              searchValue: (d) => d.name,
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

function DepartmentForm({
  initial, isSaving, onSave,
}: {
  initial: DepartmentEntity | null;
  isSaving: boolean;
  onSave: (data: { name: string }) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Name</Label>
        <Input
          value={name}
          disabled={isSaving}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Finance"
        />
      </div>
      <Button
        className="w-full flex items-center justify-center gap-2"
        disabled={!name.trim() || isSaving}
        onClick={() => onSave({ name: name.trim() })}
      >
        {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
        {initial ? "Update Department" : "Save Department"}
      </Button>
    </div>
  );
}
