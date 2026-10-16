import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { storesService } from "@/services/user-manager/stores.service";
import type { Store } from "@/lib/api/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft,
  Building2,
  Calendar,
  Clock,
  Globe,
  KeyRound,
  Loader2,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  ShieldAlert,
  Store as StoreIcon,
  User,
  Users,
} from "lucide-react";

export default function StoreDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const loadStoreData = async (isManualRefresh = false) => {
    if (!id) return;
    try {
      if (isManualRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const res = await storesService.get(id);
      if (!res.success || !res.data) {
        toast.error(res.message || "Failed to load store details");
        setStore(null);
        return;
      }

      setStore(res.data);
      if (isManualRefresh) {
        toast.success("Store details refreshed");
      }
    } catch (err: any) {
      toast.error(err?.message || "Something went wrong loading store details");
      setStore(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadStoreData();
  }, [id]);

  const formatDate = (isoString?: string) => {
    if (!isoString || isoString.startsWith("0001-01-01")) return "—";
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
        <p className="text-sm font-medium">Loading Store Details...</p>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="mx-auto max-w-xl py-20 text-center space-y-4">
        <ShieldAlert className="h-12 w-12 text-destructive mx-auto" />
        <h2 className="text-xl font-semibold">Store Not Found</h2>
        <p className="text-sm text-muted-foreground">
          The requested store could not be loaded or may have been deleted.
        </p>
        <Button
          onClick={() => navigate("/admin/stores")}
          variant="outline"
          className="cursor-pointer"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Stores
        </Button>
      </div>
    );
  }

  // 1. State info extracted from store.state
  const stateObj = store.state;
  const stateName = stateObj?.name || "—";
  const stateSymbol = stateObj?.symbol ? ` (${stateObj.symbol})` : "";
  const stateAssignedUser = stateObj?.assignedUsers?.[0];
  const stateManagerName = stateAssignedUser?.name || (stateObj as any)?.manager || "—";
  const stateManagerEmail = stateAssignedUser?.email || (stateObj as any)?.email || "—";
  const stateManagerPhone = stateAssignedUser?.phone || (stateObj as any)?.phone || "—";
  const hasStateManager = stateManagerName !== "—";

  // 2. Market info extracted from store.market
  const marketObj = store.market;
  const marketName = marketObj?.name || "—";
  const marketAssignedUser = marketObj?.assignedUsers?.[0];
  const marketManagerName = marketAssignedUser?.name || (marketObj as any)?.manager || "—";
  const marketManagerEmail = marketAssignedUser?.email || (marketObj as any)?.email || "—";
  const marketManagerPhone = marketAssignedUser?.phone || (marketObj as any)?.phone || "—";
  const hasMarketManager = marketManagerName !== "—";

  // 3. District info extracted from store.district
  const districtObj = store.district;
  const districtName = districtObj?.name || "—";
  const districtAssignedUser = districtObj?.assignedUsers?.[0];
  const districtManagerName = districtAssignedUser?.name || (districtObj as any)?.manager || "—";
  const districtManagerEmail = districtAssignedUser?.email || (districtObj as any)?.email || "—";
  const districtManagerPhone = districtAssignedUser?.phone || (districtObj as any)?.phone || "—";
  const hasDistrictManager = districtManagerName !== "—";

  // 4. Assigned Store Users
  const assignedUsersList = Array.isArray(store.assignedUsers) ? store.assignedUsers : [];

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Top Navigation Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/admin/stores")}
              className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer -ml-2"
            >
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back to Stores
            </Button>
            <span className="text-xs text-muted-foreground">/</span>
            <span className="text-xs text-muted-foreground font-mono">Store #{store.id}</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
              {store.name}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadStoreData(true)}
            disabled={refreshing}
            className="cursor-pointer"
          >
            <RefreshCw className={`mr-2 h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Highlights Summary Row - 4 Distinct Soft Background Tints */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Store Number & Identity - Soft Blue Tint */}
        <Card className="shadow-xs bg-blue-50/70 dark:bg-blue-950/20 border-blue-200/60 dark:border-blue-900/40 transition-all hover:shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <StoreIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-blue-700/80 dark:text-blue-300/80 uppercase tracking-wider">
                Store Number
              </p>
              <p className="text-sm font-bold truncate text-foreground mt-0.5 font-mono">
                {store.number || `Store #${store.id}`}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* KPI 2: Operating State - Soft Emerald Tint */}
        <Card className="shadow-xs bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-900/40 transition-all hover:shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Globe className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-emerald-700/80 dark:text-emerald-300/80 uppercase tracking-wider">
                Operating State
              </p>
              <p className="text-sm font-bold truncate text-foreground mt-0.5">
                {stateName}
                {stateSymbol}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* KPI 3: Associated Market - Soft Purple Tint */}
        <Card className="shadow-xs bg-purple-50/70 dark:bg-purple-950/20 border-purple-200/60 dark:border-purple-900/40 transition-all hover:shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <Building2 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-purple-700/80 dark:text-purple-300/80 uppercase tracking-wider">
                Associated Market
              </p>
              <p className="text-sm font-bold truncate text-foreground mt-0.5">{marketName}</p>
            </div>
          </CardContent>
        </Card>

        {/* KPI 4: Assigned District - Soft Amber Tint */}
        <Card className="shadow-xs bg-amber-50/70 dark:bg-amber-950/20 border-amber-200/60 dark:border-amber-900/40 transition-all hover:shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <MapPin className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-amber-700/80 dark:text-amber-300/80 uppercase tracking-wider">
                Assigned District
              </p>
              <p className="text-sm font-bold truncate text-foreground mt-0.5">{districtName}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid: Store Operational Info & Location */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Store Information & Address */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border/60 shadow-xs">
            <CardHeader className="pb-3 border-b bg-muted/20">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <StoreIcon className="h-4 w-4 text-primary" /> Store Location & Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              {/* Full Address Block */}
              <div className="rounded-lg border border-border/60 bg-muted/30 p-4 space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-primary shrink-0" /> Full Street Address
                </span>
                <p className="text-sm font-medium text-foreground leading-relaxed pl-5">
                  {store.address || "No street address provided"}
                </p>
              </div>

              {/* Contact Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="rounded-lg border border-border/40 bg-muted/20 p-3.5 space-y-1">
                  <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" /> Email Contact:
                  </span>
                  {store.email ? (
                    <a
                      href={`mailto:${store.email}`}
                      className="text-xs font-medium text-primary hover:underline truncate block"
                      title={store.email}
                    >
                      {store.email}
                    </a>
                  ) : (
                    <p className="text-xs text-muted-foreground">—</p>
                  )}
                </div>

                <div className="rounded-lg border border-border/40 bg-muted/20 p-3.5 space-y-1">
                  <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" /> Phone Number:
                  </span>
                  {store.phone ? (
                    <a
                      href={`tel:${store.phone}`}
                      className="text-xs font-mono font-medium text-foreground hover:underline truncate block"
                    >
                      {store.phone}
                    </a>
                  ) : (
                    <p className="text-xs text-muted-foreground">—</p>
                  )}
                </div>

                <div className="rounded-lg border border-border/40 bg-muted/20 p-3.5 space-y-1">
                  <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
                    <KeyRound className="h-3.5 w-3.5 text-muted-foreground" /> Door Code:
                  </span>
                  <p className="text-xs font-mono font-semibold text-foreground">
                    {store.doorCode || "—"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Assigned Staff / Store Personnel */}
          <Card className="border-border/60 shadow-xs">
            <CardHeader className="pb-3 border-b bg-muted/20">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <Users className="h-4 w-4 text-primary" /> Store Assigned Personnel
                </CardTitle>
                <Badge variant="secondary" className="text-xs">
                  {assignedUsersList.length} Assigned
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-5">
              {assignedUsersList.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-xs space-y-1">
                  <User className="h-8 w-8 mx-auto opacity-30" />
                  <p className="font-medium">No personnel directly assigned</p>
                  <p className="text-[11px] text-muted-foreground">
                    Store managers and team members assigned to this store will appear here.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {assignedUsersList.map((u: any) => (
                    <div
                      key={u.id}
                      className="rounded-lg border border-border/50 bg-muted/20 p-3 flex items-center gap-3"
                    >
                      <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                        {(u.name || "U").slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">{u.name}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{u.email}</p>
                        {u.phone && (
                          <p className="text-[11px] font-mono text-zinc-500 truncate">{u.phone}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column (1 Col): Hierarchy Leadership & System Timestamps */}
        <div className="space-y-6">
          {/* Hierarchy Leadership Card */}
          <Card className="border-border/60 shadow-xs">
            <CardHeader className="pb-3 border-b bg-muted/20">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Building2 className="h-4 w-4 text-primary" /> Hierarchy Leadership
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              {/* Level 1: State */}
              <div className="rounded-lg border border-border/40 bg-muted/20 p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <Globe className="h-3 w-3 text-emerald-500" /> State Level
                  </span>
                  <Badge variant="outline" className="text-[10px] font-medium">
                    {stateName}
                    {stateSymbol}
                  </Badge>
                </div>
                <div className="text-xs space-y-0.5 pt-1 border-t border-border/30">
                  <p className="font-medium text-foreground">
                    Manager: <span className="font-semibold">{stateManagerName}</span>
                  </p>
                  {stateManagerEmail !== "—" && (
                    <p className="text-[11px] text-muted-foreground truncate">
                      {stateManagerEmail}
                    </p>
                  )}
                  {stateManagerPhone !== "—" && (
                    <p className="text-[11px] font-mono text-muted-foreground">
                      {stateManagerPhone}
                    </p>
                  )}
                </div>
              </div>

              {/* Level 2: Market */}
              <div className="rounded-lg border border-border/40 bg-muted/20 p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <Building2 className="h-3 w-3 text-purple-500" /> Market Level
                  </span>
                  <Badge variant="outline" className="text-[10px] font-medium">
                    {marketName}
                  </Badge>
                </div>
                <div className="text-xs space-y-0.5 pt-1 border-t border-border/30">
                  <p className="font-medium text-foreground">
                    Manager: <span className="font-semibold">{marketManagerName}</span>
                  </p>
                  {marketManagerEmail !== "—" && (
                    <p className="text-[11px] text-muted-foreground truncate">
                      {marketManagerEmail}
                    </p>
                  )}
                  {marketManagerPhone !== "—" && (
                    <p className="text-[11px] font-mono text-muted-foreground">
                      {marketManagerPhone}
                    </p>
                  )}
                </div>
              </div>

              {/* Level 3: District */}
              <div className="rounded-lg border border-border/40 bg-muted/20 p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-amber-500" /> District Level
                  </span>
                  <Badge variant="outline" className="text-[10px] font-medium">
                    {districtName}
                  </Badge>
                </div>
                <div className="text-xs space-y-0.5 pt-1 border-t border-border/30">
                  <p className="font-medium text-foreground">
                    Manager: <span className="font-semibold">{districtManagerName}</span>
                  </p>
                  {districtManagerEmail !== "—" && (
                    <p className="text-[11px] text-muted-foreground truncate">
                      {districtManagerEmail}
                    </p>
                  )}
                  {districtManagerPhone !== "—" && (
                    <p className="text-[11px] font-mono text-muted-foreground">
                      {districtManagerPhone}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* System Timestamps & Record Card */}
          <Card className="border-border/60 shadow-xs">
            <CardHeader className="pb-3 border-b bg-muted/20">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Clock className="h-4 w-4 text-primary" /> System Details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" /> Created:
                </span>
                <span className="font-medium text-foreground">{formatDate(store.createdAt)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" /> Last Updated:
                </span>
                <span className="font-medium text-foreground">{formatDate(store.updatedAt)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
