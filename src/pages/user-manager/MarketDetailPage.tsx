import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { marketsService, statesService, usersService, storesService } from "@/services";
import type { Market } from "@/lib/api/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Phone,
  ShieldAlert,
  Store,
  User,
} from "lucide-react";

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

  const loadMarketData = async () => {
    if (!id) return;
    try {
      setLoading(true);

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
    </div>
  );
}
