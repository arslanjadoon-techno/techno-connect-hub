import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { AdminGuard, CrudPage } from "@/components/crud-page";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { StatesApi } from "@/lib/api/client";

interface State {
  id: number;
  name: string;
  symbol: string;
  createdAt?: string;
  updatedAt?: string;
}

export const Route = createFileRoute("/_app/admin/states")({
  head: () => ({ meta: [{ title: "States — Admin" }] }),
  component: () => <AdminGuard><StatesPage /></AdminGuard>,
});

function StatesPage() {
  const [states, setStates] = useState<State[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // States for tracking server side pagination parameters
  const [page, setPage] = useState<number>(0);
  const [size, setSize] = useState<number>(10);
  const [totalRecords, setTotalRecords] = useState<number>(0);

  // Synchronous atomic locker to prevent simultaneous duplicate fetches
  const lastFetchedKey = useRef<string>("");
  const isFetchingRef = useRef<boolean>(false);

  // Single dynamic fetch method
  const fetchStates = async (targetPage: number, targetSize: number) => {
    const currentRequestKey = `${targetPage}-${targetSize}`;
    
    if (lastFetchedKey.current === currentRequestKey || isFetchingRef.current) {
      return;
    }
    
    try {
      setLoading(true);
      isFetchingRef.current = true;
      lastFetchedKey.current = currentRequestKey;

      const apiClient = StatesApi.getAll as any;
      const res = await apiClient({ page: targetPage, size: targetSize });
      
      if (res.success) {
        // EDGE CASE FIX: If current page has no data but database has records, fallback to previous page
        if (res.data.length === 0 && res.pagination && res.pagination.totalRecords > 0 && targetPage > 0) {
          const maxAvailablePage = Math.ceil(res.pagination.totalRecords / targetSize) - 1;
          const fallbackPage = Math.max(0, maxAvailablePage);
          
          isFetchingRef.current = false;
          lastFetchedKey.current = "";
          setPage(fallbackPage);
          return;
        }

        setStates(res.data);
        
        if (res.pagination && typeof res.pagination.totalRecords === "number") {
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
      isFetchingRef.current = false;
    }
  };

  // Synchronized effect wrapper to look at exact state adjustments safely
  useEffect(() => {
    fetchStates(page, size);
  }, [page, size]);

  // Delete Call
  const handleDelete = async (s: State) => {
    try {
      setActionLoading(true);
      const res = await StatesApi.delete(s.id);
      if (res.success) {
        toast.success(res.message || "State deleted successfully");
        lastFetchedKey.current = "";
        fetchStates(page, size);
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
    formData: { name: string; symbol: string },
    close: () => void
  ) => {
    try {
      setActionLoading(true);
      if (initial) {
        const res = await StatesApi.update({
          id: initial.id,
          name: formData.name,
          symbol: formData.symbol,
        });
        if (res.success) {
          toast.success(res.message || "State updated successfully");
          lastFetchedKey.current = "";
          fetchStates(page, size);
          close();
        } else {
          toast.error(res.message);
        }
      } else {
        const res = await StatesApi.add(formData);
        if (res.success) {
          toast.success(res.message || "State added successfully");
          lastFetchedKey.current = "";
          fetchStates(page, size);
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

  if (loading && states.length === 0) {
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
        
        {/* NO ERRORS NOW: Clean, strongly-typed component instance */}
        <CrudPage<State>
          title="States"
          subtitle="Manage US states the company operates in."
          rows={states}
          rowKey={(s) => s.id.toString()}
          isSaving={actionLoading}
          isLoading={loading} // Purely accepted now by your updated interface
          
          rowCount={totalRecords}
          page={page}
          pageSize={size}
          onPageChange={(newPage) => setPage(newPage)}
          onPageSizeChange={(newSize) => setSize(newSize)}

          columns={[
            {
              key: "name",
              header: "Name",
              accessor: (s) => <div className="py-2 text-left font-medium">{s.name}</div>,
              searchValue: (s) => s.name
            },
            {
              key: "symbol",
              header: "Symbol (Code)",
              accessor: (s) => <div className="font-mono py-2 text-left text-muted-foreground">{s.symbol}</div>,
              searchValue: (s) => s.symbol
            }
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
  onSave: (data: { name: string; symbol: string }) => void;
}

function StateForm({ initial, isSaving, onSave }: StateFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [symbol, setSymbol] = useState(initial?.symbol ?? "");

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Name</Label>
        <Input
          value={name}
          disabled={isSaving}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Texas"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Symbol</Label>
        <Input
          value={symbol}
          disabled={isSaving}
          onChange={(e) => setSymbol(e.target.value)}
          maxLength={3}
          placeholder="e.g. TX"
        />
      </div>
      <Button
        className="w-full flex items-center justify-center gap-2"
        disabled={!name.trim() || !symbol.trim() || isSaving}
        onClick={() => onSave({ name: name.trim(), symbol: symbol.trim().toUpperCase() })}
      >
        {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
        {initial ? "Update State" : "Save State"}
      </Button>
    </div>
  );
}