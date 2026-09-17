import { useState, useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  Search,
  Shield,
  Users,
  Filter,
  PlusCircle,
  Loader2,
  Check,
  User as UserIcon,
  Eye,
  EyeOff,
  Pencil,
  RefreshCw,
  Trash2,
  X,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PermissionsNavTabs } from "./PermissionsNavTabs";
import {
  permissionsService,
  type PermissionAccessLevel,
  type PermissionItem,
  type UserPermissionItem,
  type UserAccessMap,
} from "@/services/user-manager/permissions.service";
import { usersService } from "@/services/user-manager/users.service";
import { type BackendUser } from "@/lib/api/client";

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

function normalizeAccessLevel(val: unknown): PermissionAccessLevel {
  if (!val) return "hide";
  const s = String(val).toLowerCase().trim();
  if (s === "write" || s === "read_write" || s === "read_and_write" || s === "read and write") {
    return "write";
  }
  if (s === "read" || s === "read_only" || s === "readonly" || s === "read only") {
    return "read";
  }
  return "hide";
}

function parseUserPermissionsResponse(data: unknown): UserPermissionItem[] {
  let list: any[] = [];
  if (Array.isArray(data)) {
    list = data;
  } else if (data && typeof data === "object" && Array.isArray((data as any).permissions)) {
    list = (data as any).permissions;
  } else if (data && typeof data === "object" && Array.isArray((data as any).data)) {
    list = (data as any).data;
  }

  return list.map((item: any, idx: number) => {
    const permissionId = Number(item.permissionId ?? item.id ?? idx + 1);
    const portalId = Number(item.portalId ?? 0);
    const portalName = String(item.portalName ?? item.portal?.name ?? "General");
    const permissionKey = String(item.permissionKey ?? item.key ?? item.code ?? "");
    const permissionName = String(
      (item.permissionName ?? item.name ?? permissionKey) || `Permission #${permissionId}`,
    );
    const permissionDescription = item.permissionDescription ?? item.description ?? "";
    const accessLevel = normalizeAccessLevel(item.accessLevel ?? item.access_level ?? item.level);

    return {
      permissionId,
      permissionKey,
      permissionName,
      permissionDescription,
      portalId,
      portalName,
      accessLevel,
    };
  });
}

// Helper to retrieve currently logged in user information from localStorage
function getStoredLoggedInUser(): {
  id: number | string;
  fullName?: string;
  email?: string;
  roleName?: string;
  departmentName?: string;
} | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem("user");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed) {
        const id = parsed.id ?? parsed.userId;
        if (id != null) {
          const roleName =
            parsed.role?.name ||
            parsed.roleName ||
            (typeof parsed.role === "string" ? parsed.role : undefined);
          const departmentName =
            parsed.department?.name ||
            parsed.departmentName ||
            (typeof parsed.department === "string" ? parsed.department : undefined);
          return {
            id,
            fullName:
              parsed.fullName ||
              `${parsed.firstName || ""} ${parsed.lastName || ""}`.trim() ||
              parsed.email ||
              "Logged-in User",
            email: parsed.email,
            roleName,
            departmentName,
          };
        }
      }
    }
    const directUserId = window.localStorage.getItem("userId");
    if (directUserId) {
      return { id: directUserId, fullName: "Logged-in User" };
    }
  } catch (err) {
    console.error("Failed to read user from localStorage:", err);
  }
  return null;
}

