import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { marketsService, statesService, usersService, storesService } from "@/services";
import type { Market } from "@/lib/api/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Eye,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  RefreshCw,
  Search,
  ShieldAlert,
  Store,
  User,
  X,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface StateInfo {
  id: number;
  name: string;
  symbol?: string;
  email?: string;
  phone?: string;
  managerName?: string;
  assignedUsers?: Array<{ id: number; name: string; email?: string; phone?: string }>;
}

interface ManagerInfo {
  id?: number;
  name?: string;
  email?: string;
  phone?: string;
  department?: string;
}

interface StoreItem {
  id: number;
  name: string;
  number?: string | null;
  address?: string;
  phone?: string;
}

export default function MarketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [market, setMarket] = useState<Market | null>(null);
  const [stateDetails, setStateDetails] = useState<StateInfo | null>(null);
  const [managerDetails, setManagerDetails] = useState<ManagerInfo | null>(null);
  const [associatedStores, setAssociatedStores] = useState<StoreItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // States for Edit dialog
  const [statesList, setStatesList] = useState<Array<{ id: number; name: string }>>([]);

  const loadMarketData = async (isManualRefresh = false) => {
    if (!id) return;
    try {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);

      // 1. Fetch Market
      const marketRes = await marketsService.get(id);
      if (!marketRes.success || !marketRes.data) {
        toast.error(marketRes.message || "Failed to load market");
        setMarket(null);
        return;
      }

      const marketData = marketRes.data;
      setMarket(marketData);

      // 2. Fetch Market Manager Details if assigned
      const assignedMgr = marketData.assignedUsers?.[0];
      if (assignedMgr?.id) {
        try {
          const userRes = await usersService.get(assignedMgr.id);
          if (userRes.success && userRes.data) {
            setManagerDetails({
              id: userRes.data.id,
              name: userRes.data.fullName || assignedMgr.name,
              email: userRes.data.email || assignedMgr.email || "",
              phone: userRes.data.phone || assignedMgr.phone || "",
              department: (userRes.data as any).department?.name,
            });
          } else {
            setManagerDetails({
              id: assignedMgr.id,
              name: assignedMgr.name,
              email: assignedMgr.email || marketData.email || "",
              phone: assignedMgr.phone || marketData.phone || "",
            });
          }
        } catch {
          setManagerDetails({
            id: assignedMgr.id,
            name: assignedMgr.name,
            email: assignedMgr.email || marketData.email || "",
            phone: assignedMgr.phone || marketData.phone || "",
          });
        }
      } else if (marketData.manager || marketData.email || marketData.phone) {
        setManagerDetails({
          name: marketData.manager || "—",
          email: marketData.email || "",
          phone: marketData.phone || "",
        });
      } else {
        setManagerDetails(null);
      }

      // 3. Fetch Operating State Details & State Manager
      if (marketData.state?.id) {
        try {
          const stateRes = await statesService.get(marketData.state.id);
          if (stateRes.success && stateRes.data) {
            const s = stateRes.data;
            const stateMgr = s.assignedUsers?.[0];
            setStateDetails({
              id: s.id,
              name: s.name,
              symbol: s.symbol,
              email: s.email || stateMgr?.email || "",
              phone: s.phone || stateMgr?.phone || "",
              managerName: stateMgr?.name || s.manager || "",
              assignedUsers: s.assignedUsers,
            });
          }
        } catch (err) {
          console.error("Failed to load state details:", err);
          setStateDetails({
            id: marketData.state.id,
            name: marketData.state.name,
          });
        }
      }

      // 4. Fetch Associated Stores for this market
      try {
        const storesRes = await storesService.getAll({ market: marketData.name });
        if (storesRes.success && Array.isArray(storesRes.data)) {
          setAssociatedStores(
            storesRes.data.map((s) => ({
              id: s.id,
              name: s.name,
              number: s.number,
              address: s.address,
              phone: s.phone,
            })),
          );
        }
      } catch (err) {
        console.error("Failed to fetch stores for market:", err);
      }

      if (isManualRefresh) {
        toast.success("Market details refreshed");
      }
    } catch (err: any) {
      toast.error(err?.message || "Something went wrong loading market");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadMarketData();
  }, [id]);

  // Load states for edit modal
  useEffect(() => {
    if (!editOpen) return;
    (async () => {
      try {
        const res = await statesService.getAll();
        if (res.success && Array.isArray(res.data)) {
          setStatesList(res.data.map((s) => ({ id: s.id, name: s.name })));
        }
      } catch (err) {
        console.error("Failed to fetch states list:", err);
      }
    })();
  }, [editOpen]);

  const formatDate = (isoString?: string) => {
    if (!isoString) return "—";
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return "—";
      return d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoString;
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] w-full flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="h-9 w-9 animate-spin text-primary" />
        <p className="text-sm font-medium">Loading Market Details...</p>
      </div>
    );
  }

  if (!market) {
    return (
      <div className="mx-auto max-w-xl py-20 text-center space-y-4">
        <ShieldAlert className="h-12 w-12 text-destructive mx-auto" />
        <h2 className="text-xl font-semibold">Market Not Found</h2>
        <p className="text-sm text-muted-foreground">
          The requested market could not be loaded or may have been deleted.
        </p>
        <Button
          onClick={() => navigate("/admin/markets")}
          variant="outline"
          className="cursor-pointer"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Markets
        </Button>
      </div>
    );
  }

  const assignedUsersCount = market.assignedUsers?.length ?? 0;

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Top Navigation & Action Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/admin/markets")}
              className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer -ml-2"
            >
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back to Markets
            </Button>
            <span className="text-xs text-muted-foreground">/</span>
            <span className="text-xs text-muted-foreground font-mono">Market #{market.id}</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
              {market.name}
            </h1>
            <Badge
              variant="outline"
              className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs"
            >
              <CheckCircle2 className="mr-1 h-3 w-3" /> Active Market
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadMarketData(true)}
            disabled={refreshing}
            className="cursor-pointer h-9 text-xs"
          >
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => setEditOpen(true)}
            className="cursor-pointer h-9 text-xs flex items-center gap-1.5"
          >
            <Pencil className="h-3.5 w-3.5" /> Edit Market
          </Button>
        </div>
      </div>

      {/* Highlights Summary Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Market Name */}
        <Card className="shadow-xs border-border/60">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Market Name
              </p>
              <p className="text-sm font-semibold truncate text-foreground">{market.name}</p>
            </div>
          </CardContent>
        </Card>

        {/* KPI 2: Operating State */}
        <Card className="shadow-xs border-border/60">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
              <MapPin className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Operating State
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <p className="text-sm font-semibold truncate text-foreground">
                  {market.state?.name || "Not Assigned"}
                </p>
                {stateDetails?.symbol && (
                  <Badge variant="secondary" className="font-mono text-[10px] px-1.5 py-0 h-4">
                    {stateDetails.symbol}
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI 3: Market Manager Status */}
        <Card className="shadow-xs border-border/60">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
              <User className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Market Manager
              </p>
              <p className="text-sm font-semibold truncate text-foreground">
                {managerDetails?.name || "Unassigned"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* KPI 4: Associated Stores */}
        <Card className="shadow-xs border-border/60">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
              <Store className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Associated Stores
              </p>
              <p className="text-sm font-semibold text-foreground">
                {associatedStores.length} {associatedStores.length === 1 ? "Store" : "Stores"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main 2-Column Detail Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CARD 1: Market Manager Details */}
        <Card className="border-border/60 shadow-xs">
          <CardHeader className="pb-3 border-b bg-muted/20">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <User className="h-4 w-4 text-primary" /> Market Manager
              </CardTitle>
              {managerDetails ? (
                <Badge
                  variant="outline"
                  className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[11px]"
                >
                  Assigned
                </Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground text-[11px]">
                  Unassigned
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            {managerDetails ? (
              <>
                <div className="flex items-center gap-3 pb-3 border-b border-border/50">
                  <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-base uppercase shrink-0">
                    {managerDetails.name?.slice(0, 2) || "MM"}
                  </div>
                  <div>
                    <h3 className="font-semibold text-base text-foreground">
                      {managerDetails.name}
                    </h3>
                    {managerDetails.department && (
                      <p className="text-xs text-muted-foreground">{managerDetails.department}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div className="space-y-1">
                    <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground" /> Email Address
                    </span>
                    {managerDetails.email ? (
                      <a
                        href={`mailto:${managerDetails.email}`}
                        className="text-xs font-medium text-primary hover:underline block truncate"
                        title={managerDetails.email}
                      >
                        {managerDetails.email}
                      </a>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">No email on record</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground" /> Phone Number
                    </span>
                    {managerDetails.phone ? (
                      <a
                        href={`tel:${managerDetails.phone}`}
                        className="text-xs font-mono font-medium text-foreground hover:underline block truncate"
                      >
                        {managerDetails.phone}
                      </a>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">No phone on record</p>
                    )}
                  </div>
                </div>

                {/* Additional Assigned Team Members list if any */}
                {assignedUsersCount > 1 && (
                  <div className="pt-3 border-t border-border/50">
                    <span className="text-[11px] font-medium text-muted-foreground block mb-2">
                      Additional Assigned Team ({assignedUsersCount - 1})
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {market.assignedUsers?.slice(1).map((u) => (
                        <Badge
                          key={u.id}
                          variant="secondary"
                          className="text-[11px] font-normal py-0.5"
                        >
                          {u.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="py-8 text-center space-y-2">
                <User className="h-8 w-8 text-muted-foreground/40 mx-auto" />
                <p className="text-xs text-muted-foreground">
                  No manager currently assigned to this market.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditOpen(true)}
                  className="cursor-pointer text-xs h-8"
                >
                  <Pencil className="mr-1.5 h-3 w-3" /> Assign Manager
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* CARD 2: Operating State & State Manager Details */}
        <Card className="border-border/60 shadow-xs">
          <CardHeader className="pb-3 border-b bg-muted/20">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <MapPin className="h-4 w-4 text-blue-600 dark:text-blue-400" /> Operating State &
                Manager
              </CardTitle>
              {market.state ? (
                <Badge
                  variant="outline"
                  className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 text-[11px]"
                >
                  State Linked
                </Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground text-[11px]">
                  No State
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            {market.state ? (
              <>
                <div className="flex items-center justify-between pb-3 border-b border-border/50">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-base uppercase shrink-0">
                      {stateDetails?.symbol || "ST"}
                    </div>
                    <div>
                      <h3 className="font-semibold text-base text-foreground">
                        {stateDetails?.name || market.state.name}
                      </h3>
                      <p className="text-xs text-muted-foreground">State ID: {market.state.id}</p>
                    </div>
                  </div>
                  {stateDetails?.symbol && (
                    <Badge variant="secondary" className="font-mono text-xs px-2.5 py-1">
                      {stateDetails.symbol}
                    </Badge>
                  )}
                </div>

                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">
                      State Manager Details
                    </span>
                    {stateDetails?.managerName ? (
                      <Badge
                        variant="outline"
                        className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px]"
                      >
                        Active Manager
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground text-[10px]">
                        Unassigned
                      </Badge>
                    )}
                  </div>

                  <div className="rounded-lg bg-muted/30 p-3.5 space-y-2.5 border border-border/40">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground">Manager Name:</span>
                      <span className="text-xs font-semibold text-foreground">
                        {stateDetails?.managerName || "—"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Mail className="h-3 w-3" /> Email:
                      </span>
                      {stateDetails?.email ? (
                        <a
                          href={`mailto:${stateDetails.email}`}
                          className="text-xs font-medium text-primary hover:underline truncate max-w-[200px]"
                          title={stateDetails.email}
                        >
                          {stateDetails.email}
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">—</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" /> Phone:
                      </span>
                      {stateDetails?.phone ? (
                        <a
                          href={`tel:${stateDetails.phone}`}
                          className="text-xs font-mono font-medium text-foreground hover:underline"
                        >
                          {stateDetails.phone}
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">—</span>
                      )}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="py-8 text-center space-y-2">
                <MapPin className="h-8 w-8 text-muted-foreground/40 mx-auto" />
                <p className="text-xs text-muted-foreground">
                  No operating state linked to this market.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* CARD 3: Market Metadata & Operational Info */}
      <Card className="border-border/60 shadow-xs">
        <CardHeader className="pb-3 border-b bg-muted/20">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Clock className="h-4 w-4 text-primary" /> Market Overview & System Information
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <span className="text-[11px] font-medium text-muted-foreground">Market ID</span>
              <p className="text-xs font-mono font-semibold text-foreground">#{market.id}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[11px] font-medium text-muted-foreground">Market Name</span>
              <p className="text-xs font-semibold text-foreground">{market.name}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Created At
              </span>
              <p className="text-xs text-foreground">{formatDate(market.createdAt)}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" /> Last Updated
              </span>
              <p className="text-xs text-foreground">{formatDate(market.updatedAt)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CARD 4: Stores mapped to this Market */}
      {associatedStores.length > 0 && (
        <Card className="border-border/60 shadow-xs">
          <CardHeader className="pb-3 border-b bg-muted/20">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Store className="h-4 w-4 text-purple-600 dark:text-purple-400" /> Associated Stores
                ({associatedStores.length})
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/admin/stores")}
                className="text-xs h-7 cursor-pointer"
              >
                View all stores &rarr;
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {associatedStores.map((store) => (
                <div
                  key={store.id}
                  className="rounded-lg border border-border/50 bg-card p-3 space-y-1 hover:border-primary/40 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-foreground truncate">
                      {store.name}
                    </span>
                    {store.number && (
                      <Badge variant="outline" className="font-mono text-[10px] px-1 py-0">
                        {store.number}
                      </Badge>
                    )}
                  </div>
                  {store.address && (
                    <p className="text-[11px] text-muted-foreground truncate" title={store.address}>
                      {store.address}
                    </p>
                  )}
                  {store.phone && (
                    <p className="text-[11px] text-muted-foreground font-mono">{store.phone}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* EDIT MARKET INLINE DIALOG */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Market Details</DialogTitle>
          </DialogHeader>
          {market && (
            <MarketDetailEditForm
              market={market}
              states={statesList}
              isSaving={actionLoading}
              onClose={() => setEditOpen(false)}
              onSaved={() => {
                setEditOpen(false);
                loadMarketData(true);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ----------------------------------------------------------------------
// INLINE EDIT FORM FOR MARKET DETAIL
// ----------------------------------------------------------------------

interface MarketDetailEditFormProps {
  market: Market;
  states: Array<{ id: number; name: string }>;
  isSaving: boolean;
  onClose: () => void;
  onSaved: () => void;
}

function MarketDetailEditForm({
  market,
  states,
  isSaving: parentSaving,
  onClose,
  onSaved,
}: MarketDetailEditFormProps) {
  const initialUser = market.assignedUsers?.[0];
  const [name, setName] = useState(market.name);
  const [stateId, setStateId] = useState(market.state?.id?.toString() || "");

  const [managerId, setManagerId] = useState<number | null>(
    initialUser?.id ?? (market.managerId && market.managerId > 0 ? market.managerId : null),
  );
  const [manager, setManager] = useState<string>(initialUser?.name ?? market.manager ?? "");
  const [email, setEmail] = useState<string>(initialUser?.email ?? market.email ?? "");
  const [phone, setPhone] = useState<string>(initialUser?.phone ?? market.phone ?? "");

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    Array<{ id: number; fullName: string; email?: string; phone?: string }>
  >([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    let active = true;
    const fetchUsers = async () => {
      if (!isOpen && !debouncedSearchQuery) return;
      setLoadingUsers(true);
      try {
        const res = await usersService.search({ search: debouncedSearchQuery });
        if (active && res.success && Array.isArray(res.data)) {
          setSearchResults(
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

  const handleRemoveManager = () => {
    setManagerId(null);
    setManager("");
    setEmail("");
    setPhone("");
    setSearchQuery("");
  };

  const handleUpdate = async () => {
    try {
      setSaving(true);
      const isManagerSelected = managerId && Number(managerId) > 0;
      const payload = {
        id: market.id,
        name: name.trim(),
        stateId: stateId ? Number(stateId) : market.state?.id || 0,
        districtId: market.district?.id,
        managerId: isManagerSelected ? Number(managerId) : null,
        email: isManagerSelected && email && email.trim() ? email.trim() : null,
        phone: isManagerSelected && phone && phone.trim() ? phone.trim() : null,
      };

      const res = await marketsService.update(payload);
      if (res.success) {
        toast.success(res.message || "Market updated successfully");
        onSaved();
      } else {
        toast.error(res.message || "Failed to update market");
      }
    } catch (err: any) {
      toast.error(err?.message || "Operation failed");
    } finally {
      setSaving(false);
    }
  };

  const isSaving = saving || parentSaving;

  return (
    <div className="space-y-4 pt-2">
      <div className="space-y-1.5">
        <Label>Market Name</Label>
        <Input
          value={name}
          disabled={isSaving}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label>Operating State</Label>
        <Select value={stateId} onValueChange={setStateId} disabled={isSaving}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select State" />
          </SelectTrigger>
          <SelectContent>
            {states.map((s) => (
              <SelectItem key={s.id} value={s.id.toString()}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* MANAGER SEARCHBOX */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label>Manager (Optional)</Label>
          {managerId && (
            <button
              type="button"
              onClick={handleRemoveManager}
              disabled={isSaving}
              className="text-xs text-destructive hover:underline cursor-pointer flex items-center gap-1 font-medium"
            >
              <X className="h-3 w-3" /> Remove manager
            </button>
          )}
        </div>

        {managerId ? (
          <div className="flex items-center justify-between rounded-md border border-input bg-muted/40 px-3 py-2">
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-xs text-foreground truncate">{manager}</span>
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                {email ? <span>{email}</span> : <span className="italic">No email</span>}
                {phone && <span>• {phone}</span>}
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isSaving}
              onClick={handleRemoveManager}
              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full cursor-pointer ml-2"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
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
                placeholder="Search user to assign as manager..."
                className="pl-9 pr-9"
              />
              {loadingUsers && (
                <Loader2 className="absolute right-3 h-4 w-4 animate-spin text-muted-foreground pointer-events-none" />
              )}
            </div>

            {isOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 max-h-56 overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-lg z-50 py-1">
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
        <Label>Manager Email (Optional)</Label>
        <Input
          type="email"
          value={email}
          disabled={isSaving}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="e.g. manager@email.com"
        />
      </div>

      <div className="space-y-1.5">
        <Label>Manager Phone (Optional)</Label>
        <Input
          value={phone}
          disabled={isSaving}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="e.g. +1 234 567 8900"
        />
      </div>

      <div className="flex items-center justify-end gap-2 pt-2">
        <Button variant="outline" type="button" onClick={onClose} disabled={isSaving}>
          Cancel
        </Button>
        <Button type="button" onClick={handleUpdate} disabled={!name.trim() || isSaving}>
          {isSaving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
          Save Changes
        </Button>
      </div>
    </div>
  );
}
