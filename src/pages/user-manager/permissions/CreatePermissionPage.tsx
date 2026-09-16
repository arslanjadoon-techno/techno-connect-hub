import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  ShieldPlus,
  Copy,
  Check,
  Lock,
  Layers,
  Search,
  Filter,
  ArrowRight,
  Sparkles,
  RefreshCw,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PermissionsNavTabs } from "./PermissionsNavTabs";
import {
  permissionsService,
  type PermissionItem,
} from "@/services/user-manager/permissions.service";
import { portalsService, type PortalItem } from "@/services/portals/portals.service";

export default function CreatePermissionPage() {
  // Portal API list state
  const [portals, setPortals] = useState<PortalItem[]>([]);
  const [loadingPortals, setLoadingPortals] = useState<boolean>(true);

  // Form states
  const [selectedPortalId, setSelectedPortalId] = useState<string>("");
  const [permissionName, setPermissionName] = useState<string>("");
  const [description, setDescription] = useState<string>("");

  // Existing permissions list
  const [permissionsList, setPermissionsList] = useState<PermissionItem[]>([]);
  const [loadingPermissions, setLoadingPermissions] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filterPortal, setFilterPortal] = useState<string>("all");

  // UI state
  const [copiedKey, setCopiedKey] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // 1. Fetch Portals dynamically from portalsService
  useEffect(() => {
    let isMounted = true;

    async function loadPortals() {
      try {
        setLoadingPortals(true);
        const res = await portalsService.getAll();
        if (res?.success && Array.isArray(res.data)) {
          if (isMounted) {
            setPortals(res.data);
          }
        }
      } catch (err) {
        console.error("Failed to load portals:", err);
        toast.error("Failed to load portals list");
      } finally {
        if (isMounted) {
          setLoadingPortals(false);
        }
      }
    }

    loadPortals();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Fetch existing permissions from real API
  const reloadPermissions = async () => {
    try {
      setLoadingPermissions(true);
      const res = await permissionsService.getAll();
      if (res?.success && Array.isArray(res.data)) {
        setPermissionsList(res.data);
      } else {
        setPermissionsList([]);
      }
    } catch (err) {
      console.error("Failed to fetch permissions:", err);
      toast.error("Failed to retrieve permissions from server");
      setPermissionsList([]);
    } finally {
      setLoadingPermissions(false);
    }
  };

  useEffect(() => {
    reloadPermissions();
  }, []);

  // Selected portal object
  const selectedPortalObj = useMemo(() => {
    return portals.find((p) => String(p.id) === String(selectedPortalId));
  }, [portals, selectedPortalId]);

  // Live estimated key preview (backend generates key upon creation)
  const previewKey = useMemo(() => {
    if (!selectedPortalObj?.name && !permissionName.trim()) return "";
    const portalSlug = (selectedPortalObj?.name || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
    const nameSlug = permissionName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");

    if (!portalSlug && !nameSlug) return "";
    if (!portalSlug) return nameSlug;
    if (!nameSlug) return `${portalSlug}.`;
    return `${portalSlug}.${nameSlug}`;
  }, [selectedPortalObj, permissionName]);

  const handleCopyKey = () => {
    if (!previewKey) return;
    navigator.clipboard.writeText(previewKey);
    setCopiedKey(true);
    toast.success("Permission key copied to clipboard");
    setTimeout(() => setCopiedKey(false), 2000);
  };

  // Submit new permission via real API
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedPortalId) {
      toast.error("Please select a target portal");
      return;
    }

    if (!permissionName.trim()) {
      toast.error("Please provide a permission name");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await permissionsService.add({
        portalId: Number(selectedPortalId),
        name: permissionName.trim(),
        description: description.trim() || undefined,
      });

      if (res?.success) {
        toast.success(res.message || "Permission created successfully!");
        setPermissionName("");
        setDescription("");
        await reloadPermissions();
      } else {
        toast.error(res?.message || "Failed to create permission");
      }
    } catch (err: unknown) {
      console.error("Error creating permission:", err);
      toast.error((err as Error)?.message || "Failed to create permission");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered permissions list
  const filteredPermissions = useMemo(() => {
    return permissionsList.filter((item) => {
      const matchesPortal =
        filterPortal === "all" ||
        String(item.portalId) === String(filterPortal) ||
        item.portalName.toLowerCase() === filterPortal.toLowerCase();

      const q = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.key.toLowerCase().includes(q) ||
        (item.description && item.description.toLowerCase().includes(q)) ||
        item.portalName.toLowerCase().includes(q);

      return matchesPortal && matchesSearch;
    });
  }, [permissionsList, filterPortal, searchTerm]);

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Top Navigation Tabs */}
      <PermissionsNavTabs totalPermissions={permissionsList.length} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Create Form */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="border-border shadow-xs">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <ShieldPlus className="h-4 w-4 text-primary" />
                New Permission Entry
              </CardTitle>
              <CardDescription className="text-xs">
                Create a granular system or UI permission tied to a specific portal.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* 1. Portal Select Dropdown */}
                <div className="space-y-1.5">
                  <Label htmlFor="portal-select" className="text-xs font-semibold">
                    Portal <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={selectedPortalId}
                    onValueChange={setSelectedPortalId}
                    disabled={loadingPortals || isSubmitting}
                  >
                    <SelectTrigger id="portal-select" className="h-9 w-full text-xs">
                      <SelectValue
                        placeholder={loadingPortals ? "Loading portals..." : "Select portal..."}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {portals.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">
                    Fetched dynamically from Portals service.
                  </p>
                </div>

                {/* 2. Permission Name Textbox */}
                <div className="space-y-1.5">
                  <Label htmlFor="perm-name" className="text-xs font-semibold">
                    Permission Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="perm-name"
                    type="text"
                    placeholder="e.g. Upload Statement Button"
                    value={permissionName}
                    onChange={(e) => setPermissionName(e.target.value)}
                    className="h-9 text-xs"
                    disabled={isSubmitting}
                    required
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Human-readable label shown in permission assignment screens.
                  </p>
                </div>

                {/* 3. Key Preview */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor="perm-key"
                      className="text-xs font-semibold flex items-center gap-1.5"
                    >
                      <Lock className="h-3 w-3 text-muted-foreground" />
                      Key{" "}
                      <span className="text-muted-foreground text-[11px] font-normal">
                        (Auto-generated by server)
                      </span>
                    </Label>
                    {previewKey && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleCopyKey}
                        className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                      >
                        {copiedKey ? (
                          <>
                            <Check className="h-3 w-3 mr-1 text-emerald-500" /> Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3 mr-1" /> Copy Key
                          </>
                        )}
                      </Button>
                    )}
                  </div>

                  <div className="relative">
                    <Input
                      id="perm-key"
                      type="text"
                      value={previewKey}
                      readOnly
                      placeholder="e.g. ticketing.test_permission_1"
                      className="h-9 font-mono text-xs bg-muted/60 text-foreground/80 border-dashed cursor-not-allowed pr-8 select-all"
                    />
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground/60">
                      <Lock className="h-3.5 w-3.5" />
                    </div>
                  </div>

                  <p className="text-[11px] text-muted-foreground">
                    Backend key format:{" "}
                    <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px] text-primary">
                      [portal_name].[permission_name]
                    </code>
                  </p>
                </div>

                {/* 4. Description (Optional) */}
                <div className="space-y-1.5">
                  <Label htmlFor="perm-desc" className="text-xs font-semibold">
                    Description{" "}
                    <span className="text-muted-foreground text-[11px] font-normal">
                      (Optional)
                    </span>
                  </Label>
                  <Textarea
                    id="perm-desc"
                    placeholder="Provide additional details regarding what action this permission controls..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    disabled={isSubmitting}
                    className="text-xs resize-none"
                  />
                </div>

                {/* Submission Button */}
                <div className="pt-2">
                  <Button
                    type="submit"
                    className="w-full h-9 gap-2 font-medium text-xs"
                    disabled={!selectedPortalId || !permissionName.trim() || isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Creating Permission...</span>
                      </>
                    ) : (
                      <>
                        <ShieldPlus className="h-4 w-4" />
                        <span>Create Permission</span>
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Quick Info Box */}
          <div className="mt-4 rounded-lg border border-border/70 bg-muted/20 p-3.5 text-xs text-muted-foreground flex items-start gap-2.5">
            <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-foreground">Permission Assignment</p>
              <p className="mt-0.5">
                Once created, navigate to{" "}
                <Link to="/admin/permissions/assign" className="text-primary underline font-medium">
                  Assign Permissions
                </Link>{" "}
                to grant or revoke this privilege for specific employees across the organization.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Existing Permissions Table & Overview */}
        <div className="lg:col-span-7 space-y-4">
          <Card className="border-border shadow-xs">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Layers className="h-4 w-4 text-primary" />
                    Available Permissions
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Live list of configured permissions retrieved from backend API.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={reloadPermissions}
                    disabled={loadingPermissions}
                    className="h-8 text-xs gap-1.5"
                    title="Refresh permissions from server"
                  >
                    <RefreshCw
                      className={`h-3.5 w-3.5 ${loadingPermissions ? "animate-spin" : ""}`}
                    />
                    <span className="hidden sm:inline">Refresh</span>
                  </Button>
                  <Link to="/admin/permissions/assign">
                    <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                      <span>Go to Assign</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Filters */}
              <div className="mt-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2 border-t border-border/50">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search by name, key, description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-8 pl-8 text-xs"
                  />
                </div>

                <div className="w-full sm:w-[180px]">
                  <Select value={filterPortal} onValueChange={setFilterPortal}>
                    <SelectTrigger className="h-8 text-xs">
                      <Filter className="h-3 w-3 mr-1.5 text-muted-foreground" />
                      <SelectValue placeholder="All Portals" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Portals</SelectItem>
                      {portals.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="divide-y divide-border/60 max-h-[580px] overflow-y-auto">
                {loadingPermissions ? (
                  <div className="p-12 text-center text-xs text-muted-foreground space-y-2">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                    <p>Loading permissions from server...</p>
                  </div>
                ) : filteredPermissions.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground">
                    <AlertCircle className="h-6 w-6 mx-auto mb-2 opacity-50" />
                    No permissions match your search or filter criteria.
                  </div>
                ) : (
                  filteredPermissions.map((item) => (
                    <div
                      key={item.id}
                      className="p-3.5 hover:bg-muted/40 transition-colors flex items-start justify-between gap-3"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-xs text-foreground truncate">
                            {item.name}
                          </span>
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0 h-4.5 bg-primary/5 text-primary border-primary/20"
                          >
                            {item.portalName}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            ID: #{item.id}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <code className="text-[11px] font-mono text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">
                            {item.key}
                          </code>
                        </div>

                        {item.description && (
                          <p className="text-[11px] text-muted-foreground/80 line-clamp-1">
                            {item.description}
                          </p>
                        )}

                        {item.createdDate && (
                          <p className="text-[10px] text-muted-foreground/60">
                            Created: {new Date(item.createdDate).toLocaleDateString()}
                            {item.createdBy && ` by ${item.createdBy}`}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0 pt-0.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          title="Copy Key"
                          onClick={() => {
                            navigator.clipboard.writeText(item.key);
                            toast.success(`Copied: ${item.key}`);
                          }}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
