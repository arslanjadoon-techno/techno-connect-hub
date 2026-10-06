import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { marketsService, storesService } from "@/services";
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
  Loader2,
  Mail,
  MapPin,
  Phone,
  ShieldAlert,
  Store,
  User,
  Users,
} from "lucide-react";

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
  const [associatedStores, setAssociatedStores] = useState<StoreItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadMarketData = async () => {
    if (!id) return;
    try {
      setLoading(true);

      // 1. Fetch Market directly from /api/markets/:id
      const marketRes = await marketsService.get(id);
      if (!marketRes.success || !marketRes.data) {
        toast.error(marketRes.message || "Failed to load market");
        setMarket(null);
        return;
      }

      const marketData = marketRes.data;
      setMarket(marketData);

      // 2. Fetch Associated Stores for this market
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
    } catch (err: any) {
      toast.error(err?.message || "Something went wrong loading market");
    } finally {
      setLoading(false);
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

  // Market Manager extracted strictly from market data
  const assignedMgr = market.assignedUsers?.[0];
  const marketManagerName = assignedMgr?.name || (market as any).manager || "—";
  const marketManagerEmail = (assignedMgr as any)?.email || (market as any).email || "—";
  const marketManagerPhone = (assignedMgr as any)?.phone || (market as any).phone || "—";
  const hasMarketManager = marketManagerName !== "—";

  // State Manager extracted strictly from market data (market.state)
  const stateObj = market.state as any;
  const stateName = stateObj?.name || "—";
  const stateManagerName = stateObj?.manager || stateObj?.assignedUsers?.[0]?.name || "—";
  const stateManagerEmail = stateObj?.email || stateObj?.assignedUsers?.[0]?.email || "—";
  const stateManagerPhone = stateObj?.phone || stateObj?.assignedUsers?.[0]?.phone || "—";
  const hasStateManager = stateManagerName !== "—";

  const assignedUsersCount = market.assignedUsers?.length ?? 0;

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Top Navigation Header */}
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

      {/* Highlights Summary Row - 4 Distinct Soft Background Tints */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Market Name - Soft Blue Tint */}
        <Card className="shadow-xs bg-blue-50/70 dark:bg-blue-950/20 border-blue-200/60 dark:border-blue-900/40 transition-all hover:shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Building2 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-blue-700/80 dark:text-blue-300/80 uppercase tracking-wider">
                Market Name
              </p>
              <p className="text-sm font-bold truncate text-foreground mt-0.5">{market.name}</p>
            </div>
          </CardContent>
        </Card>

        {/* KPI 2: Operating State - Soft Emerald Tint */}
        <Card className="shadow-xs bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-900/40 transition-all hover:shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <MapPin className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-emerald-700/80 dark:text-emerald-300/80 uppercase tracking-wider">
                Operating State
              </p>
              <p className="text-sm font-bold truncate text-foreground mt-0.5">{stateName}</p>
            </div>
          </CardContent>
        </Card>

        {/* KPI 3: Market Manager - Soft Purple Tint */}
        <Card className="shadow-xs bg-purple-50/70 dark:bg-purple-950/20 border-purple-200/60 dark:border-purple-900/40 transition-all hover:shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <User className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-purple-700/80 dark:text-purple-300/80 uppercase tracking-wider">
                Market Manager
              </p>
              <p className="text-sm font-bold truncate text-foreground mt-0.5">{marketManagerName}</p>
            </div>
          </CardContent>
        </Card>

        {/* KPI 4: Associated Stores - Soft Amber Tint */}
        <Card className="shadow-xs bg-amber-50/70 dark:bg-amber-950/20 border-amber-200/60 dark:border-amber-900/40 transition-all hover:shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Store className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-amber-700/80 dark:text-amber-300/80 uppercase tracking-wider">
                Associated Stores
              </p>
              <p className="text-sm font-bold text-foreground mt-0.5">
                {associatedStores.length} {associatedStores.length === 1 ? "Store" : "Stores"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main 2-Column Detail Cards Grid: Identical Structure for Market Manager & State Manager */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CARD 1: Market Manager Details */}
        <Card className="border-border/60 shadow-xs flex flex-col justify-between">
          <div>
            <CardHeader className="pb-3 border-b bg-muted/20">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <User className="h-4 w-4 text-primary" /> Market Manager
                </CardTitle>
                <Badge
                  variant="outline"
                  className={
                    hasMarketManager
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[11px]"
                      : "text-muted-foreground text-[11px]"
                  }
                >
                  {hasMarketManager ? "Assigned" : "Unassigned"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              {/* Profile Top Row */}
              <div className="flex items-center gap-3.5 pb-4 border-b border-border/50">
                <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-base uppercase shrink-0 border border-primary/20">
                  {hasMarketManager ? marketManagerName.slice(0, 2) : "MM"}
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-base text-foreground truncate">
                    {marketManagerName}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Market: <span className="font-medium text-foreground">{market.name}</span>
                  </p>
                </div>
              </div>

              {/* Symmetrical Details Block */}
              <div className="rounded-lg bg-muted/30 p-3.5 space-y-2.5 border border-border/40">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5 shrink-0">
                    <User className="h-3.5 w-3.5 text-muted-foreground" /> Manager Name:
                  </span>
                  <span className="text-xs font-semibold text-foreground text-right truncate">
                    {marketManagerName}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5 shrink-0">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" /> Email Address:
                  </span>
                  {marketManagerEmail !== "—" ? (
                    <a
                      href={`mailto:${marketManagerEmail}`}
                      className="text-xs font-medium text-primary hover:underline text-right truncate max-w-[220px]"
                      title={marketManagerEmail}
                    >
                      {marketManagerEmail}
                    </a>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">—</span>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5 shrink-0">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" /> Phone Number:
                  </span>
                  {marketManagerPhone !== "—" ? (
                    <a
                      href={`tel:${marketManagerPhone}`}
                      className="text-xs font-mono font-medium text-foreground hover:underline text-right"
                    >
                      {marketManagerPhone}
                    </a>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">—</span>
                  )}
                </div>
              </div>

              {/* Additional Assigned Team Members list if any */}
              {assignedUsersCount > 1 && (
                <div className="pt-2">
                  <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1 mb-2">
                    <Users className="h-3 w-3" /> Additional Assigned Team ({assignedUsersCount - 1})
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
            </CardContent>
          </div>
        </Card>

        {/* CARD 2: State Manager Details - EXACT SAME STRUCTURE */}
        <Card className="border-border/60 shadow-xs flex flex-col justify-between">
          <div>
            <CardHeader className="pb-3 border-b bg-muted/20">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <MapPin className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> State Manager
                </CardTitle>
                <Badge
                  variant="outline"
                  className={
                    hasStateManager
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[11px]"
                      : "text-muted-foreground text-[11px]"
                  }
                >
                  {hasStateManager ? "Assigned" : "Unassigned"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              {/* Profile Top Row */}
              <div className="flex items-center gap-3.5 pb-4 border-b border-border/50">
                <div className="h-12 w-12 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-base uppercase shrink-0 border border-emerald-500/20">
                  {hasStateManager ? stateManagerName.slice(0, 2) : "SM"}
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-base text-foreground truncate">
                    {stateManagerName}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    State: <span className="font-medium text-foreground">{stateName}</span>
                  </p>
                </div>
              </div>

              {/* Symmetrical Details Block - Matches Market Manager Exactly */}
              <div className="rounded-lg bg-muted/30 p-3.5 space-y-2.5 border border-border/40">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5 shrink-0">
                    <User className="h-3.5 w-3.5 text-muted-foreground" /> Manager Name:
                  </span>
                  <span className="text-xs font-semibold text-foreground text-right truncate">
                    {stateManagerName}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5 shrink-0">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" /> Email Address:
                  </span>
                  {stateManagerEmail !== "—" ? (
                    <a
                      href={`mailto:${stateManagerEmail}`}
                      className="text-xs font-medium text-primary hover:underline text-right truncate max-w-[220px]"
                      title={stateManagerEmail}
                    >
                      {stateManagerEmail}
                    </a>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">—</span>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5 shrink-0">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" /> Phone Number:
                  </span>
                  {stateManagerPhone !== "—" ? (
                    <a
                      href={`tel:${stateManagerPhone}`}
                      className="text-xs font-mono font-medium text-foreground hover:underline text-right"
                    >
                      {stateManagerPhone}
                    </a>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">—</span>
                  )}
                </div>
              </div>
            </CardContent>
          </div>
        </Card>
      </div>

      {/* CARD 3: Market Metadata & System Information */}
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
                <Store className="h-4 w-4 text-purple-600 dark:text-purple-400" /> Associated Stores (
                {associatedStores.length})
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
