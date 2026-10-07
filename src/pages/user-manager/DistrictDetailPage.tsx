import { useNavigate, useParams } from "react-router-dom";
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
  Mail,
  MapPin,
  Phone,
  Store,
  User,
} from "lucide-react";

export default function DistrictDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Static District, State, and Market details (no API calls as requested)
  const districtData = {
    id: id || "6",
    name:
      id === "2"
        ? "Dallas County"
        : id === "7"
          ? "East"
          : id === "14"
            ? "Central District"
            : "Central",
    createdAt: "2026-09-12T19:02:35",
    updatedAt: "2026-09-12T19:02:35",
    districtManager: {
      name: "Ali Khan",
      email: "ali.khan@active8wireless.com",
      phone: "+1 (555) 234-5678",
      assigned: true,
    },
    state: {
      id: 5,
      name: "Texas",
      code: "TX",
      manager: "Sarah Mitchell",
      email: "sarah.mitchell@active8wireless.com",
      phone: "+1 (555) 876-5432",
      assigned: true,
    },
    market: {
      id: 1,
      name: "Market 1 (North Texas)",
      manager: "David Miller",
      email: "david.miller@active8wireless.com",
      phone: "+1 (555) 345-6789",
      assigned: true,
    },
    stores: [
      {
        id: 101,
        name: "North Dallas Store",
        number: "ST-101",
        address: "742 Evergreen Terrace, Dallas, TX 75001",
        phone: "+1 (555) 321-9876",
      },
      {
        id: 102,
        name: "Central Galleria Wireless",
        number: "ST-102",
        address: "1337 Galleria Mall Suite 4B, Dallas, TX 75002",
        phone: "+1 (555) 654-3210",
      },
      {
        id: 103,
        name: "Oak Cliff Mobile Hub",
        number: "ST-103",
        address: "880 South Beckley Ave, Dallas, TX 75008",
        phone: "+1 (555) 987-6543",
      },
    ],
  };

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
            <span className="text-xs text-muted-foreground font-mono">
              District #{districtData.id}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
              {districtData.name}
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
              <p className="text-sm font-bold truncate text-foreground mt-0.5">
                {districtData.name}
              </p>
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
              <p className="text-sm font-bold truncate text-foreground mt-0.5">
                {districtData.market.name}
              </p>
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
                {districtData.state.name} ({districtData.state.code})
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
                {districtData.districtManager.name}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main 3 Detail Cards Grid: 1st District, 2nd Market, 3rd State */}
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
                  className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[11px]"
                >
                  Assigned
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              {/* Profile Top Row */}
              <div className="flex items-center gap-3.5 pb-4 border-b border-border/50">
                <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-base uppercase shrink-0 border border-primary/20">
                  {districtData.districtManager.name.slice(0, 2)}
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-base text-foreground truncate">
                    {districtData.districtManager.name}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    District:{" "}
                    <span className="font-medium text-foreground">{districtData.name}</span>
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
                    {districtData.districtManager.name}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5 shrink-0">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" /> Email Address:
                  </span>
                  <a
                    href={`mailto:${districtData.districtManager.email}`}
                    className="text-xs font-medium text-primary hover:underline text-right truncate max-w-[200px]"
                    title={districtData.districtManager.email}
                  >
                    {districtData.districtManager.email}
                  </a>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5 shrink-0">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" /> Phone Number:
                  </span>
                  <a
                    href={`tel:${districtData.districtManager.phone}`}
                    className="text-xs font-mono font-medium text-foreground hover:underline text-right"
                  >
                    {districtData.districtManager.phone}
                  </a>
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
                  className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[11px]"
                >
                  Assigned
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              {/* Profile Top Row */}
              <div className="flex items-center gap-3.5 pb-4 border-b border-border/50">
                <div className="h-12 w-12 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-base uppercase shrink-0 border border-purple-500/20">
                  {districtData.market.manager.slice(0, 2)}
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-base text-foreground truncate">
                    {districtData.market.manager}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Market:{" "}
                    <span className="font-medium text-foreground">{districtData.market.name}</span>
                  </p>
                </div>
              </div>

              {/* Symmetrical Details Block */}
              <div className="rounded-lg bg-muted/30 p-3.5 space-y-2.5 border border-border/40">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5 shrink-0">
                    <User className="h-3.5 w-3.5 text-muted-foreground" /> Market Manager:
                  </span>
                  <span className="text-xs font-semibold text-foreground text-right truncate">
                    {districtData.market.manager}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5 shrink-0">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" /> Email Address:
                  </span>
                  <a
                    href={`mailto:${districtData.market.email}`}
                    className="text-xs font-medium text-primary hover:underline text-right truncate max-w-[200px]"
                    title={districtData.market.email}
                  >
                    {districtData.market.email}
                  </a>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5 shrink-0">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" /> Phone Number:
                  </span>
                  <a
                    href={`tel:${districtData.market.phone}`}
                    className="text-xs font-mono font-medium text-foreground hover:underline text-right"
                  >
                    {districtData.market.phone}
                  </a>
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
                  className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[11px]"
                >
                  Assigned
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              {/* Profile Top Row */}
              <div className="flex items-center gap-3.5 pb-4 border-b border-border/50">
                <div className="h-12 w-12 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-base uppercase shrink-0 border border-emerald-500/20">
                  {districtData.state.manager.slice(0, 2)}
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-base text-foreground truncate">
                    {districtData.state.manager}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    State:{" "}
                    <span className="font-medium text-foreground">{districtData.state.name}</span>
                  </p>
                </div>
              </div>

              {/* Symmetrical Details Block */}
              <div className="rounded-lg bg-muted/30 p-3.5 space-y-2.5 border border-border/40">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5 shrink-0">
                    <User className="h-3.5 w-3.5 text-muted-foreground" /> State Manager:
                  </span>
                  <span className="text-xs font-semibold text-foreground text-right truncate">
                    {districtData.state.manager}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5 shrink-0">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" /> Email Address:
                  </span>
                  <a
                    href={`mailto:${districtData.state.email}`}
                    className="text-xs font-medium text-primary hover:underline text-right truncate max-w-[200px]"
                    title={districtData.state.email}
                  >
                    {districtData.state.email}
                  </a>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5 shrink-0">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" /> Phone Number:
                  </span>
                  <a
                    href={`tel:${districtData.state.phone}`}
                    className="text-xs font-mono font-medium text-foreground hover:underline text-right"
                  >
                    {districtData.state.phone}
                  </a>
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
              <p className="text-xs font-mono font-semibold text-foreground">#{districtData.id}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[11px] font-medium text-muted-foreground">District Name</span>
              <p className="text-xs font-semibold text-foreground">{districtData.name}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[11px] font-medium text-muted-foreground">Operating State</span>
              <p className="text-xs font-semibold text-foreground">{districtData.state.name}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[11px] font-medium text-muted-foreground">Parent Market</span>
              <p className="text-xs font-semibold text-foreground">{districtData.market.name}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Created At
              </span>
              <p className="text-xs text-foreground">{formatDate(districtData.createdAt)}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" /> Last Updated
              </span>
              <p className="text-xs text-foreground">{formatDate(districtData.updatedAt)}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[11px] font-medium text-muted-foreground">Status</span>
              <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Active</p>
            </div>
            <div className="space-y-1">
              <span className="text-[11px] font-medium text-muted-foreground">Stores Count</span>
              <p className="text-xs font-semibold text-foreground">
                {districtData.stores.length} Stores
              </p>
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
              {districtData.stores.length})
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
            {districtData.stores.map((store) => (
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
    </div>
  );
}
