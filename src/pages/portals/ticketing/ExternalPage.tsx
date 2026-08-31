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
import { Loader2, Search, XCircle } from "lucide-react";
import { ExternalTeamApi, MarketsApi } from "@/lib/api/client";

interface ExternalVendor {
  id: number;
  name: string;
  phone: string;
  marketId: number;
  address: string;
  workNature: string;
  createdAt?: string;
  updatedAt?: string;
}

interface Market {
  id: number;
  name: string;
}

export default function ExternalPage() {
  const [vendors, setVendors] = useState<ExternalVendor[]>([]);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [selectedMarketFilter, setSelectedMarketFilter] = useState<string>("all");

  const [mainMarketSearch, setMainMarketSearch] = useState("");
  const mainMarketSearchRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Pagination states
  const [page, setPage] = useState<number>(0);
  const [size, setSize] = useState<number>(15);
  const [totalRecords, setTotalRecords] = useState<number>(0);

  const lastFetchedKey = useRef<string>("");
  const isFetchingRef = useRef<boolean>(false);
  const initialMarketsFetchedRef = useRef<boolean>(false);

  // Core Orchestrator to Fetch Vendors (Paginated + Filtered by single Market Dropdown)
  const fetchVendors = async (targetPage: number, targetSize: number, targetMarket: string) => {
    const currentRequestKey = `${targetPage}-${targetSize}-${targetMarket}`;

    if (lastFetchedKey.current === currentRequestKey || isFetchingRef.current) {
      return;
    }

    try {
      setLoading(true);
      isFetchingRef.current = true;
      lastFetchedKey.current = currentRequestKey;

      // Lazy load all markets lookup strictly once on mount
      if (!initialMarketsFetchedRef.current) {
        const marketsRes = await MarketsApi.getAll();
        if (marketsRes.success) {
          setMarkets(marketsRes.data);
          initialMarketsFetchedRef.current = true;
        }
      }

      const apiClient = ExternalTeamApi.getAll as any;
      const res = await apiClient({
        page: targetPage,
        size: targetSize,
        market: targetMarket !== "all" ? targetMarket : undefined,
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

        setVendors(res.data);
        setTotalRecords(res.pagination?.totalRecords ?? res.data.length);
      } else {
        toast.error(res.message || "Failed to load vendors");
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
    fetchVendors(page, size, selectedMarketFilter);
  }, [page, size, selectedMarketFilter]);

  const handleMarketFilterChange = (newMarket: string) => {
    lastFetchedKey.current = "";
    setPage(0);
    setSelectedMarketFilter(newMarket);
  };

  const handleResetFilters = () => {
    if (selectedMarketFilter === "all") return;
    lastFetchedKey.current = "";
    setPage(0);
    setSelectedMarketFilter("all");
    toast.success("Filters cleared successfully");
  };

  const handleDelete = async (v: ExternalVendor) => {
    try {
      setActionLoading(true);
      const res = await ExternalTeamApi.delete({ id: v.id });
      if (res.success) {
        toast.success(res.message || "Vendor removed successfully");
        lastFetchedKey.current = "";
        fetchVendors(page, size, selectedMarketFilter);
      } else {
        toast.error(res.message || "Could not delete vendor");
      }
    } catch (err: any) {
      toast.error(err?.message || "Delete failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSave = async (
    initial: ExternalVendor | null,
    formData: {
      name: string;
      phone: string;
      marketId: number;
      address: string;
      workNature: string;
    },
    close: () => void,
  ) => {
    try {
      setActionLoading(true);
      if (initial) {
        const res = await ExternalTeamApi.update({
          id: initial.id,
          name: formData.name,
          phone: formData.phone,
          address: formData.address,
          workNature: formData.workNature,
        });
        if (res.success) {
          toast.success(res.message || "Vendor updated successfully");
          lastFetchedKey.current = "";
          fetchVendors(page, size, selectedMarketFilter);
          close();
        } else {
          toast.error(res.message || "Update failed");
        }
      } else {
        const res = await ExternalTeamApi.add(formData);
        if (res.success) {
          toast.success(res.message || "Vendor added successfully");
          lastFetchedKey.current = "";
          fetchVendors(page, size, selectedMarketFilter);
          close();
        } else {
          toast.error(res.message || "Failed to create vendor");
        }
      }
    } catch (err: any) {
      toast.error(err?.message || "Operation failed");
    } finally {
      setActionLoading(false);
    }
  };

  const getMarketName = (id: number) => markets.find((m) => m.id === id)?.name ?? "—";

  const filteredMainMarketsOptions = useMemo(() => {
    return markets.filter((m) => m.name.toLowerCase().includes(mainMarketSearch.toLowerCase()));
  }, [markets, mainMarketSearch]);

  if (loading && vendors.length === 0) {
    return (
      <div className="flex h-[50vh] w-full flex-col items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-medium">Loading External Vendor Network...</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="w-full border-0 shadow-none bg-transparent [&_input]:bg-white dark:[&_input]:bg-zinc-950 [&_button.w-\[180px\]]:bg-white dark:[&_button.w-\[180px\]]:bg-zinc-950 [&_thead]:bg-zinc-200 dark:[&_thead]:bg-zinc-800 [&_thead]:border-b-2 [&_thead]:border-border [&_th]:font-bold [&_th]:text-zinc-900 dark:[&_th]:text-zinc-100 [&_th]:h-12 [&_tbody_tr]:bg-background [&_tbody_tr]:even:bg-zinc-50/50 dark:[&_tbody_tr]:even:bg-zinc-900/30 [&_tbody_tr]:hover:bg-muted/40 [&_th:last-child]:text-right [&_th:last-child]:pr-10 [&_td:last-child]:text-right [&_td[colspan]]:text-center [&_td[colspan]]:font-medium">
        <div className="[&_.flex-col]:flex-row [&_.flex-col]:items-center [&_.flex-col]:justify-between [&_.max-w-sm]:order-last [&_.max-w-sm]:ml-auto">
          <CrudPage<ExternalVendor>
            title="External Team"
            subtitle="Vendors hired for overflow maintenance, repairs and other on-demand work."
            rows={vendors}
            rowKey={(v) => v.id.toString()}
            isSaving={actionLoading}
            isLoading={loading}
            createLabel="Add Vendor"

            rowCount={totalRecords}
            page={page}
            pageSize={size}
            onPageChange={(newPage) => setPage(newPage)}
            onPageSizeChange={(newSize) => setSize(newSize)}

            extraToolbar={
              <div className="flex items-end gap-3 pb-0.5">
                {/* SINGLE ALL MARKETS FILTER */}
                <div className="relative flex flex-col pt-2.5">
                  <span className="absolute -top-1 left-2 bg-background px-1 text-[11px] font-semibold text-muted-foreground z-10">
                    Market
                  </span>
                  <Select
                    value={selectedMarketFilter}
                    onValueChange={handleMarketFilterChange}
                    onOpenChange={(open) => {
                      if (!open) setMainMarketSearch("");
                      else setTimeout(() => mainMarketSearchRef.current?.focus(), 100);
                    }}
                  >
                    <SelectTrigger className="w-[180px] h-9 focus:ring-0 border-muted-foreground/40">
                      <SelectValue placeholder="Filter by Market" />
                    </SelectTrigger>
                    <SelectContent
                      onKeyDown={(e) => e.stopPropagation()}
                      onKeyUp={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center px-2 py-1.5 border-b sticky top-0 bg-popover z-10">
                        <Search className="h-3.5 w-3.5 mr-2 text-muted-foreground shrink-0" />
                        <input
                          ref={mainMarketSearchRef}
                          placeholder="Search markets..."
                          value={mainMarketSearch}
                          onChange={(e) => {
                            setMainMarketSearch(e.target.value);
                            setTimeout(() => mainMarketSearchRef.current?.focus(), 0);
                          }}
                          className="w-full text-xs bg-transparent outline-none placeholder:text-muted-foreground"
                        />
                      </div>
                      <SelectItem value="all">All Markets</SelectItem>
                      {filteredMainMarketsOptions.map((m) => (
                        <SelectItem key={m.id} value={m.id.toString()}>
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={selectedMarketFilter === "all"}
                  onClick={handleResetFilters}
                  className="h-9 px-3 text-xs font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 border border-dashed border-muted-foreground/30 disabled:opacity-40 transition-all duration-300 ease-out group active:scale-95"
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
                accessor: (v) => <div className="py-2 text-left font-medium">{v.name}</div>,
                searchValue: (v) => v.name,
              },
              {
                key: "phone",
                header: "Phone",
                accessor: (v) => (
                  <div className="py-2 text-left text-muted-foreground">{v.phone}</div>
                ),
                searchValue: (v) => v.phone,
              },
              {
                key: "market",
                header: "Market",
                accessor: (v) => (
                  <div className="py-2 text-left text-zinc-700 dark:text-zinc-300 font-medium">
                    {getMarketName(v.marketId)}
                  </div>
                ),
                searchValue: (v) => getMarketName(v.marketId),
              },
              {
                key: "address",
                header: "Address",
                accessor: (v) => (
                  <div className="py-2 text-left text-muted-foreground max-w-[200px] truncate">
                    {v.address || "—"}
                  </div>
                ),
                searchValue: (v) => v.address,
              },
              {
                key: "nature",
                header: "Nature of work",
                accessor: (v) => (
                  <div className="py-2 text-left text-zinc-600 dark:text-zinc-400 font-medium">
                    {v.workNature}
                  </div>
                ),
                searchValue: (v) => v.workNature,
              },
            ]}
            onDelete={handleDelete}
            renderForm={(initial, close) => (
              <VendorForm
                initial={initial}
                markets={markets}
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

// ---------------- CLEAN VENDOR FORM COMPONENTS ----------------
interface VendorFormProps {
  initial: ExternalVendor | null;
  markets: Market[];
  isSaving: boolean;
  onSave: (data: {
    name: string;
    phone: string;
    marketId: number;
    address: string;
    workNature: string;
  }) => void;
}

function VendorForm({ initial, markets, isSaving, onSave }: VendorFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [workNature, setWorkNature] = useState(initial?.workNature ?? "");
  const [marketId, setMarketId] = useState<string>(
    initial?.marketId ? initial.marketId.toString() : "",
  );

  const [marketSearch, setMarketSearch] = useState("");
  const marketSearchRef = useRef<HTMLInputElement>(null);

  const filteredMarkets = useMemo(
    () => markets.filter((m) => m.name.toLowerCase().includes(marketSearch.toLowerCase())),
    [markets, marketSearch],
  );

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Vendor Name</Label>
        <Input
          value={name}
          disabled={isSaving}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Acme Tech Repairs"
        />
      </div>

      <div className="space-y-1.5">
        <Label>Phone Number</Label>
        <Input
          value={phone}
          disabled={isSaving}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="e.g. +1 (555) 019-2834"
        />
      </div>

      {/* DIRECT UNLOCKED MARKET DROP-DOWN */}
      <div className="space-y-1.5">
        <Label>Market</Label>
        <Select
          value={marketId}
          disabled={isSaving}
          onValueChange={setMarketId}
          onOpenChange={(open) => {
            if (!open) setMarketSearch("");
            else setTimeout(() => marketSearchRef.current?.focus(), 100);
          }}
        >
          <SelectTrigger className="w-full bg-white dark:bg-zinc-950">
            <SelectValue placeholder="Select operating market" />
          </SelectTrigger>
          <SelectContent
            onKeyDown={(e) => e.stopPropagation()}
            onKeyUp={(e) => e.stopPropagation()}
          >
            <div className="flex items-center px-2 py-1.5 border-b sticky top-0 bg-popover z-10">
              <Search className="h-3.5 w-3.5 mr-2 text-muted-foreground shrink-0" />
              <input
                ref={marketSearchRef}
                placeholder="Search markets..."
                value={marketSearch}
                onChange={(e) => {
                  setMarketSearch(e.target.value);
                  setTimeout(() => marketSearchRef.current?.focus(), 0);
                }}
                className="w-full text-xs bg-transparent outline-none placeholder:text-muted-foreground"
              />
            </div>
            {filteredMarkets.length === 0 ? (
              <p className="text-[11px] text-center text-muted-foreground p-2">No markets found</p>
            ) : (
              filteredMarkets.map((m) => (
                <SelectItem key={m.id} value={m.id.toString()}>
                  {m.name}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>Address</Label>
        <Input
          value={address}
          disabled={isSaving}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Physical workshop location"
        />
      </div>

      <div className="space-y-1.5">
        <Label>Nature of Work</Label>
        <Input
          value={workNature}
          disabled={isSaving}
          onChange={(e) => setWorkNature(e.target.value)}
          placeholder="e.g. HVAC repair, Commercial Plumbing"
        />
      </div>

      <Button
        className="w-full flex items-center justify-center gap-2"
        disabled={!name.trim() || !phone.trim() || !marketId || !workNature.trim() || isSaving}
        onClick={() =>
          onSave({
            name: name.trim(),
            phone: phone.trim(),
            marketId: Number(marketId),
            address: address.trim(),
            workNature: workNature.trim(),
          })
        }
      >
        {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
        {initial ? "Update Vendor" : "Save Vendor"}
      </Button>
    </div>
  );
}