export default function AssignPermissionsPage() {
  // Users state
  const [users, setUsers] = useState<BackendUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState<boolean>(true);
  const [userSearchQuery, setUserSearchQuery] = useState<string>("");
  const [selectedUser, setSelectedUser] = useState<BackendUser | null>(null);
  const [isSearchFocused, setIsSearchFocused] = useState<boolean>(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Selected User's Permissions state (strictly populated from GET /api/user-permissions/{userId})
  const [userPermissions, setUserPermissions] = useState<UserPermissionItem[]>([]);
  const [loadingUserPerms, setLoadingUserPerms] = useState<boolean>(false);
  const [accessMap, setAccessMap] = useState<UserAccessMap>({});

  // Available system permissions (for the Assign Dropdown)
  const [availableSystemPermissions, setAvailableSystemPermissions] = useState<PermissionItem[]>(
    [],
  );
  const [loadingAvailablePermissions, setLoadingAvailablePermissions] = useState<boolean>(false);
  const [assignSelectedPerm, setAssignSelectedPerm] = useState<PermissionItem | null>(null);
  const [assignAccessLevel, setAssignAccessLevel] = useState<PermissionAccessLevel>("write");
  const [assignPermSearch, setAssignPermSearch] = useState<string>("");
  const [isAssignPermDropdownOpen, setIsAssignPermDropdownOpen] = useState<boolean>(false);
  const [assigningPerm, setAssigningPerm] = useState<boolean>(false);
  const assignDropdownRef = useRef<HTMLDivElement>(null);

  // Unassign permission state for confirmation dialog
  const [permToDelete, setPermToDelete] = useState<{ id: number; name: string } | null>(null);
  const [deletingPerm, setDeletingPerm] = useState<boolean>(false);

  // Filters for user permissions list
  const [permSearchQuery, setPermSearchQuery] = useState<string>("");
  const [selectedPortalFilter, setSelectedPortalFilter] = useState<string>("all");
  const [selectedLevelFilter, setSelectedLevelFilter] = useState<string>("all");

  // Load user permissions directly from GET /api/user-permissions/{userId}
  const loadUserPermissions = async (userId: number | string) => {
    setLoadingUserPerms(true);
    try {
      const res = await permissionsService.getUserPermissions(userId);
      let items: UserPermissionItem[] = [];
      if (res?.success && res.data) {
        items = parseUserPermissionsResponse(res.data);
      } else if (Array.isArray(res)) {
        items = parseUserPermissionsResponse(res);
      }
      setUserPermissions(items);

      // Populate access level mapping
      const map: UserAccessMap = {};
      items.forEach((p) => {
        map[p.permissionId] = p.accessLevel;
      });
      setAccessMap(map);
    } catch (err) {
      console.error(`Could not fetch permissions for user #${userId}:`, err);
      toast.error("Failed to load user permissions from server");
      setUserPermissions([]);
      setAccessMap({});
    } finally {
      setLoadingUserPerms(false);
    }
  };

  // Initial load: pick logged-in user from localStorage by default, and load user list
  useEffect(() => {
    let isMounted = true;

    // 1. Check localStorage for currently logged in user
    const stored = getStoredLoggedInUser();
    if (stored) {
      const initialUser: BackendUser = {
        id: Number(stored.id),
        fullName: stored.fullName || "Current User",
        email: stored.email || "",
        role: { id: 0, name: stored.roleName || "Employee" },
        department: stored.departmentName
          ? ({ id: 0, name: stored.departmentName } as any)
          : undefined,
        active: true,
      } as any;

      if (isMounted) {
        setSelectedUser(initialUser);
        loadUserPermissions(stored.id);
      }
    }

    // 2. Fetch all registered users for the search bar dropdown
    async function loadUsersList() {
      try {
        setLoadingUsers(true);
        const res = await usersService.getAll({ page: 0, size: 100 });
        if (res?.success && Array.isArray(res.data) && res.data.length > 0) {
          if (!isMounted) return;
          setUsers(res.data);

          // If we have stored user, match with full profile from backend
          if (stored) {
            const matched = res.data.find((u) => String(u.id) === String(stored.id));
            if (matched) {
              setSelectedUser(matched);
              return;
            }
          }

          // If no stored user was found in localStorage, default to the first active user
          if (!stored) {
            const firstActive = res.data.find((u) => u.active !== false) || res.data[0];
            if (firstActive) {
              setSelectedUser(firstActive);
              loadUserPermissions(firstActive.id);
            }
          }
        }
      } catch (err) {
        console.error("Failed to load users list from server:", err);
        toast.error("Failed to load users list");
      } finally {
        if (isMounted) setLoadingUsers(false);
      }
    }

    loadUsersList();

    // 3. Fetch all system permissions for the Assign dropdown
    async function loadAllSystemPermissions() {
      try {
        setLoadingAvailablePermissions(true);
        const res = await permissionsService.getAll();
        if (res?.success && Array.isArray(res.data)) {
          if (!isMounted) return;
          setAvailableSystemPermissions(res.data);
        }
      } catch (err) {
        console.error("Failed to load available system permissions:", err);
      } finally {
        if (isMounted) setLoadingAvailablePermissions(false);
      }
    }

    loadAllSystemPermissions();

    return () => {
      isMounted = false;
    };
  }, []);

  // When a user is picked from search bar
  const handleSelectUser = (user: BackendUser) => {
    setSelectedUser(user);
    setUserSearchQuery("");
    setIsSearchFocused(false);
    loadUserPermissions(user.id);
  };

  // Assign single permission to selected user via PUT /api/user-permissions/assign
  const handleAssignPermission = async () => {
    if (!selectedUser) {
      toast.error("Please select a user first");
      return;
    }
    if (!assignSelectedPerm) {
      toast.error("Please select a permission to assign");
      return;
    }

    setAssigningPerm(true);
    try {
      const payload = {
        userId: Number(selectedUser.id),
        permissions: [
          {
            permissionId: Number(assignSelectedPerm.id),
            accessLevel: assignAccessLevel,
          },
        ],
      };

      const res = await permissionsService.assign(payload);
      if (res?.success) {
        toast.success(
          res.message ||
            `Permission "${assignSelectedPerm.name}" assigned as ${
              assignAccessLevel === "write"
                ? "Read and Write"
                : assignAccessLevel === "read"
                  ? "Read Only"
                  : "Hidden"
            } successfully.`,
        );
        setAssignSelectedPerm(null);
        setAssignPermSearch("");
        setIsAssignPermDropdownOpen(false);
        // Reload user permissions to display newly assigned item immediately below
        await loadUserPermissions(selectedUser.id);
      } else {
        toast.error(res?.message || "Failed to assign permission");
      }
    } catch (err: unknown) {
      console.error("Assign permission error:", err);
      toast.error((err as Error)?.message || "Failed to assign permission");
    } finally {
      setAssigningPerm(false);
    }
  };

  // Set the mutually exclusive access level for a permission (updates immediately via API)
  const handleSetPermissionLevel = async (permissionId: number, level: PermissionAccessLevel) => {
    if (!selectedUser) return;
    const prevLevel = accessMap[permissionId];
    if (prevLevel === level) return;

    setAccessMap((prev) => ({
      ...prev,
      [permissionId]: level,
    }));

    try {
      const payload = {
        userId: Number(selectedUser.id),
        permissions: [
          {
            permissionId,
            accessLevel: level,
          },
        ],
      };
      const res = await permissionsService.assign(payload);
      if (res?.success) {
        const label =
          level === "write" ? "Read and Write" : level === "read" ? "Read Only" : "Hidden";
        toast.success(`Access updated to ${label}`);
      } else {
        toast.error(res?.message || "Failed to update access level");
        setAccessMap((prev) => ({
          ...prev,
          [permissionId]: prevLevel,
        }));
      }
    } catch (err: unknown) {
      console.error("Failed to update permission level:", err);
      toast.error((err as Error)?.message || "Failed to update access level");
      setAccessMap((prev) => ({
        ...prev,
        [permissionId]: prevLevel,
      }));
    }
  };

  // Unassign permission from the selected user
  const handleConfirmUnassign = async () => {
    if (!selectedUser || !permToDelete) return;
    const { id, name } = permToDelete;
    setDeletingPerm(true);
    try {
      await permissionsService.unassign(selectedUser.id, id);
      setUserPermissions((prev) => prev.filter((p) => p.permissionId !== id));
      setAccessMap((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      toast.success(`Permission "${name}" unassigned from ${selectedUser.fullName}`);
    } catch (err: unknown) {
      console.error("Failed to unassign permission:", err);
      toast.error((err as Error)?.message || "Failed to unassign permission");
    } finally {
      setDeletingPerm(false);
      setPermToDelete(null);
    }
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
      if (assignDropdownRef.current && !assignDropdownRef.current.contains(event.target as Node)) {
        setIsAssignPermDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filtered available permissions for the Assign dropdown
  const filteredAvailablePermissions = useMemo(() => {
    if (!assignPermSearch.trim()) return availableSystemPermissions;
    const q = assignPermSearch.toLowerCase().trim();
    return availableSystemPermissions.filter((p) => {
      return (
        p.name?.toLowerCase().includes(q) ||
        p.portalName?.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q))
      );
    });
  }, [availableSystemPermissions, assignPermSearch]);

  // Filtered users for search bar dropdown
  const filteredUsers = useMemo(() => {
    if (!userSearchQuery.trim()) return users.slice(0, 10);
    const q = userSearchQuery.toLowerCase().trim();
    return users.filter((u) => {
      const nameMatch =
        u.fullName?.toLowerCase().includes(q) ||
        `${u.firstName || ""} ${u.lastName || ""}`.toLowerCase().includes(q);
      const emailMatch = u.email?.toLowerCase().includes(q);
      const phoneMatch = u.phone?.toLowerCase().includes(q);
      const roleStr = typeof u.role === "string" ? u.role : u.role?.name;
      const roleMatch = roleStr?.toLowerCase().includes(q);
      const deptStr = typeof u.department === "string" ? u.department : u.department?.name;
      const deptMatch = deptStr?.toLowerCase().includes(q);
      return nameMatch || emailMatch || phoneMatch || roleMatch || deptMatch;
    });
  }, [users, userSearchQuery]);

  // Unique portals for filter pills based on this user's permissions
  const availablePortals = useMemo(() => {
    const set = new Set<string>();
    userPermissions.forEach((p) => {
      if (p.portalName) set.add(p.portalName);
    });
    return Array.from(set).sort();
  }, [userPermissions]);

  // Permission access level counts for the selected user
  const stats = useMemo(() => {
    let writeCount = 0;
    let readCount = 0;
    let hideCount = 0;
    userPermissions.forEach((p) => {
      const lvl = accessMap[p.permissionId] || p.accessLevel || "hide";
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
  }, [userPermissions, accessMap]);

  // Filter permissions for the main list
  const filteredPermissions = useMemo(() => {
    return userPermissions.filter((p) => {
      const matchesPortal =
        selectedPortalFilter === "all" ||
        p.portalName.toLowerCase() === selectedPortalFilter.toLowerCase();

      const currentLevel: PermissionAccessLevel =
        accessMap[p.permissionId] || p.accessLevel || "hide";
      const matchesLevel = selectedLevelFilter === "all" || currentLevel === selectedLevelFilter;

      const q = permSearchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.permissionName.toLowerCase().includes(q) ||
        p.permissionKey.toLowerCase().includes(q) ||
        (p.permissionDescription && p.permissionDescription.toLowerCase().includes(q)) ||
        p.portalName.toLowerCase().includes(q);

      return matchesPortal && matchesLevel && matchesSearch;
    });
  }, [userPermissions, selectedPortalFilter, selectedLevelFilter, permSearchQuery, accessMap]);

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
      <PermissionsNavTabs totalPermissions={userPermissions.length} />

      {/* 🌟 1. Top Section: User Info (Left 50%) & Select Employee to Assign Permission (Right 50%) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
        {/* 1st (Pehly): User Info Card (50% width) */}
        <Card className="border-border bg-card shadow-xs flex flex-col justify-between">
          <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full gap-4">
            {selectedUser ? (
              <>
                <div className="flex items-center gap-3.5">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary text-base font-bold shadow-xs">
                    {getUserInitials(selectedUser.fullName)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base font-bold text-foreground truncate">
                        {selectedUser.fullName}
                      </h2>
                      {selectedUser.role?.name && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4.5">
                          {selectedUser.role.name}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {selectedUser.email}
                      {selectedUser.phone && ` • ${selectedUser.phone}`}
                    </p>
                  </div>
                </div>

                {/* Assignment Status */}
                <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs flex-wrap gap-2">
                  <span className="font-semibold text-foreground">
                    {stats.activeCount} of {userPermissions.length} Active
                  </span>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground flex-wrap">
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
              </>
            ) : (
              <div className="flex items-center gap-3 text-muted-foreground my-auto p-2">
                <UserIcon className="h-8 w-8 opacity-40 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-foreground">No Employee Selected</p>
                  <p className="text-[11px] text-muted-foreground">
                    Select an employee from the right to view details.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 2nd (Aagy): Select Employee to Assign Permission Card (50% width) */}
        <Card className="border-border bg-card shadow-xs flex flex-col justify-between">
          <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <label
                htmlFor="user-search-input"
                className="text-xs font-semibold text-foreground flex items-center gap-1.5"
              >
                <Users className="h-4 w-4 text-primary" />
                Select Employee to Assign Permission
              </label>
              <span className="text-[11px] text-muted-foreground">
                Search employee by name or email
              </span>
            </div>

            <div ref={searchContainerRef} className="relative pt-1">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="user-search-input"
                  type="text"
                  autoComplete="off"
                  placeholder={
                    selectedUser
                      ? `${selectedUser.fullName} (Click to switch)`
                      : "Search user by name, email, department, or role..."
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
                      : `Registered Employees (${users.length})`}
                  </div>

                  {loadingUsers ? (
                    <div className="p-4 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading employees...
                    </div>
                  ) : filteredUsers.length === 0 ? (
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
          </CardContent>
        </Card>
      </div>

      {/* 2. Selected User Permissions Matrix */}
      {selectedUser ? (
        <div className="space-y-4">
          {/* Assign Available Permission to User */}
          <Card className="border-border bg-card shadow-xs">
            <CardContent className="p-3.5 sm:p-4">
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <PlusCircle className="h-4 w-4 text-primary" />
                    <span>Assign Available Permission</span>
                  </label>
                  <span className="text-[11px] text-muted-foreground">
                    Search and pick a system permission to assign to{" "}
                    <strong className="text-foreground">{selectedUser.fullName}</strong>.
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-1">
                  {/* Searchable Combobox / Dropdown for Available Permissions */}
                  <div ref={assignDropdownRef} className="relative flex-1">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                      <Input
                        type="text"
                        placeholder={
                          loadingAvailablePermissions
                            ? "Loading available permissions..."
                            : "Search & select available permission... (e.g. Upload Statement, Ticketing...)"
                        }
                        value={assignSelectedPerm ? assignSelectedPerm.name : assignPermSearch}
                        onChange={(e) => {
                          setAssignSelectedPerm(null);
                          setAssignPermSearch(e.target.value);
                          setIsAssignPermDropdownOpen(true);
                        }}
                        onFocus={() => setIsAssignPermDropdownOpen(true)}
                        className="h-9 pl-8 pr-8 text-xs font-medium"
                      />
                      {assignSelectedPerm ? (
                        <button
                          type="button"
                          onClick={() => {
                            setAssignSelectedPerm(null);
                            setAssignPermSearch("");
                          }}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs p-0.5 rounded"
                          title="Clear selection"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      ) : null}
                    </div>

                    {/* Autocomplete Dropdown */}
                    {isAssignPermDropdownOpen && (
                      <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-border bg-popover text-popover-foreground shadow-lg text-xs divide-y divide-border/50">
                        {loadingAvailablePermissions ? (
                          <div className="p-4 text-center text-muted-foreground flex items-center justify-center gap-2">
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                            <span>Loading system permissions...</span>
                          </div>
                        ) : filteredAvailablePermissions.length === 0 ? (
                          <div className="p-3 text-center text-muted-foreground">
                            No permissions match &quot;{assignPermSearch}&quot;
                          </div>
                        ) : (
                          filteredAvailablePermissions.map((p) => {
                            const isSelected = assignSelectedPerm?.id === p.id;
                            const isAlreadyAssigned = userPermissions.some(
                              (up) =>
                                Number(up.permissionId) === Number(p.id) ||
                                (Boolean(p.name) &&
                                  Boolean(up.permissionName) &&
                                  up.permissionName.toLowerCase() === p.name.toLowerCase()),
                            );
                            return (
                              <button
                                key={p.id}
                                type="button"
                                disabled={isAlreadyAssigned}
                                onClick={() => {
                                  if (isAlreadyAssigned) return;
                                  setAssignSelectedPerm(p);
                                  setAssignPermSearch("");
                                  setIsAssignPermDropdownOpen(false);
                                }}
                                className={`w-full text-left p-2.5 transition-colors flex items-center justify-between gap-2 ${
                                  isAlreadyAssigned
                                    ? "opacity-50 cursor-not-allowed bg-muted/30 select-none"
                                    : "hover:bg-muted/70 cursor-pointer"
                                } ${isSelected ? "bg-primary/10 font-medium text-primary" : ""}`}
                              >
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span
                                      className={`font-semibold text-xs truncate ${
                                        isAlreadyAssigned
                                          ? "text-muted-foreground"
                                          : "text-foreground"
                                      }`}
                                    >
                                      {p.name}
                                    </span>
                                    <Badge
                                      variant="outline"
                                      className={`text-[9px] px-1.5 py-0 h-4 ${getPortalBadgeClass(p.portalName)}`}
                                    >
                                      {p.portalName}
                                    </Badge>
                                    {isAlreadyAssigned && (
                                      <Badge
                                        variant="secondary"
                                        className="text-[9px] px-1.5 py-0 h-4 bg-muted text-muted-foreground font-normal border border-border/50"
                                      >
                                        Already Assigned
                                      </Badge>
                                    )}
                                  </div>
                                  {p.description && (
                                    <p className="text-[11px] text-muted-foreground/80 line-clamp-1 mt-0.5">
                                      {p.description}
                                    </p>
                                  )}
                                </div>
                                {isSelected && (
                                  <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                                )}
                              </button>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>

                  {/* Access Level Dropdown */}
                  <div className="w-full sm:w-[170px]">
                    <Select
                      value={assignAccessLevel}
                      onValueChange={(val: PermissionAccessLevel) => setAssignAccessLevel(val)}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Access Level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="write">Read and Write</SelectItem>
                        <SelectItem value="read">Read Only</SelectItem>
                        <SelectItem value="hide">Hide</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Assign Button */}
                  <Button
                    type="button"
                    onClick={handleAssignPermission}
                    disabled={
                      !assignSelectedPerm ||
                      assigningPerm ||
                      userPermissions.some(
                        (up) =>
                          Number(up.permissionId) === Number(assignSelectedPerm.id) ||
                          (Boolean(assignSelectedPerm.name) &&
                            Boolean(up.permissionName) &&
                            up.permissionName.toLowerCase() ===
                              assignSelectedPerm.name.toLowerCase()),
                      )
                    }
                    className="h-9 px-4 text-xs font-medium gap-1.5 shrink-0"
                  >
                    {assigningPerm ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Assigning...</span>
                      </>
                    ) : (
                      <>
                        <PlusCircle className="h-3.5 w-3.5" />
                        <span>Assign</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Permissions Filter and List Container (Strictly for the Selected User) */}
          <Card className="border-border shadow-xs">
            <CardHeader className="pb-3 border-b border-border/60">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    Granular Portal Permissions
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Permissions assigned to {selectedUser.fullName} (retrieved via{" "}
                    <code className="text-[10px] font-mono bg-muted px-1 py-0.5 rounded text-primary">
                      /api/user-permissions/{selectedUser.id}
                    </code>
                    ). Adjust access between Hide, Read Only, or Read and Write.
                  </CardDescription>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadUserPermissions(selectedUser.id)}
                    disabled={loadingUserPerms}
                    className="h-8 text-xs gap-1.5"
                    title="Refresh user permissions from server"
                  >
                    <RefreshCw
                      className={`h-3.5 w-3.5 ${loadingUserPerms ? "animate-spin" : ""}`}
                    />
                    <span className="hidden sm:inline">Refresh</span>
                  </Button>
                </div>
              </div>

              {/* Filtering Controls */}
              <div className="mt-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Filter permissions by name, portal, or description..."
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
                      <SelectItem value="all">All Portals ({userPermissions.length})</SelectItem>
                      {availablePortals.map((portal) => {
                        const count = userPermissions.filter((p) => p.portalName === portal).length;
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
                      <SelectItem value="all">All Levels ({userPermissions.length})</SelectItem>
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
                {loadingUserPerms ? (
                  <div className="p-12 text-center text-xs text-muted-foreground space-y-2">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                    <p>Loading permissions for {selectedUser.fullName}...</p>
                  </div>
                ) : filteredPermissions.length === 0 ? (
                  <div className="p-10 text-center space-y-2">
                    <Shield className="h-8 w-8 mx-auto text-muted-foreground/50" />
                    <p className="text-sm font-medium text-foreground">
                      {userPermissions.length === 0
                        ? `No permissions returned for ${selectedUser.fullName}`
                        : "No permissions match your filter criteria"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {userPermissions.length === 0
                        ? `API (/api/user-permissions/${selectedUser.id}) returned 0 permissions for this user.`
                        : "Try clearing your search term or selecting 'All Portals' / 'All Access Levels'."}
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
                    const currentLevel: PermissionAccessLevel =
                      accessMap[perm.permissionId] || perm.accessLevel || "hide";

                    return (
                      <div
                        key={perm.permissionId}
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
                              {perm.permissionName}
                            </span>
                            <Badge
                              variant="outline"
                              className={`text-[10px] px-1.5 py-0 h-4.5 font-medium ${getPortalBadgeClass(
                                perm.portalName,
                              )}`}
                            >
                              {perm.portalName}
                            </Badge>
                          </div>

                          {perm.permissionDescription && (
                            <p className="text-[11px] text-muted-foreground line-clamp-2">
                              {perm.permissionDescription}
                            </p>
                          )}
                        </div>

                        {/* Right Actions: Level Display Badge (non-editable) + Edit Icon Button + Delete Icon Button */}
                        <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                          {/* 1. Single Non-editable Access Level Display Badge */}
                          {currentLevel === "write" && (
                            <Badge
                              variant="outline"
                              className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium text-xs px-2.5 py-1 gap-1.5 h-7 select-none"
                            >
                              <Pencil className="h-3 w-3" />
                              <span>Read and Write</span>
                            </Badge>
                          )}
                          {currentLevel === "read" && (
                            <Badge
                              variant="outline"
                              className="border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400 font-medium text-xs px-2.5 py-1 gap-1.5 h-7 select-none"
                            >
                              <Eye className="h-3 w-3" />
                              <span>Read Only</span>
                            </Badge>
                          )}
                          {currentLevel === "hide" && (
                            <Badge
                              variant="outline"
                              className="border-border bg-muted/60 text-muted-foreground font-medium text-xs px-2.5 py-1 gap-1.5 h-7 select-none"
                            >
                              <EyeOff className="h-3 w-3" />
                              <span>Hide</span>
                            </Badge>
                          )}

                          {/* 2. Edit Icon Button: Changes/Updates Permission Level */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted"
                                title="Change access level"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuLabel className="text-xs">
                                Change Access Level
                              </DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleSetPermissionLevel(perm.permissionId, "write")}
                                className="text-xs flex items-center justify-between cursor-pointer"
                              >
                                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-medium">
                                  <Pencil className="h-3.5 w-3.5" />
                                  <span>Read and Write</span>
                                </div>
                                {currentLevel === "write" && (
                                  <Check className="h-3.5 w-3.5 text-primary" />
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleSetPermissionLevel(perm.permissionId, "read")}
                                className="text-xs flex items-center justify-between cursor-pointer"
                              >
                                <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 font-medium">
                                  <Eye className="h-3.5 w-3.5" />
                                  <span>Read Only</span>
                                </div>
                                {currentLevel === "read" && (
                                  <Check className="h-3.5 w-3.5 text-primary" />
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleSetPermissionLevel(perm.permissionId, "hide")}
                                className="text-xs flex items-center justify-between cursor-pointer"
                              >
                                <div className="flex items-center gap-2 text-muted-foreground font-medium">
                                  <EyeOff className="h-3.5 w-3.5" />
                                  <span>Hide</span>
                                </div>
                                {currentLevel === "hide" && (
                                  <Check className="h-3.5 w-3.5 text-primary" />
                                )}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>

                          {/* 3. Delete Icon Button: Unassigns Permission */}
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() =>
                              setPermToDelete({
                                id: perm.permissionId,
                                name: perm.permissionName,
                              })
                            }
                            className="h-7 w-7 text-destructive/80 hover:text-destructive hover:bg-destructive/10 hover:border-destructive/30"
                            title="Unassign permission from user"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
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
            <h3 className="text-sm font-semibold text-foreground">No Employee Selected</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              Please use the search bar above to select a user to view and configure their portal
              permissions.
            </p>
          </div>
        </Card>
      )}

      {/* Unassign Permission Confirmation Dialog */}
      <AlertDialog
        open={Boolean(permToDelete)}
        onOpenChange={(open) => {
          if (!open && !deletingPerm) setPermToDelete(null);
        }}
      >
        <AlertDialogContent className="sm:max-w-[425px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base flex items-center gap-2 text-destructive">
              <Trash2 className="h-4 w-4" />
              Unassign Permission
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              Are you sure you want to unassign{" "}
              <strong className="text-foreground">&quot;{permToDelete?.name}&quot;</strong> from{" "}
              <strong className="text-foreground">{selectedUser?.fullName}</strong>? This permission
              will no longer apply to this user.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel disabled={deletingPerm} className="text-xs h-8">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleConfirmUnassign();
              }}
              disabled={deletingPerm}
              className="text-xs h-8 bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingPerm ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  Unassigning...
                </>
              ) : (
                "Unassign"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
