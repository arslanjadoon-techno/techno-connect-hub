import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef, useMemo } from "react";
import { AdminGuard, CrudPage } from "@/components/crud-page";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Search } from "lucide-react";
import { DistrictsApi, StatesApi } from "@/lib/api/client"; 

interface District {
  id: number;
  name: string;
  stateId: number;
  createdAt?: string;
  updatedAt?: string;
}

interface State {
  id: number;
  name: string;
  symbol: string;
}

export const Route = createFileRoute("/_app/admin/districts")({
  head: () => ({ meta: [{ title: "Districts — Admin" }] }),
  component: () => <AdminGuard><DistrictsPage /></AdminGuard>,
});

function DistrictsPage() {
  const [districts, setDistricts] = useState<District[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [selectedStateFilter, setSelectedStateFilter] = useState<string>("all");
  
  // Search text state
  const [mainFilterSearch, setMainFilterSearch] = useState("");
  
  // Ref for auto-focusing input on open
  const mainSearchInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const isFetched = useRef(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [districtsRes, statesRes] = await Promise.all([
        DistrictsApi.getAll(),
        StatesApi.getAll()
      ]);

      if (districtsRes.success) {
        setDistricts(districtsRes.data);
      } else {
        toast.error(districtsRes.message || "Failed to load districts");
      }

      if (statesRes.success) {
        setStates(statesRes.data);
      } else {
        toast.error(statesRes.message || "Failed to load states filter options");
      }
    } catch (err: any) {
      toast.error(err?.message || "Something went wrong while fetching data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isFetched.current) return;
    isFetched.current = true;
    fetchData();
  }, []);

  const handleDelete = async (d: District) => {
    try {
      setActionLoading(true);
      const res = await DistrictsApi.delete({ id: d.id });
      if (res.success) {
        toast.success(res.message || "District deleted successfully");
        const freshData = await DistrictsApi.getAll();
        if (freshData.success) setDistricts(freshData.data);
      } else {
        toast.error(res.message || "Could not delete district");
      }
    } catch (err: any) {
      toast.error(err?.message || "Delete failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSave = async (
    initial: District | null,
    formData: { name: string; stateId: number },
    close: () => void
  ) => {
    try {
      setActionLoading(true);
      if (initial) {
        const res = await DistrictsApi.update({
          id: initial.id,
          name: formData.name,
        });
        if (res.success) {
          toast.success(res.message || "District updated successfully");
          const freshData = await DistrictsApi.getAll();
          if (freshData.success) setDistricts(freshData.data);
          close();
        } else {
          toast.error(res.message || "Update failed");
        }
      } else {
        const res = await DistrictsApi.add(formData);
        if (res.success) {
          toast.success(res.message || "District added successfully");
          const freshData = await DistrictsApi.getAll();
          if (freshData.success) setDistricts(freshData.data);
          close();
        } else {
          toast.error(res.message || "Failed to create district");
        }
      }
    } catch (err: any) {
      toast.error(err?.message || "Operation failed");
    } finally {
      setActionLoading(false);
    }
  };

  const getStateName = (id: number) => states.find((s) => s.id === id)?.name ?? "—";

  const filteredDistricts = districts.filter((d) => {
    if (selectedStateFilter === "all") return true;
    return d.stateId === Number(selectedStateFilter);
  });

  const filteredMainStatesOptions = useMemo(() => {
    return states.filter((s) =>
      s.name.toLowerCase().includes(mainFilterSearch.toLowerCase())
    );
  }, [states, mainFilterSearch]);

  if (loading) {
    return (
      <div className="flex h-[50vh] w-full flex-col items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-medium">Loading Districts...</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="w-full border-0 shadow-none bg-transparent [&_input]:bg-white dark:[&_input]:bg-zinc-950 [&_button.w-\[180px\]]:bg-white dark:[&_button.w-\[180px\]]:bg-zinc-950 [&_thead]:bg-zinc-200 dark:[&_thead]:bg-zinc-800 [&_thead]:border-b-2 [&_thead]:border-border [&_th]:font-bold [&_th]:text-zinc-900 dark:[&_th]:text-zinc-100 [&_th]:h-12 [&_tbody_tr]:bg-background [&_tbody_tr]:even:bg-zinc-50/50 dark:[&_tbody_tr]:even:bg-zinc-900/30 [&_tbody_tr]:hover:bg-muted/40 [&_th:last-child]:text-right [&_th:last-child]:pr-10 [&_td:last-child]:text-right [&_td[colspan]]:text-center [&_td[colspan]]:font-medium">
        
        <div className="[&_.flex-col]:flex-row [&_.flex-col]:items-center [&_.flex-col]:justify-between [&_.max-w-sm]:order-last [&_.max-w-sm]:ml-auto">
          <CrudPage<District>
            title="Districts"
            subtitle="Manage districts and map them to operating states."
            rows={filteredDistricts}
            rowKey={(d) => d.id.toString()}
            isSaving={actionLoading}
            
            extraToolbar={
              <div className="relative flex flex-col pt-2.5">
                <span className="absolute -top-1 left-2 bg-background px-1 text-[11px] font-semibold text-muted-foreground z-10">
                  State
                </span>
                
                <Select 
                  value={selectedStateFilter} 
                  onValueChange={setSelectedStateFilter}
                  onOpenChange={(open) => {
                    if (!open) {
                      setMainFilterSearch("");
                    } else {
                      setTimeout(() => mainSearchInputRef.current?.focus(), 100);
                    }
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
                        ref={mainSearchInputRef}
                        placeholder="Search states..."
                        value={mainFilterSearch}
                        onChange={(e) => {
                          setMainFilterSearch(e.target.value);
                          // Re-render ke baad focus instantly maintain rakhne ke liye immediate queue execution
                          setTimeout(() => mainSearchInputRef.current?.focus(), 0);
                        }}
                        className="w-full text-xs bg-transparent outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
                      />
                    </div>
                    
                    <SelectItem value="all">All States</SelectItem>
                    {filteredMainStatesOptions.length === 0 ? (
                      <p className="text-[11px] text-center text-muted-foreground p-2">No matching states</p>
                    ) : (
                      filteredMainStatesOptions.map((s) => (
                        <SelectItem key={s.id} value={s.id.toString()}>
                          {s.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            }
            
            columns={[
              {
                key: "name",
                header: "Name",
                accessor: (d) => <div className="py-2 text-left font-medium">{d.name}</div>,
                searchValue: (d) => d.name,
              },
              {
                key: "state",
                header: "State",
                accessor: (d) => <div className="py-2 text-left text-muted-foreground">{getStateName(d.stateId)}</div>,
                searchValue: (d) => getStateName(d.stateId),
              },
            ]}
            onDelete={handleDelete}
            renderForm={(initial, close) => (
              <DistrictForm
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

interface DistrictFormProps {
  initial: District | null;
  states: State[];
  isSaving: boolean;
  onSave: (data: { name: string; stateId: number }) => void;
}

function DistrictForm({ initial, states, isSaving, onSave }: DistrictFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  
  const [stateId, setStateId] = useState<string>(
    initial?.stateId ? initial.stateId.toString() : ""
  );

  const [formFilterSearch, setFormFilterSearch] = useState("");
  const formSearchInputRef = useRef<HTMLInputElement>(null);

  const filteredFormStatesOptions = useMemo(() => {
    return states.filter((s) =>
      s.name.toLowerCase().includes(formFilterSearch.toLowerCase())
    );
  }, [states, formFilterSearch]);

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Name</Label>
        <Input
          value={name}
          disabled={isSaving}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Jefferson"
        />
      </div>
      
      <div className="space-y-1.5">
        <Label>State</Label>
        <Select 
          value={stateId} 
          disabled={isSaving || !!initial} 
          onValueChange={setStateId}
          onOpenChange={(open) => {
            if (!open) {
              setFormFilterSearch("");
            } else {
              setTimeout(() => formSearchInputRef.current?.focus(), 100);
            }
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
                ref={formSearchInputRef}
                placeholder="Search states..."
                value={formFilterSearch}
                onChange={(e) => {
                  setFormFilterSearch(e.target.value);
                  setTimeout(() => formSearchInputRef.current?.focus(), 0);
                }}
                className="w-full text-xs bg-transparent outline-none placeholder:text-muted-foreground"
              />
            </div>

            {filteredFormStatesOptions.length === 0 ? (
              <p className="text-[11px] text-center text-muted-foreground p-2">No matching states</p>
            ) : (
              filteredFormStatesOptions.map((s) => (
                <SelectItem key={s.id} value={s.id.toString()}>
                  {s.name}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      <Button
        className="w-full flex items-center justify-center gap-2"
        disabled={!name.trim() || !stateId || isSaving}
        onClick={() => onSave({ name: name.trim(), stateId: Number(stateId) })}
      >
        {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
        {initial ? "Update District" : "Save District"}
      </Button>
    </div>
  );
}