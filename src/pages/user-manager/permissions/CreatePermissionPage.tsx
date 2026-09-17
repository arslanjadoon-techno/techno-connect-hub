import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  ShieldPlus,
  Layers,
  Search,
  Filter,
  ArrowRight,
  Sparkles,
  RefreshCw,
  Loader2,
  AlertCircle,
  Copy,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PermissionsNavTabs } from "./PermissionsNavTabs";
import {
  permissionsService,
  type PermissionItem,
} from "@/services/user-manager/permissions.service";
import { portalsService, type PortalItem } from "@/services/portals/portals.service";

// Helper to format portal names cleanly (e.g. "ranker" -> "Ranker", "ticketing" -> "Ticketing", "commission" -> "Commission")
function formatPortalName(name?: string): string {
  if (!name) return "";
  return name
    .split(/[\s_-]+/)
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : ""))
    .join(" ");
}

export default function CreatePermissionPage() {
  // Modal state for creating new permission
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);

  // Portal API list state
  const [portals, setPortals] = useState<PortalItem[]>([]);
  const [loadingPortals, setLoadingPortals] = useState<boolean>(true);

  // Form states - Only portal selection, permission name, and description (no key generation)
  const [selectedPortalId, setSelectedPortalId] = useState<string>("");
  const [permissionName, setPermissionName] = useState<string>("");
  const [description, setDescription] = useState<string>("");

  // Existing permissions list
  const [permissionsList, setPermissionsList] = useState<PermissionItem[]>([]);
  const [loadingPermissions, setLoadingPermissions] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filterPortal, setFilterPortal] = useState<string>("all");

  // UI state for submission & enable/disable toggle (API pending backend readiness)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [permissionStatusMap, setPermissionStatusMap] = useState<Record<number, boolean>>({});

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

  // Submit new permission via real API (portalId, name, optional description)
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
        setIsCreateModalOpen(false);
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

  // Toggle permission enable/disable status (UI ready; API to be connected once endpoint is available)
  const handleToggleStatus = (item: PermissionItem) => {
    const isCurrentlyEnabled = permissionStatusMap[item.id] ?? true;
    const nextStatus = !isCurrentlyEnabled;

    setPermissionStatusMap((prev) => ({
      ...prev,
      [item.id]: nextStatus,
    }));

    toast.info(`Permission "${item.name}" ${nextStatus ? "enabled" : "disabled"}`);
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

      {/* Available Permissions Section (Full Width) */}
      <div className="w-full space-y-4">
        <Card className="border-border shadow-xs w-full">
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

              {/* Top Right Actions: Refresh, Create Permission Button, Go to Assign */}
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
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

                <Button
                  size="sm"
                  onClick={() => setIsCreateModalOpen(true)}
                  className="h-8 gap-1.5 text-xs font-semibold shadow-xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Create Permission</span>
                </Button>
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

              <div className="w-full sm:w-[220px]">
                <Select value={filterPortal} onValueChange={setFilterPortal}>
                  <SelectTrigger className="h-8 text-xs">
                    <Filter className="h-3 w-3 mr-1.5 text-muted-foreground" />
                    <SelectValue placeholder="All Portals" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Portals ({permissionsList.length})</SelectItem>
                    {portals.map((p) => {
                      const count = permissionsList.filter(
                        (item) =>
                          String(item.portalId) === String(p.id) ||
                          item.portalName?.toLowerCase() === p.name.toLowerCase(),
                      ).length;
                      return (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {formatPortalName(p.name)} ({count})
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="divide-y divide-border/60 max-h-[640px] overflow-y-auto">
              {loadingPermissions ? (
                <div className="p-12 text-center text-xs text-muted-foreground space-y-2">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                  <p>Loading permissions from server...</p>
                </div>
              ) : filteredPermissions.length === 0 ? (
                <div className="p-10 text-center space-y-3">
                  <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground/50" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {permissionsList.length === 0
                        ? "No permissions created yet"
                        : "No permissions match your search or filter criteria"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {permissionsList.length === 0
                        ? "Click the 'Create Permission' button to define your first permission."
                        : "Try adjusting your search terms or clearing your portal filter."}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setIsCreateModalOpen(true)}
                    className="h-8 gap-1.5 text-xs font-semibold"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Create Permission</span>
                  </Button>
                </div>
              ) : (
                filteredPermissions.map((item) => {
                  const isEnabled = permissionStatusMap[item.id] ?? true;

                  return (
                    <div
                      key={item.id}
                      className="p-4 hover:bg-muted/40 transition-colors flex items-start justify-between gap-4"
                    >
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-xs text-foreground">{item.name}</span>
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0 h-4.5 bg-primary/5 text-primary border-primary/20"
                          >
                            {formatPortalName(item.portalName)}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 text-muted-foreground hover:text-foreground"
                            title="Copy Permission Name"
                            onClick={() => {
                              navigator.clipboard.writeText(item.name);
                              toast.success(`Copied: "${item.name}"`);
                            }}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>

                        {item.description && (
                          <p className="text-[11px] text-muted-foreground line-clamp-2 max-w-3xl">
                            {item.description}
                          </p>
                        )}

                        {item.createdDate && (
                          <p className="text-[10px] text-muted-foreground/70">
                            Created: {new Date(item.createdDate).toLocaleDateString()}
                            {item.createdBy && ` by ${item.createdBy}`}
                          </p>
                        )}
                      </div>

                      {/* Actions: Enable/Disable Toggle button */}
                      <div className="flex items-center gap-2 shrink-0 pt-0.5">
                        <div
                          className={`flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs transition-colors ${
                            isEnabled
                              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
                              : "bg-muted/60 border-border text-muted-foreground"
                          }`}
                        >
                          <span className="text-[11px] font-medium select-none">
                            {isEnabled ? "Enabled" : "Disabled"}
                          </span>
                          <Switch
                            checked={isEnabled}
                            onCheckedChange={() => handleToggleStatus(item)}
                            aria-label={`Toggle status for ${item.name}`}
                            className="scale-75 origin-right"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Info Box */}
        <div className="rounded-lg border border-border/70 bg-muted/20 p-3.5 text-xs text-muted-foreground flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-2.5 min-w-0">
            <Sparkles className="h-4 w-4 text-primary shrink-0" />
            <span>
              Once permissions are created here, head over to{" "}
              <Link to="/admin/permissions/assign" className="text-primary underline font-medium">
                Assign Permissions
              </Link>{" "}
              to grant or configure access levels for specific employees.
            </span>
          </div>
          <Link to="/admin/permissions/assign" className="shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1 text-primary hover:text-primary"
            >
              <span>Assign Rights</span>
              <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>
      </div>

      {/* 🌟 Create New Permission Modal Dialog */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold flex items-center gap-2">
              <ShieldPlus className="h-5 w-5 text-primary" />
              New Permission Entry
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Create a granular system or UI permission tied to a specific portal.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            {/* 1. Portal Select Dropdown */}
            <div className="space-y-1.5">
              <Label htmlFor="modal-portal-select" className="text-xs font-semibold">
                Portal <span className="text-destructive">*</span>
              </Label>
              <Select
                value={selectedPortalId}
                onValueChange={setSelectedPortalId}
                disabled={loadingPortals || isSubmitting}
              >
                <SelectTrigger id="modal-portal-select" className="h-9 w-full text-xs">
                  <SelectValue
                    placeholder={loadingPortals ? "Loading portals..." : "Select portal..."}
                  />
                </SelectTrigger>
                <SelectContent>
                  {portals.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {formatPortalName(p.name)}
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
              <Label htmlFor="modal-perm-name" className="text-xs font-semibold">
                Permission Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="modal-perm-name"
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

            {/* 3. Description (Optional) */}
            <div className="space-y-1.5">
              <Label htmlFor="modal-perm-desc" className="text-xs font-semibold">
                Description{" "}
                <span className="text-muted-foreground text-[11px] font-normal">(Optional)</span>
              </Label>
              <Textarea
                id="modal-perm-desc"
                placeholder="Provide additional details regarding what action this permission controls..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                disabled={isSubmitting}
                className="text-xs resize-none"
              />
            </div>

            <DialogFooter className="pt-3 gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateModalOpen(false)}
                disabled={isSubmitting}
                className="h-9 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="h-9 gap-2 font-medium text-xs"
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
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
