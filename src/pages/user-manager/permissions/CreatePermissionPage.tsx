import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  ShieldPlus,
  Lock,
  Copy,
  Check,
  Sparkles,
  Layers,
  ArrowRight,
  Search,
  Filter,
  Trash2,
  AlertCircle,
  Loader2,
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
  generatePermissionKey,
  type PermissionItem,
} from "@/services/user-manager/permissions.service";
import { PortalApi, type Portal } from "@/lib/api/client";

const FALLBACK_PORTALS = [
  { id: 1, name: "Leasing" },
  { id: 2, name: "Commission" },
  { id: 3, name: "Ticketing" },
  { id: 4, name: "Leave" },
  { id: 5, name: "Ranker" },
  { id: 6, name: "Scheduling" },
  { id: 7, name: "User Manager" },
];

export default function CreatePermissionPage() {
  // Portal API list state
  const [portals, setPortals] = useState<Array<{ id: number | string; name: string }>>([]);
  const [loadingPortals, setLoadingPortals] = useState<boolean>(true);

  // Form states
  const [selectedPortal, setSelectedPortal] = useState<string>("");
  const [permissionName, setPermissionName] = useState<string>("");
  const [description, setDescription] = useState<string>("");

  // Existing permissions list
  const [permissionsList, setPermissionsList] = useState<PermissionItem[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filterPortal, setFilterPortal] = useState<string>("all");

  // UI state
  const [copiedKey, setCopiedKey] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // 1. Fetch Portals using the exact User Management API
  useEffect(() => {
    let isMounted = true;

    async function loadPortals() {
      try {
        setLoadingPortals(true);
        const token = localStorage.getItem("token");

        // Primary: Same endpoint used in UsersPage & UserDetailPage
        const response = await fetch(
          "http://technocomm-dev.us-west-2.elasticbeanstalk.com/api/portals/get-all",
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: token ? `Bearer ${token}` : "",
            },
          },
        );

        if (response.ok) {
          const res = await response.json();
          if (res?.success && Array.isArray(res.data) && res.data.length > 0) {
            if (isMounted) {
              setPortals(res.data);
              return;
            }
          }
        }

        // Fallback: PortalApi client
        const clientRes = await PortalApi.getAll();
        if (clientRes?.success && Array.isArray(clientRes.data) && clientRes.data.length > 0) {
          if (isMounted) {
            setPortals(clientRes.data);
            return;
          }
        }
      } catch (err) {
        console.warn("Could not fetch portals from API, using default portals list:", err);
      } finally {
        if (isMounted) {
          setLoadingPortals(false);
        }
      }

      // Fallback if API is offline or returns empty
      if (isMounted) {
        setPortals(FALLBACK_PORTALS);
      }
    }

    loadPortals();
    return () => {
      isMounted = false;
    };
  }, []);

  // Load existing permissions
  const reloadPermissions = () => {
    setPermissionsList(permissionsService.getAll());
  };

  useEffect(() => {
    reloadPermissions();
  }, []);

  // 2. Auto-generated Key: combines portal name and permission name in snake_case format
  // Example: "Leasing" + "Upload Statement Button" -> "leasing_upload_statement_button"
  const generatedKey = useMemo(() => {
    if (!selectedPortal && !permissionName) return "";
    return generatePermissionKey(selectedPortal, permissionName);
  }, [selectedPortal, permissionName]);

  const handleCopyKey = () => {
    if (!generatedKey) return;
    navigator.clipboard.writeText(generatedKey);
    setCopiedKey(true);
    toast.success("Permission key copied to clipboard");
    setTimeout(() => setCopiedKey(false), 2000);
  };

  // Form submission handler (as requested, currently no backend API needed)
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedPortal.trim()) {
      toast.error("Please select a portal from the list");
      return;
    }
    if (!permissionName.trim()) {
      toast.error("Please enter a permission name");
      return;
    }
    if (!generatedKey.trim()) {
      toast.error("Invalid key generated");
      return;
    }

    // Check if key already exists
    const exists = permissionsList.some((p) => p.key.toLowerCase() === generatedKey.toLowerCase());
    if (exists) {
      toast.error(`Permission key "${generatedKey}" already exists`);
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedPortalObj = portals.find(
        (p) => p.name.toLowerCase() === selectedPortal.toLowerCase(),
      );

      permissionsService.create({
        portalName: selectedPortal,
        portalId: selectedPortalObj?.id,
        name: permissionName,
        key: generatedKey,
        description: description.trim() || undefined,
      });

      toast.success(`Permission "${generatedKey}" created successfully!`, {
        description: "It is now available to assign to users.",
      });

      // Clear input fields
      setPermissionName("");
      setDescription("");
      reloadPermissions();
    } catch (err: unknown) {
      toast.error((err as Error)?.message || "Failed to create permission");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCustom = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete the permission "${name}"?`)) {
      permissionsService.deleteCustom(id);
      toast.success("Custom permission removed");
      reloadPermissions();
    }
  };

  // Filter existing permissions list
  const filteredPermissions = useMemo(() => {
    return permissionsList.filter((p) => {
      const matchesPortal =
        filterPortal === "all" || p.portalName.toLowerCase() === filterPortal.toLowerCase();
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.key.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q));
      return matchesPortal && matchesSearch;
    });
  }, [permissionsList, filterPortal, searchTerm]);

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Top Navigation Tabs */}
      <PermissionsNavTabs totalPermissions={permissionsList.length} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Create Permission Form */}
        <div className="lg:col-span-5">
          <Card className="border-border shadow-xs">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <ShieldPlus className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold">Create Permission</CardTitle>
                  <CardDescription className="text-xs">
                    Define a new feature flag or action entitlement.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* 1. Portals Dropdown List */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="portal-select" className="text-xs font-semibold">
                      Portal <span className="text-destructive">*</span>
                    </Label>
                    {loadingPortals && (
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" /> Loading portals...
                      </span>
                    )}
                  </div>
                  <Select value={selectedPortal} onValueChange={setSelectedPortal}>
                    <SelectTrigger id="portal-select" className="h-9 w-full">
                      <SelectValue placeholder="Select portal..." />
                    </SelectTrigger>
                    <SelectContent>
                      {portals.map((p) => (
                        <SelectItem key={p.id} value={p.name}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">
                    Fetched dynamically from User Management portal service.
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
                    className="h-9"
                    required
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Human-readable label shown in authorization screens.
                  </p>
                </div>

                {/* 3. Key (Auto Generated - Disabled) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor="perm-key"
                      className="text-xs font-semibold flex items-center gap-1.5"
                    >
                      <Lock className="h-3 w-3 text-muted-foreground" />
                      Key{" "}
                      <span className="text-muted-foreground text-[11px] font-normal">
                        (Auto Generated)
                      </span>
                    </Label>
                    {generatedKey && (
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
                      value={generatedKey}
                      readOnly
                      disabled
                      placeholder="e.g. leasing_upload_statement_button"
                      className="h-9 font-mono text-xs bg-muted/60 text-foreground/80 border-dashed cursor-not-allowed pr-8 select-all"
                    />
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground/60">
                      <Lock className="h-3.5 w-3.5" />
                    </div>
                  </div>

                  <p className="text-[11px] text-muted-foreground">
                    Automatically generated format:{" "}
                    <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px] text-primary">
                      [portal]_[permission_name]
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
                    className="text-xs resize-none"
                  />
                </div>

                {/* Submission Button */}
                <div className="pt-2">
                  <Button
                    type="submit"
                    className="w-full h-9 gap-2 font-medium"
                    disabled={!selectedPortal || !permissionName.trim() || isSubmitting}
                  >
                    <ShieldPlus className="h-4 w-4" />
                    <span>Create Permission</span>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Quick Info Box */}
          <div className="mt-4 rounded-lg border border-border/70 bg-muted/20 p-3.5 text-xs text-muted-foreground flex items-start gap-2.5">
            <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-foreground">Permission Workflow</p>
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
                    List of all configured system and custom portal permissions.
                  </CardDescription>
                </div>
                <Link to="/admin/permissions/assign">
                  <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                    <span>Go to Assign</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
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

                <div className="w-full sm:w-[170px]">
                  <Select value={filterPortal} onValueChange={setFilterPortal}>
                    <SelectTrigger className="h-8 text-xs">
                      <Filter className="h-3 w-3 mr-1.5 text-muted-foreground" />
                      <SelectValue placeholder="All Portals" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Portals</SelectItem>
                      {portals.map((p) => (
                        <SelectItem key={p.id} value={p.name}>
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
                {filteredPermissions.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground">
                    <AlertCircle className="h-6 w-6 mx-auto mb-2 opacity-50" />
                    No permissions match your search or filter.
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
                          {item.isCustom && (
                            <Badge
                              variant="secondary"
                              className="text-[10px] px-1.5 py-0 h-4.5 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                            >
                              Custom
                            </Badge>
                          )}
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

                        {item.isCustom && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            title="Delete custom permission"
                            onClick={() => handleDeleteCustom(item.id, item.name)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
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
