import { useState, useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  Search,
  Shield,
  Copy,
  Users,
  Filter,
  PlusCircle,
  Loader2,
  Save,
  Check,
  User as UserIcon,
  RotateCcw,
  Eye,
  EyeOff,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  type PermissionAccessLevel,
  type UserAccessMap,
} from "@/services/user-manager/permissions.service";
import { usersApi, type BackendUser } from "@/lib/api/client";

// Color accents based on Portal Name
function getPortalBadgeClass(portalName: string): string {
  switch (portalName.toLowerCase()) {
    case "leasing":
      return "bg-blue-500/10 text-blue-600 border-blue-500/20";
    case "commission":
      return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
    case "ticketing":
      return "bg-amber-500/10 text-amber-600 border-amber-500/20";
    case "leave":
      return "bg-purple-500/10 text-purple-600 border-purple-500/20";
    case "ranker":
      return "bg-pink-500/10 text-pink-600 border-pink-500/20";
    case "scheduling":
      return "bg-cyan-500/10 text-cyan-600 border-cyan-500/20";
    default:
      return "bg-primary/10 text-primary border-primary/20";
  }
}

export default function AssignPermissionsPage() {
  // Users state
  const [users, setUsers] = useState<BackendUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState<boolean>(true);
  const [userSearchQuery, setUserSearchQuery] = useState<string>("");
  const [selectedUser, setSelectedUser] = useState<BackendUser | null>(null);
  const [isSearchFocused, setIsSearchFocused] = useState<boolean>(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Permissions state
  const [permissions, setPermissions] = useState<PermissionItem[]>([]);
  const [accessMap, setAccessMap] = useState<UserAccessMap>({});
  const [initialMap, setInitialMap] = useState<UserAccessMap>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  // Filters for permissions list
  const [permSearchQuery, setPermSearchQuery] = useState<string>("");
  const [selectedPortalFilter, setSelectedPortalFilter] = useState<string>("all");
  const [selectedLevelFilter, setSelectedLevelFilter] = useState<string>("all");

  // Load available permissions
  useEffect(() => {
    setPermissions(permissionsService.getAll());
  }, []);

  // Fetch users from users API
  useEffect(() => {
    let isMounted = true;
    async function loadUsers() {
      try {
        setLoadingUsers(true);
        const res = await usersApi.getAll({ page: 0, size: 50 });
        if (res?.success && Array.isArray(res.data) && res.data.length > 0) {
          if (isMounted) {
            setUsers(res.data);
            // Default select the first active user if available
            const firstActive = res.data.find((u) => u.active !== false) || res.data[0];
            if (firstActive) {
              handleSelectUser(firstActive);
            }
          }
        }
      } catch (err) {
        console.warn("Could not fetch users via API, using fallback list:", err);
        // Fallback user dataset for offline/dev demo
        const fallbackUsers: BackendUser[] = [
          {
            id: 101,
            fullName: "Arsalan Jadoon",
            email: "arsalan.jadoon@techno-communications.com",
            phone: "+1 555-0192",
            role: { id: 1, name: "Admin" },
            department: { id: 1, name: "Executive" },
            state: null,
            district: null,
            market: null,
            store: null,
            active: true,
          },
          {
            id: 102,
            fullName: "Sarah Jenkins",
            email: "s.jenkins@techno-communications.com",
            phone: "+1 555-0184",
            role: { id: 2, name: "Store Manager" },
            department: { id: 2, name: "Retail Operations" },
            state: null,
            district: null,
            market: null,
            store: null,
            active: true,
          },
          {
            id: 103,
            fullName: "Michael Chang",
            email: "m.chang@techno-communications.com",
            phone: "+1 555-0143",
            role: { id: 3, name: "District Manager" },
            department: { id: 3, name: "Sales" },
            state: null,
            district: null,
            market: null,
            store: null,
            active: true,
          },
        ];
        if (isMounted) {
          setUsers(fallbackUsers);
          handleSelectUser(fallbackUsers[0]);
        }
      } finally {
        if (isMounted) setLoadingUsers(false);
      }
    }

    loadUsers();
    return () => {
      isMounted = false;
    };
  }, []);

  // When a user is selected, load their assigned permission access levels
  const handleSelectUser = (user: BackendUser) => {
    setSelectedUser(user);
    setUserSearchQuery("");
    setIsSearchFocused(false);

    const savedLevels = permissionsService.getUserAccessLevels(user.id);
    setAccessMap(savedLevels);
    setInitialMap({ ...savedLevels });
    setHasUnsavedChanges(false);
  };

  // Set the mutually exclusive access level for a permission
  const handleSetPermissionLevel = (key: string, level: PermissionAccessLevel) => {
    setAccessMap((prev) => ({
      ...prev,
      [key]: level,
    }));
    setHasUnsavedChanges(true);
  };

  // Save changes for the selected user
  const handleSavePermissions = () => {
    if (!selectedUser) return;
    setSaving(true);
    try {
      permissionsService.saveUserAccessLevels(selectedUser.id, accessMap);
      setInitialMap({ ...accessMap });
      setHasUnsavedChanges(false);
      const activeCount = Object.values(accessMap).filter(
        (lvl) => lvl === "read" || lvl === "write",
      ).length;
      toast.success(`Permissions updated for ${selectedUser.fullName}`, {
        description: `${activeCount} active rights (Read / Read & Write) saved.`,
      });
    } catch (err: unknown) {
      toast.error((err as Error)?.message || "Failed to save permissions");
    } finally {
      setSaving(false);
    }
  };

  // Reset to initial
  const handleReset = () => {
    setAccessMap({ ...initialMap });
    setHasUnsavedChanges(false);
    toast.info("Changes reverted to previously saved state");
  };

  // Close search dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setIsSearchFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filtered users for search bar dropdown
  const filteredUsers = useMemo(() => {
    if (!userSearchQuery.trim()) return users.slice(0, 8);
    const q = userSearchQuery.toLowerCase();
    return users.filter((u) => {
      const nameMatch = u.fullName?.toLowerCase().includes(q);
      const emailMatch = u.email?.toLowerCase().includes(q);
      const roleMatch = u.role?.name?.toLowerCase().includes(q);
      const deptMatch = u.department?.name?.toLowerCase().includes(q);
      return nameMatch || emailMatch || roleMatch || deptMatch;
    });
  }, [users, userSearchQuery]);

  // Unique portals for filter pills
  const availablePortals = useMemo(() => {
    const set = new Set<string>();
    permissions.forEach((p) => {
      if (p.portalName) set.add(p.portalName);
    });
    return Array.from(set).sort();
  }, [permissions]);

  // Permission access level counts for the selected user
  const stats = useMemo(() => {
    let writeCount = 0;
    let readCount = 0;
    let hideCount = 0;
    permissions.forEach((p) => {
      const lvl = accessMap[p.key] || "hide";
      if (lvl === "write") writeCount++;
      else if (lvl === "read") readCount++;
      else hideCount++;
    });
    return {
      writeCount,
      readCount,
      hideCount,
      activeCount: writeCount + readCount,
    };
  }, [permissions, accessMap]);

  // Filter permissions for the main list
  const filteredPermissions = useMemo(() => {
    return permissions.filter((p) => {
      const matchesPortal =
        selectedPortalFilter === "all" ||
        p.portalName.toLowerCase() === selectedPortalFilter.toLowerCase();

      const currentLevel: PermissionAccessLevel = accessMap[p.key] || "hide";
      const matchesLevel = selectedLevelFilter === "all" || currentLevel === selectedLevelFilter;

      const q = permSearchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.key.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q));

      return matchesPortal && matchesLevel && matchesSearch;
    });
  }, [permissions, selectedPortalFilter, selectedLevelFilter, permSearchQuery, accessMap]);

  // Helper initials
  const getUserInitials = (name?: string) => {
    if (!name) return "U";
    const parts = name.trim().split(/\s+/);
    if (parts.length > 1) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Top Navigation Tabs */}
      <PermissionsNavTabs totalPermissions={permissions.length} />

      {/* 🌟 1. Primary Top Search Bar (User Search) */}
      <Card className="border-border bg-card shadow-xs">
        <CardContent className="p-4 sm:p-5">
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <label
                htmlFor="user-search-input"
                className="text-xs font-semibold text-foreground flex items-center gap-1.5"
              >
                <Users className="h-4 w-4 text-primary" />
                Select User to Assign Permissions
              </label>
              <span className="text-[11px] text-muted-foreground">
                Search through active employees to configure their granular access keys.
              </span>
            </div>

            <div ref={searchContainerRef} className="relative">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="user-search-input"
                  type="text"
                  placeholder={
                    selectedUser
                      ? `Searching users... (Currently selected: ${selectedUser.fullName})`
                      : "Search user by name, email, NTID, department..."
                  }
                  value={userSearchQuery}
                  onChange={(e) => {
                    setUserSearchQuery(e.target.value);
                    setIsSearchFocused(true);
                  }}
                  onFocus={() => setIsSearchFocused(true)}
                  className="h-11 pl-10 pr-10 text-sm bg-background/80 shadow-2xs"
                />
                {loadingUsers && (
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>

              {/* Autocomplete Dropdown */}
              {isSearchFocused && (
                <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-72 overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-lg animate-fade-in">
                  <div className="px-2 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    {userSearchQuery
                      ? `Search Results (${filteredUsers.length})`
                      : "Employees List"}
                  </div>

                  {filteredUsers.length === 0 ? (
                    <div className="p-4 text-center text-xs text-muted-foreground">
                      No matching users found for "{userSearchQuery}"
                    </div>
                  ) : (
                    filteredUsers.map((u) => {
                      const isSelected = selectedUser?.id === u.id;
                      return (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => handleSelectUser(u)}
                          className={`flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-xs transition-colors hover:bg-muted ${
                            isSelected
                              ? "bg-primary/10 text-primary font-semibold"
                              : "text-foreground"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[11px] font-bold text-primary">
                              {getUserInitials(u.fullName)}
                            </div>
                            <div className="truncate">
                              <p className="font-medium text-foreground truncate">{u.fullName}</p>
                              <p className="text-[10px] text-muted-foreground truncate">
                                {u.email}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {u.role?.name && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4.5">
                                {u.role.name}
                              </Badge>
                            )}
                            {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Selected User Banner & Permissions Matrix */}
      {selectedUser ? (
        <div className="space-y-4">
          {/* Selected User Info Header Card */}
          <div className="rounded-xl border border-border bg-card p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary text-base font-bold shadow-xs">
                {getUserInitials(selectedUser.fullName)}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-bold text-foreground">{selectedUser.fullName}</h2>
                  <Badge
                    variant="outline"
                    className="text-xs px-2 py-0.5 bg-primary/5 text-primary border-primary/20"
                  >
                    {selectedUser.role?.name || "Employee"}
                  </Badge>
                  {selectedUser.department?.name && (
                    <Badge variant="secondary" className="text-xs px-2 py-0.5">
                      {selectedUser.department.name}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {selectedUser.email}
                  {selectedUser.phone && ` • ${selectedUser.phone}`}
                </p>
              </div>
            </div>

            {/* Assignment Status & Actions */}
            <div className="flex items-center gap-3 self-end md:self-center flex-wrap">
              <div className="text-right mr-1">
                <span className="text-xs font-semibold text-foreground">
                  {stats.activeCount} of {permissions.length} Active
                </span>
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground justify-end mt-0.5">
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                    {stats.writeCount} Read and Write
                  </span>
                  <span>•</span>
                  <span className="text-sky-600 dark:text-sky-400 font-medium">
                    {stats.readCount} Read Only
                  </span>
                  <span>•</span>
                  <span>{stats.hideCount} Hide</span>
                </div>
              </div>

              {hasUnsavedChanges && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  className="h-8 text-xs gap-1 text-muted-foreground hover:text-foreground"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Revert</span>
                </Button>
              )}

              <Button
                size="sm"
                onClick={handleSavePermissions}
                disabled={saving || !hasUnsavedChanges}
                className="h-8 text-xs gap-1.5"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5" />
                    <span>Save Changes</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Permissions Filter and List Container */}
          <Card className="border-border shadow-xs">
            <CardHeader className="pb-3 border-b border-border/60">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    Granular Portal Permissions
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Configure granular access for each permission. Choose between Hide, Read Only,
                    or Read and Write.
                  </CardDescription>
                </div>
              </div>

              {/* Filtering Controls */}
              <div className="mt-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Filter permissions by name, key, or description..."
                    value={permSearchQuery}
                    onChange={(e) => setPermSearchQuery(e.target.value)}
                    className="h-8 pl-8 text-xs"
                  />
                </div>

                {/* Portal selection dropdown */}
                <div className="w-full sm:w-[190px]">
                  <Select value={selectedPortalFilter} onValueChange={setSelectedPortalFilter}>
                    <SelectTrigger className="h-8 text-xs">
                      <Filter className="h-3 w-3 mr-1.5 text-muted-foreground" />
                      <SelectValue placeholder="All Portals" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Portals ({permissions.length})</SelectItem>
                      {availablePortals.map((portal) => {
                        const count = permissions.filter((p) => p.portalName === portal).length;
                        return (
                          <SelectItem key={portal} value={portal}>
                            {portal} ({count})
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {/* Access level dropdown filter */}
                <div className="w-full sm:w-[170px]">
                  <Select value={selectedLevelFilter} onValueChange={setSelectedLevelFilter}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="All Access Levels" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Levels ({permissions.length})</SelectItem>
                      <SelectItem value="write">Read and Write ({stats.writeCount})</SelectItem>
                      <SelectItem value="read">Read Only ({stats.readCount})</SelectItem>
                      <SelectItem value="hide">Hide ({stats.hideCount})</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="divide-y divide-border/60">
                {filteredPermissions.length === 0 ? (
                  <div className="p-10 text-center space-y-2">
                    <Shield className="h-8 w-8 mx-auto text-muted-foreground/50" />
                    <p className="text-sm font-medium text-foreground">No permissions found</p>
                    <p className="text-xs text-muted-foreground">
                      Try adjusting your search query or filter criteria.
                    </p>
                    <Link to="/admin/permissions/create">
                      <Button variant="outline" size="sm" className="mt-2 text-xs gap-1.5">
                        <PlusCircle className="h-3.5 w-3.5" />
                        Create New Permission
                      </Button>
                    </Link>
                  </div>
                ) : (
                  filteredPermissions.map((perm) => {
                    const currentLevel: PermissionAccessLevel = accessMap[perm.key] || "hide";

                    return (
                      <div
                        key={perm.id}
                        className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                          currentLevel === "write"
                            ? "bg-emerald-500/5 hover:bg-emerald-500/8"
                            : currentLevel === "read"
                              ? "bg-sky-500/5 hover:bg-sky-500/8"
                              : "hover:bg-muted/30"
                        }`}
                      >
                        <div className="space-y-1.5 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-semibold text-foreground">
                              {perm.name}
                            </span>
                            <Badge
                              variant="outline"
                              className={`text-[10px] px-1.5 py-0 h-4.5 font-medium ${getPortalBadgeClass(
                                perm.portalName,
                              )}`}
                            >
                              {perm.portalName}
                            </Badge>
                            {perm.isCustom && (
                              <Badge
                                variant="secondary"
                                className="text-[10px] px-1.5 py-0 h-4.5 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                              >
                                Custom
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            <code className="text-[11px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                              {perm.key}
                            </code>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 text-muted-foreground hover:text-foreground"
                              title="Copy Key"
                              onClick={() => {
                                navigator.clipboard.writeText(perm.key);
                                toast.success(`Copied: ${perm.key}`);
                              }}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>

                          {perm.description && (
                            <p className="text-[11px] text-muted-foreground line-clamp-2">
                              {perm.description}
                            </p>
                          )}
                        </div>

                        {/* 🌟 3 Mutually Exclusive Buttons: "Hide", "Read Only", "Read and Write" */}
                        <div
                          role="group"
                          aria-label={`Access level for ${perm.name}`}
                          className="inline-flex items-center rounded-lg border border-border/80 bg-muted/40 p-1 shrink-0 self-start sm:self-center"
                        >
                          {/* 1. Hide */}
                          <button
                            type="button"
                            onClick={() => handleSetPermissionLevel(perm.key, "hide")}
                            title="Hide: No access to this feature"
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md transition-all font-medium ${
                              currentLevel === "hide"
                                ? "bg-background text-foreground font-semibold shadow-xs border border-border"
                                : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                            }`}
                          >
                            <EyeOff className="h-3.5 w-3.5" />
                            <span>Hide</span>
                          </button>

                          {/* 2. Read Only */}
                          <button
                            type="button"
                            onClick={() => handleSetPermissionLevel(perm.key, "read")}
                            title="Read Only: View only access"
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md transition-all font-medium ${
                              currentLevel === "read"
                                ? "bg-sky-500/15 text-sky-600 dark:text-sky-400 font-semibold shadow-xs border border-sky-500/30"
                                : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                            }`}
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>Read Only</span>
                          </button>

                          {/* 3. Read and Write */}
                          <button
                            type="button"
                            onClick={() => handleSetPermissionLevel(perm.key, "write")}
                            title="Read and Write: Full operational access"
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md transition-all font-medium ${
                              currentLevel === "write"
                                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold shadow-xs border border-emerald-500/30"
                                : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                            }`}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            <span>Read and Write</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        /* Empty State: No User Selected */
        <Card className="border-dashed p-10 text-center space-y-3">
          <UserIcon className="h-10 w-10 mx-auto text-muted-foreground/60" />
          <div>
            <h3 className="text-sm font-semibold text-foreground">No User Selected</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              Please use the search bar above to select an employee to view and assign portal
              permissions.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
