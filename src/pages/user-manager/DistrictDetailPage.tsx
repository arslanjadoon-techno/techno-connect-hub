import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { districtsService } from "@/services";
import type { District } from "@/lib/api/client";
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
  Globe,
  Loader2,
  Mail,
  MapPin,
  Phone,
  ShieldAlert,
  Store,
  User,
  Users,
} from "lucide-react";

export default function DistrictDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [district, setDistrict] = useState<District | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const loadDistrictData = async () => {
    if (!id) return;
    try {
      setLoading(true);

      // Fetch district by ID via standard districtsService
      const res = await districtsService.get(id);
      if (!res.success || !res.data) {
        toast.error(res.message || "Failed to load district details");
        setDistrict(null);
        return;
      }

      setDistrict(res.data);
    } catch (err: any) {
      toast.error(err?.message || "Something went wrong loading district details");
      setDistrict(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDistrictData();
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
        <p className="text-sm font-medium">Loading District Details...</p>
      </div>
    );
  }

  if (!district) {
    return (
      <div className="mx-auto max-w-xl py-20 text-center space-y-4">
        <ShieldAlert className="h-12 w-12 text-destructive mx-auto" />
        <h2 className="text-xl font-semibold">District Not Found</h2>
        <p className="text-sm text-muted-foreground">
          The requested district could not be loaded or may have been deleted.
        </p>
        <Button
          onClick={() => navigate("/admin/districts")}
          variant="outline"
          className="cursor-pointer"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Districts
        </Button>
      </div>
    );
  }

  // 1. District Manager info extracted from district response
  const districtAssignedUser = district.assignedUsers?.[0];
  const districtManagerName =
    districtAssignedUser?.name ||
    district.manager ||
    (district as any).districtManager?.name ||
    "—";
  const districtManagerEmail =
    districtAssignedUser?.email ||
    district.email ||
    (district as any).districtManager?.email ||
    "—";
  const districtManagerPhone =
    districtAssignedUser?.phone ||
    district.phone ||
    (district as any).districtManager?.phone ||
    "—";
  const hasDistrictManager = districtManagerName !== "—";

  // 2. Market info extracted from district.market
  const marketObj = district.market;
  const marketName = marketObj?.name || "—";
  const marketAssignedUser = marketObj?.assignedUsers?.[0];
  const marketManagerName = marketAssignedUser?.name || (marketObj as any)?.manager || "—";
  const marketManagerEmail = marketAssignedUser?.email || (marketObj as any)?.email || "—";
  const marketManagerPhone = marketAssignedUser?.phone || (marketObj as any)?.phone || "—";
  const hasMarketManager = marketManagerName !== "—";

  // 3. State info extracted from district.state
  const stateObj = district.state;
  const stateName = stateObj?.name || "—";
  const stateSymbol = stateObj?.symbol ? ` (${stateObj.symbol})` : "";
  const stateAssignedUser = stateObj?.assignedUsers?.[0];
  const stateManagerName = stateAssignedUser?.name || (stateObj as any)?.manager || "—";
  const stateManagerEmail = stateAssignedUser?.email || (stateObj as any)?.email || "—";
  const stateManagerPhone = stateAssignedUser?.phone || (stateObj as any)?.phone || "—";
  const hasStateManager = stateManagerName !== "—";

  // 4. Stores list
  const storesList = Array.isArray(district.stores) ? district.stores : [];
  const storeCount = district.storeCount ?? storesList.length;

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Top Navigation Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/admin/districts")}
              className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer -ml-2"
            >
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back to Districts
            </Button>
            <span className="text-xs text-muted-foreground">/</span>
            <span className="text-xs text-muted-foreground font-mono">District #{district.id}</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
              {district.name}
            </h1>
            <Badge
              variant="outline"
              className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs"
            >
              <CheckCircle2 className="mr-1 h-3 w-3" /> Active District
            </Badge>
          </div>
        </div>
      </div>

      {/* Highlights Summary Row - 4 Distinct Soft Background Tints */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: District Name - Soft Blue Tint */}
        <Card className="shadow-xs bg-blue-50/70 dark:bg-blue-950/20 border-blue-200/60 dark:border-blue-900/40 transition-all hover:shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <MapPin className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-blue-700/80 dark:text-blue-300/80 uppercase tracking-wider">
                District Name
              </p>
              <p className="text-sm font-bold truncate text-foreground mt-0.5">{district.name}</p>
            </div>
          </CardContent>
        </Card>

        {/* KPI 2: Associated Market - Soft Purple Tint */}
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

        {/* KPI 3: Operating State - Soft Emerald Tint */}
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

        {/* KPI 4: District Manager - Soft Amber Tint */}
        <Card className="shadow-xs bg-amber-50/70 dark:bg-amber-950/20 border-amber-200/60 dark:border-amber-900/40 transition-all hover:shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <User className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-amber-700/80 dark:text-amber-300/80 uppercase tracking-wider">
                District Manager
              </p>
              <p className="text-sm font-bold truncate text-foreground mt-0.5">
                {districtManagerName}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Detail Cards Grid: 1st District Manager, 2nd Market Details, 3rd State Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* CARD 1: District Manager Details */}
        <Card className="border-border/60 shadow-xs flex flex-col justify-between">
          <div>
            <CardHeader className="pb-3 border-b bg-muted/20">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <User className="h-4 w-4 text-primary" /> District Manager
                </CardTitle>
                <Badge
                  variant="outline"
                  className={
                    hasDistrictManager
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[11px]"
                      : "bg-muted text-muted-foreground text-[11px]"
                  }
                >
                  {hasDistrictManager ? "Assigned" : "Unassigned"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              {/* Profile Top Row */}
              <div className="flex items-center gap-3.5 pb-4 border-b border-border/50">
                <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-base uppercase shrink-0 border border-primary/20">
                  {hasDistrictManager ? districtManagerName.slice(0, 2).toUpperCase() : "DM"}
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-base text-foreground truncate">
                    {districtManagerName}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    District: <span className="font-medium text-foreground">{district.name}</span>
                  </p>
                </div>
              </div>

              {/* Details Block */}
              <div className="rounded-lg bg-muted/30 p-3.5 space-y-2.5 border border-border/40">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5 shrink-0">
                    <User className="h-3.5 w-3.5 text-muted-foreground" /> Manager Name:
                  </span>
                  <span className="text-xs font-semibold text-foreground text-right truncate">
                    {districtManagerName}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5 shrink-0">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" /> Email Address:
                  </span>
                  {districtManagerEmail !== "—" ? (
                    <a
                      href={`mailto:${districtManagerEmail}`}
                      className="text-xs font-medium text-primary hover:underline text-right truncate max-w-[200px]"
                      title={districtManagerEmail}
                    >
                      {districtManagerEmail}
                    </a>
                  ) : (
                    <span className="text-xs text-muted-foreground text-right">—</span>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5 shrink-0">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" /> Phone Number:
                  </span>
                  {districtManagerPhone !== "—" ? (
                    <a
                      href={`tel:${districtManagerPhone}`}
                      className="text-xs font-mono font-medium text-foreground hover:underline text-right"
                    >
                      {districtManagerPhone}
                    </a>
                  ) : (
                    <span className="text-xs text-muted-foreground text-right">—</span>
                  )}
                </div>
              </div>
            </CardContent>
          </div>
        </Card>

        {/* CARD 2: Market Manager & Associated Market Details */}
        <Card className="border-border/60 shadow-xs flex flex-col justify-between">
          <div>
            <CardHeader className="pb-3 border-b bg-muted/20">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <Building2 className="h-4 w-4 text-purple-600 dark:text-purple-400" /> Market
                  Details
                </CardTitle>
                <Badge
                  variant="outline"
                  className={
                    marketName !== "—"
                      ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 text-[11px]"
                      : "bg-muted text-muted-foreground text-[11px]"
                  }
                >
                  {marketName !== "—" ? "Linked" : "No Market"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              {/* Profile Top Row */}
              <div className="flex items-center gap-3.5 pb-4 border-b border-border/50">
                <div className="h-12 w-12 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-base uppercase shrink-0 border border-purple-500/20">
                  {marketName !== "—" ? marketName.slice(0, 2).toUpperCase() : "MK"}
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-base text-foreground truncate">{marketName}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Manager:{" "}
                    <span className="font-medium text-foreground">{marketManagerName}</span>
                  </p>
                </div>
              </div>

              {/* Details Block */}
              <div className="rounded-lg bg-muted/30 p-3.5 space-y-2.5 border border-border/40">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5 shrink-0">
                    <User className="h-3.5 w-3.5 text-muted-foreground" /> Market Manager:
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
                      className="text-xs font-medium text-primary hover:underline text-right truncate max-w-[200px]"
                      title={marketManagerEmail}
                    >
                      {marketManagerEmail}
                    </a>
                  ) : (
                    <span className="text-xs text-muted-foreground text-right">—</span>
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
                    <span className="text-xs text-muted-foreground text-right">—</span>
                  )}
                </div>
              </div>
            </CardContent>
          </div>
        </Card>

        {/* CARD 3: State Manager & Operating State Details */}
        <Card className="border-border/60 shadow-xs flex flex-col justify-between">
          <div>
            <CardHeader className="pb-3 border-b bg-muted/20">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <Globe className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> State Details
                </CardTitle>
                <Badge
                  variant="outline"
                  className={
                    stateName !== "—"
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[11px]"
                      : "bg-muted text-muted-foreground text-[11px]"
                  }
                >
                  {stateName !== "—" ? "Linked" : "No State"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              {/* Profile Top Row */}
              <div className="flex items-center gap-3.5 pb-4 border-b border-border/50">
                <div className="h-12 w-12 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-base uppercase shrink-0 border border-emerald-500/20">
                  {stateName !== "—" ? stateName.slice(0, 2).toUpperCase() : "ST"}
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-base text-foreground truncate">
                    {stateName}
                    {stateSymbol}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Manager: <span className="font-medium text-foreground">{stateManagerName}</span>
                  </p>
                </div>
              </div>

              {/* Details Block */}
              <div className="rounded-lg bg-muted/30 p-3.5 space-y-2.5 border border-border/40">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5 shrink-0">
                    <User className="h-3.5 w-3.5 text-muted-foreground" /> State Manager:
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
                      className="text-xs font-medium text-primary hover:underline text-right truncate max-w-[200px]"
                      title={stateManagerEmail}
                    >
                      {stateManagerEmail}
                    </a>
                  ) : (
                    <span className="text-xs text-muted-foreground text-right">—</span>
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
                    <span className="text-xs text-muted-foreground text-right">—</span>
                  )}
                </div>
              </div>
            </CardContent>
          </div>
        </Card>
      </div>

      {/* CARD 4: District Overview & System Information */}
      <Card className="border-border/60 shadow-xs">
        <CardHeader className="pb-3 border-b bg-muted/20">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Clock className="h-4 w-4 text-primary" /> District Overview & System Information
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <span className="text-[11px] font-medium text-muted-foreground">District ID</span>
              <p className="text-xs font-mono font-semibold text-foreground">#{district.id}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[11px] font-medium text-muted-foreground">District Name</span>
              <p className="text-xs font-semibold text-foreground">{district.name}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[11px] font-medium text-muted-foreground">Operating State</span>
              <p className="text-xs font-semibold text-foreground">
                {stateName}
                {stateSymbol}
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-[11px] font-medium text-muted-foreground">Parent Market</span>
              <p className="text-xs font-semibold text-foreground">{marketName}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Created At
              </span>
              <p className="text-xs text-foreground">{formatDate(district.createdAt)}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" /> Last Updated
              </span>
              <p className="text-xs text-foreground">{formatDate(district.updatedAt)}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[11px] font-medium text-muted-foreground">Status</span>
              <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Active</p>
            </div>
            <div className="space-y-1">
              <span className="text-[11px] font-medium text-muted-foreground">Stores Count</span>
              <p className="text-xs font-semibold text-foreground">{storeCount} Stores</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CARD 5: Stores Mapped to this District */}
      <Card className="border-border/60 shadow-xs">
        <CardHeader className="pb-3 border-b bg-muted/20">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Store className="h-4 w-4 text-purple-600 dark:text-purple-400" /> Associated Stores (
              {storeCount})
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
          {storesList.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No stores currently associated with this district.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {storesList.map((store) => (
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
