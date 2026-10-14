import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { CrudPage } from "@/components/crud-page";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { MultiSelect } from "@/components/multi-select";
import { usersApi, hierarchyApi } from "@/lib/api/client";
import {
  portalsService,
  statesService,
  marketsService,
  districtsService,
  storesService,
  departmentsService,
} from "@/services/user-manager";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import {
  Loader2,
  Search,
  XCircle,
  Shield,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
} from "lucide-react";
import { getUserAvatarColor } from "./user-colors";

// ==========================================
// HELPERS
// ==========================================
function formatRoleName(roleStr: string): string {
  if (!roleStr) return "—";
  let spaced = roleStr.replace(/([A-Z])/g, " $1").replace(/_/g, " ");
  spaced = spaced.replace(/(?<!\s)(manager)/i, " Manager");
  return spaced
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function mapBackendToFrontendUser(bu: any): any {
  const parts = (bu.fullName || "").trim().split(/\s+/);
  return {
    id: String(bu.id),
    _raw: bu,
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" ") || "",
    fullName: bu.fullName || "",
    email: bu.email || "",
    phone: bu.phone || "—",
    department:
      bu.department && typeof bu.department === "object"
        ? bu.department.name
        : bu.department || "—",
    departmentObj: bu.department && typeof bu.department === "object" ? bu.department : null,
    assignedPortals: bu.assignedPortals || [],
    portalAccess: bu.portalAccess || [],
    states: bu.states || [],
    districts: bu.districts || [],
    markets: bu.markets || [],
    stores: bu.stores || [],
    allowedUserManagement: bu.allowedUserManagement ?? false,
    active: bu.active ?? true,
    avatarColor: getUserAvatarColor(bu.id),
  };
}

// ==========================================
// MAIN USERS PAGE COMPONENT
// ==========================================
function UsersPage() {
  const { user: currentAuthUser } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [deptFilter, setDeptFilter] = useState<string>("all");

  const [portalFilter, setPortalFilter] = useState<string>("all");

  const [dynamicDepts, setDynamicDepts] = useState<{ id: number; name: string }[]>([]);
  const [mainDeptSearch, setMainDeptSearch] = useState("");
  const mainDeptSearchRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [loadingUserId, setLoadingUserId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isSearchingUsers, setIsSearchingUsers] = useState<boolean>(false);

  const [page, setPage] = useState<number>(0);
  const [size, setSize] = useState<number>(50);
  const [totalRecords, setTotalRecords] = useState<number>(0);

  const lastFetchedKey = useRef<string>("");
  const isFetchingRef = useRef<boolean>(false);
  const initialLookupsFetchedRef = useRef<boolean>(false);

  const navigate = useNavigate();

  // Load only departments lookup for department filter
  const fetchInitialLookups = async () => {
    if (initialLookupsFetchedRef.current) return;
    try {
      const deptsRes = await departmentsService.getAll();
      if (deptsRes.success && Array.isArray(deptsRes.data)) {
        setDynamicDepts(deptsRes.data);
        initialLookupsFetchedRef.current = true;
      }
    } catch (err) {
      console.error("Failed to load departments lookup:", err);
    }
  };

  const fetchUsers = async (
    targetPage: number,
    targetSize: number,
    targetDept: string,
    targetPortal: string,
  ) => {
    if (searchQuery.trim()) return;
    const currentRequestKey = `${targetPage}-${targetSize}-${targetDept}-${targetPortal}`;
    if (lastFetchedKey.current === currentRequestKey || isFetchingRef.current) return;

    try {
      setLoading(true);
      isFetchingRef.current = true;
      lastFetchedKey.current = currentRequestKey;

      const res = await usersApi.getAll({
        page: targetPage,
        size: targetSize,
        department: targetDept !== "all" ? targetDept : undefined,
        portal: targetPortal !== "all" ? targetPortal : undefined,
      });

      if (res.success) {
        setUsers(res.data.map(mapBackendToFrontendUser));
        setTotalRecords(res.pagination?.totalRecords ?? res.data.length);
      }
    } catch (err: any) {
      toast.error(err?.message || "Something went wrong fetching records");
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  };

  useEffect(() => {
    fetchInitialLookups();
  }, []);

  // Debounced search across entire database: GET /api/users/search?search={query}&department={dept}
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setIsSearchingUsers(false);
      return;
    }

    setIsSearchingUsers(true);
    const timer = setTimeout(async () => {
      try {
        const res = await usersApi.search({
          search: trimmed,
          department: deptFilter !== "all" ? deptFilter : undefined,
        });
        if (res?.success && Array.isArray(res.data)) {
          setUsers(res.data.map(mapBackendToFrontendUser));
          setTotalRecords(res.data.length);
        } else if (Array.isArray(res)) {
          setUsers((res as any).map(mapBackendToFrontendUser));
          setTotalRecords((res as any).length);
        } else {
          setUsers([]);
          setTotalRecords(0);
        }
      } catch (err: any) {
        console.error("Failed to search users via API:", err);
        toast.error(err?.message || "Failed to search users");
        setUsers([]);
        setTotalRecords(0);
      } finally {
        setIsSearchingUsers(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, deptFilter]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      fetchUsers(page, size, deptFilter, portalFilter);
    }
  }, [page, size, deptFilter, portalFilter, searchQuery]);

  const handleDelete = async (u: any) => {
    const rowEmail = u.email ? String(u.email).toLowerCase().trim() : "";
    const isSelf = Boolean(
      (rowEmail && currentLoggedInUserEmail && rowEmail === currentLoggedInUserEmail) ||
      (currentAuthUser?.id && String(u.id) === String(currentAuthUser.id)),
    );
    if (isSelf) {
      toast.error("You cannot delete your own account");
      return;
    }
    if (rowEmail === "admin@techno.com") {
      toast.error("Default Admin cannot be deleted");
      return;
    }
    try {
      setActionLoading(true);
      const res = await usersService.delete(Number(u.id));
      if (res.success) {
        toast.success("User record safely removed");
        lastFetchedKey.current = "";
        if (searchQuery.trim()) {
          setUsers((prev) => prev.filter((x) => x.id !== String(u.id)));
          setTotalRecords((prev) => Math.max(0, prev - 1));
        } else {
          fetchUsers(page, size, deptFilter, portalFilter);
        }
      }
    } catch (err: any) {
      toast.error(err?.message || "Deletion framework error encountered");
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleActive = async (u: any, nextValue: boolean) => {
    try {
      setLoadingUserId(u.id);
      // Optimistic UI
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, active: nextValue } : x)));
      const raw = u._raw ?? {};
      const payload: any = {
        email: raw.email ?? u.email,
        active: nextValue,
      };
      const res = await usersApi.toggleActivationStatus(payload);
      if (res.success) {
        toast.success(
          `User ${nextValue ? "activated successfully!" : "deactivated successfully!"}`,
        );
      }
    } catch (err: any) {
      // revert
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, active: !nextValue } : x)));
      toast.error(err?.message || "Failed to update status");
    } finally {
      // setActionLoading(false);
      setLoadingUserId(null);
    }
  };

  const currentLoggedInUserEmail = useMemo(() => {
    if (currentAuthUser?.email) {
      return String(currentAuthUser.email).toLowerCase().trim();
    }
    try {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const userObj = JSON.parse(userStr);
        return userObj?.email ? String(userObj.email).toLowerCase().trim() : null;
      }
    } catch (e) {
      console.error("Error parsing logged-in user email:", e);
    }
    return null;
  }, [currentAuthUser]);

  const filteredMainDeptsOptions = useMemo(() => {
    return dynamicDepts.filter((d) =>
      (d.name || "").toLowerCase().includes(mainDeptSearch.toLowerCase()),
    );
  }, [dynamicDepts, mainDeptSearch]);

  const getPortalColor = (name: string) => {
    const colors: Record<string, string> = {
      ticketing:
        "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400",
      ranker:
        "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400",
      commission: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400",
      leasing:
        "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400",
      leave: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400",
    };
    return colors[name.toLowerCase().trim()] || "bg-zinc-50 text-zinc-700 border-zinc-200";
  };

  if (loading && users.length === 0) {
    return (
      <div className="flex h-[50vh] w-full flex-col items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-medium">Loading Identity & Access Portal...</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="w-full border-0 shadow-none bg-transparent [&_input]:bg-white dark:[&_input]:bg-zinc-950 [&_button.w-\[180px\]]:bg-white dark:[&_button.w-\[180px\]]:bg-zinc-950 [&_th:last-child]:text-right [&_th:last-child]:pr-10 [&_td:last-child]:text-right">
        <CrudPage<any>
          title="Users"
          subtitle="Manage internal employees and their specific nested multi-portal access mapping configurations."
          rows={users}
          rowKey={(u) => u.id}
          isSaving={actionLoading}
          isLoading={loading}
          rowCount={totalRecords}
          page={page}
          pageSize={size}
          onPageChange={setPage}
          onPageSizeChange={setSize}
          searchPlaceholder="Search users across all records..."
          searchValue={searchQuery}
          onSearchChange={(val) => {
            setSearchQuery(val);
            if (!val.trim()) {
              lastFetchedKey.current = "";
            }
          }}
          serverSearch={Boolean(searchQuery.trim())}
          isSearching={isSearchingUsers}
          createLabel="Add user"
          extraToolbar={
            <div className="flex items-end gap-3 pb-0.5">
              <div className="relative flex flex-col pt-2.5">
                <span className="absolute -top-1 left-2 bg-background px-1 text-[11px] font-semibold text-muted-foreground z-10">
                  Department
                </span>
                <Select
                  value={deptFilter}
                  onValueChange={(val) => {
                    lastFetchedKey.current = "";
                    setPage(0);
                    setDeptFilter(val);
                  }}
                  onOpenChange={(open) => {
                    if (!open) setMainDeptSearch("");
                    else setTimeout(() => mainDeptSearchRef.current?.focus(), 100);
                  }}
                >
                  <SelectTrigger className="w-[180px] h-9 focus:ring-0 border-muted-foreground/40">
                    <SelectValue placeholder="Department" />
                  </SelectTrigger>
                  <SelectContent onKeyDown={(e) => e.stopPropagation()}>
                    <div className="flex items-center px-2 py-1.5 border-b sticky top-0 bg-popover z-10">
                      <Search className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                      <input
                        ref={mainDeptSearchRef}
                        placeholder="Search depts..."
                        value={mainDeptSearch}
                        onChange={(e) => setMainDeptSearch(e.target.value)}
                        className="w-full text-xs bg-transparent outline-none"
                      />
                    </div>
                    <SelectItem value="all">All departments</SelectItem>
                    {filteredMainDeptsOptions.map((d) => (
                      <SelectItem key={d.id} value={d.name}>
                        {d.name || "—"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 🌟 ROLES DROP-DOWN REPLACED WITH PORTALS SELECTION FILTER */}
              {/* <div className="relative flex flex-col pt-2.5">
                <span className="absolute -top-1 left-2 bg-background px-1 text-[11px] font-semibold text-muted-foreground z-10">Portal Focus</span>
                <Select value={portalFilter} onValueChange={(val) => { lastFetchedKey.current = ""; setPage(0); setPortalFilter(val); }} onOpenChange={(open) => { if (!open) setMainPortalSearch(""); else setTimeout(() => mainPortalSearchRef.current?.focus(), 100); }}>
                  <SelectTrigger className="w-[180px] h-9 focus:ring-0 border-muted-foreground/40">
                    <SelectValue placeholder="Select Portal" />
                  </SelectTrigger>
                  <SelectContent onKeyDown={(e) => e.stopPropagation()}>
                    <div className="flex items-center px-2 py-1.5 border-b sticky top-0 bg-popover z-10">
                      <Search className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                      <input ref={mainPortalSearchRef} placeholder="Search portals..." value={mainPortalSearch} onChange={(e) => setMainPortalSearch(e.target.value)} className="w-full text-xs bg-transparent outline-none" />
                    </div>
                    <SelectItem value="all">All Portals</SelectItem>
                    {filteredMainPortalsOptions.map((p) => (
                      <SelectItem key={p.id} value={p.name} className="capitalize">
                        {p.name} Portal
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div> */}

              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={deptFilter === "all" && portalFilter === "all" && !searchQuery}
                onClick={() => {
                  lastFetchedKey.current = "";
                  setPage(0);
                  setDeptFilter("all");
                  setPortalFilter("all");
                  setSearchQuery("");
                }}
                className="h-9 px-3 text-xs border border-dashed border-muted-foreground/30"
              >
                <XCircle className="h-3.5 w-3.5 mr-1.5" />
                Reset Filters
              </Button>
            </div>
          }
          onEditClick={(u: any) => navigate(`/admin/users/${u.id}`)}
          columns={[
            {
              key: "name",
              header: "Name",
              accessor: (u) => (
                <div className="flex items-center gap-2 py-1">
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white uppercase"
                    style={{ backgroundColor: u.avatarColor }}
                  >
                    {u.firstName?.[0] || ""}
                    {u.lastName?.[0] || ""}
                  </div>
                  <div>
                    <div className="font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                      {u.fullName}
                      {u.allowedUserManagement && (
                        <Shield className="h-3.5 w-3.5 text-indigo-500 fill-indigo-500/10">
                          <title>User Manager Enabled</title>
                        </Shield>
                      )}
                    </div>
                  </div>
                </div>
              ),
              searchValue: (u) => `${u.fullName || ""} ${u.firstName || ""} ${u.lastName || ""}`,
            },
            {
              key: "email",
              header: "Email / NTID",
              accessor: (u) => u.email || "—",
              searchValue: (u) => u.email || "",
            },
            {
              key: "phone",
              header: "Phone",
              accessor: (u) => u.phone || "—",
              searchValue: (u) => u.phone || "",
            },
            {
              key: "dept",
              header: "Department",
              accessor: (u) => u.department || "—",
              searchValue: (u) =>
                typeof u.department === "string" ? u.department : u.department?.name || "",
            },
            {
              key: "active",
              header: "Active",
              className: "w-24",
              accessor: (u) => {
                const isCurrentRowLoading = loadingUserId === u.id;

                const rowEmail = u.email ? String(u.email).toLowerCase().trim() : "";

                const isSelfDeactivation = Boolean(
                  (rowEmail && currentLoggedInUserEmail && rowEmail === currentLoggedInUserEmail) ||
                  (currentAuthUser?.id && String(u.id) === String(currentAuthUser.id)),
                );

                //  Default admin email
                const isDefaultAdmin = rowEmail === "admin@techno.com";

                const isDisabled = isCurrentRowLoading || isSelfDeactivation || isDefaultAdmin;

                const tooltipMessage = isSelfDeactivation
                  ? "You cannot disable your own account"
                  : isDefaultAdmin
                    ? "Default Admin account cannot be deactivated"
                    : "";

                return (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-2 justify-end pr-2"
                  >
                    <Switch
                      checked={!!u.active}
                      disabled={isDisabled}
                      onCheckedChange={(v) => handleToggleActive(u, v)}
                      title={tooltipMessage}
                    />
                    {isCurrentRowLoading && (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                    )}
                  </div>
                );
              },
            },
          ]}
          isDeleteDisabled={(u) => {
            const rowEmail = u.email ? String(u.email).toLowerCase().trim() : "";
            const isSelf = Boolean(
              (rowEmail && currentLoggedInUserEmail && rowEmail === currentLoggedInUserEmail) ||
              (currentAuthUser?.id && String(u.id) === String(currentAuthUser.id)),
            );
            if (isSelf) {
              return {
                disabled: true,
                tooltip: "You cannot delete your own account",
              };
            }
            if (rowEmail === "admin@techno.com") {
              return {
                disabled: true,
                tooltip: "Default Admin cannot be deleted",
              };
            }
            return false;
          }}
          onDelete={handleDelete}
          renderForm={(initial, close) => (
            <UserForm
              initial={initial}
              onSaved={() => {
                lastFetchedKey.current = "";
                fetchUsers(page, size, deptFilter, portalFilter);
                close();
              }}
            />
          )}
        />
      </div>
    </div>
  );
}

// ==========================================
// FORM COMPONENT MODAL INSTANCE
// ==========================================
export function UserForm({
  initial,
  dynamicRoles: initialDynamicRoles = [],
  portalsMasterList: initialPortalsMasterList = [],
  onSaved,
}: {
  initial: any | null;
  dynamicRoles?: any[];
  portalsMasterList?: any[];
  onSaved: () => void;
}) {
  const [fullName, setFullName] = useState(initial?.fullName ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [phone, setPhone] = useState(initial?.phone === "—" ? "" : (initial?.phone ?? ""));
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const formContainerRef = useRef<HTMLFormElement>(null);

  const markTouched = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const [department, setDepartment] = useState<string>(
    initial?.department === "—"
      ? "placeholder"
      : (initial?.department?.name ?? initial?.department ?? "placeholder"),
  );
  const [allowedUserManagement, setAllowedUserManagement] = useState<boolean>(
    initial?.allowedUserManagement ?? false,
  );
  const [active, setActive] = useState<boolean>(initial?.active ?? true);

  // Dynamic lookup options fetched when modal is mounted
  const [dynamicRoles, setDynamicRoles] = useState<any[]>(initialDynamicRoles);
  const [portalsMasterList, setPortalsMasterList] = useState<any[]>(initialPortalsMasterList);
  const [dbDepts, setDbDepts] = useState<any[]>([]);
  const [loadingInitialModalData, setLoadingInitialModalData] = useState(true);

  // Portal access config map
  const [portalConfig, setPortalConfig] = useState<
    Record<string, { enabled: boolean; roleName: string }>
  >(() => {
    const initMap: Record<string, { enabled: boolean; roleName: string }> = {};
    if (Array.isArray(initialPortalsMasterList)) {
      initialPortalsMasterList.forEach((p) => {
        initMap[p.name] = { enabled: false, roleName: "user" };
      });
    }
    if (initial && Array.isArray(initial.portalAccess)) {
      initial.portalAccess.forEach((pa: any) => {
        initMap[pa.portalName] = { enabled: true, roleName: pa.roleName };
      });
    }
    return initMap;
  });

  // Fetch departments, roles, and portals on modal open
  useEffect(() => {
    let isMounted = true;
    const loadModalLookups = async () => {
      try {
        setLoadingInitialModalData(true);
        const [rolesRes, deptsRes, portalsRes] = await Promise.all([
          hierarchyApi.getRoles(),
          departmentsService.getAll(),
          portalsService.getAll(),
        ]);
        if (!isMounted) return;
        if (rolesRes.success && Array.isArray(rolesRes.data)) {
          setDynamicRoles(rolesRes.data);
        }
        if (deptsRes.success && Array.isArray(deptsRes.data)) {
          setDbDepts(deptsRes.data);
        }
        if (portalsRes.success && Array.isArray(portalsRes.data)) {
          setPortalsMasterList(portalsRes.data);
          setPortalConfig((prev) => {
            const next = { ...prev };
            portalsRes.data.forEach((p: any) => {
              if (!next[p.name]) {
                next[p.name] = { enabled: false, roleName: "user" };
              }
            });
            if (initial && Array.isArray(initial.portalAccess)) {
              initial.portalAccess.forEach((pa: any) => {
                next[pa.portalName] = { enabled: true, roleName: pa.roleName };
              });
            }
            return next;
          });
        }
      } catch (err) {
        console.error("Failed to load modal lookup data:", err);
      } finally {
        if (isMounted) setLoadingInitialModalData(false);
      }
    };
    loadModalLookups();
    return () => {
      isMounted = false;
    };
  }, [initial]);

  // Determine active roles across all enabled portals
  const activeRolesList = useMemo(() => {
    return Object.keys(portalConfig)
      .filter((k) => portalConfig[k].enabled)
      .map((k) => (portalConfig[k].roleName || "").toLowerCase().trim());
  }, [portalConfig]);

  // Normalization helper
  const hasRole = (roleType: "store" | "district" | "market" | "state") => {
    return activeRolesList.some((r) => {
      const clean = r.replace(/[^a-z]/g, "");
      if (roleType === "store") return clean === "storemanager";
      if (roleType === "district") return clean === "districtmanager";
      if (roleType === "market") return clean === "marketmanager";
      if (roleType === "state") return clean === "statemanager";
      return false;
    });
  };

  const isStoreManager = hasRole("store");
  const isDistrictManager = hasRole("district");
  const isMarketManager = hasRole("market");
  const isStateManager = hasRole("state");

  // Regional state requirements
  // District manager needs State -> Market -> District
  // Market manager needs State -> Market
  // State manager needs State
  // Store manager needs Store
  const needsState = isDistrictManager || isMarketManager || isStateManager;
  const needsMarket = isDistrictManager || isMarketManager;
  const needsDistrict = isDistrictManager;
  const needsStore = isStoreManager;

  const showRegionalCard = needsState || needsStore;

  // Selected single values for regional dropdowns (State, Market, District, Store)
  const initialSingleId = (arr: any[] | undefined) =>
    Array.isArray(arr) && arr.length > 0 ? String(arr[0]?.id ?? arr[0]) : "";

  const [selectedStateId, setSelectedStateId] = useState<string>(initialSingleId(initial?.states));
  const [selectedMarketId, setSelectedMarketId] = useState<string>(
    initialSingleId(initial?.markets),
  );
  const [selectedDistrictId, setSelectedDistrictId] = useState<string>(
    initialSingleId(initial?.districts),
  );
  const [selectedStoreId, setSelectedStoreId] = useState<string>(initialSingleId(initial?.stores));

  // Maintain array representations for backend API payload compatibility
  const stateIds = useMemo(() => (selectedStateId ? [selectedStateId] : []), [selectedStateId]);
  const marketIds = useMemo(() => (selectedMarketId ? [selectedMarketId] : []), [selectedMarketId]);
  const districtIds = useMemo(
    () => (selectedDistrictId ? [selectedDistrictId] : []),
    [selectedDistrictId],
  );
  const storeIds = useMemo(() => (selectedStoreId ? [selectedStoreId] : []), [selectedStoreId]);

  // Dynamic cascading option lists
  const [dbStates, setDbStates] = useState<any[]>([]);
  const [dbMarkets, setDbMarkets] = useState<any[]>([]);
  const [dbDistricts, setDbDistricts] = useState<any[]>([]);
  const [dbStores, setDbStores] = useState<any[]>([]);

  // Search input filters for Select dropdowns
  const [stateSearch, setStateSearch] = useState("");
  const [marketSearch, setMarketSearch] = useState("");
  const [districtSearch, setDistrictSearch] = useState("");
  const [storeSearch, setStoreSearch] = useState("");

  const stateSearchRef = useRef<HTMLInputElement>(null);
  const marketSearchRef = useRef<HTMLInputElement>(null);
  const districtSearchRef = useRef<HTMLInputElement>(null);
  const storeSearchRef = useRef<HTMLInputElement>(null);

  // Loading states
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingMarkets, setLoadingMarkets] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingStores, setLoadingStores] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  // Flags for preserving initial edit selections
  const isFirstMarketLoad = useRef(true);
  const isFirstDistrictLoad = useRef(true);

  // 1. Load States ONLY when needsState is active
  useEffect(() => {
    if (!needsState) {
      setDbStates([]);
      setSelectedStateId("");
      return;
    }
    let isMounted = true;
    setLoadingStates(true);
    statesService
      .getAll()
      .then((res) => {
        if (!isMounted) return;
        if (res.success && Array.isArray(res.data)) {
          setDbStates(res.data);
        }
      })
      .catch((err) => {
        console.error("Failed to load states:", err);
      })
      .finally(() => {
        if (isMounted) setLoadingStates(false);
      });
    return () => {
      isMounted = false;
    };
  }, [needsState]);

  // 2. Load Markets ONLY when State is selected AND needsMarket is true
  useEffect(() => {
    if (!needsMarket || !selectedStateId) {
      setDbMarkets([]);
      setSelectedMarketId("");
      setDbDistricts([]);
      setSelectedDistrictId("");
      return;
    }

    let isMounted = true;
    setLoadingMarkets(true);

    const matchState = dbStates.find((s) => String(s.id) === selectedStateId);
    const stateParam = matchState ? matchState.name : selectedStateId;

    marketsService
      .getAll({ State: stateParam })
      .then((res) => {
        if (!isMounted) return;
        if (res.success && Array.isArray(res.data)) {
          setDbMarkets(res.data);
          if (isFirstMarketLoad.current) {
            isFirstMarketLoad.current = false;
          } else {
            // When user changes state in form, reset selected market & district
            setSelectedMarketId("");
            setSelectedDistrictId("");
          }
        }
      })
      .catch((err) => {
        console.error("Failed to load markets:", err);
      })
      .finally(() => {
        if (isMounted) setLoadingMarkets(false);
      });

    return () => {
      isMounted = false;
    };
  }, [needsMarket, selectedStateId, dbStates]);

  // 3. Load Districts ONLY when Market is selected AND needsDistrict is true
  useEffect(() => {
    if (!needsDistrict || !selectedMarketId) {
      setDbDistricts([]);
      setSelectedDistrictId("");
      return;
    }

    let isMounted = true;
    setLoadingDistricts(true);

    const matchMarket = dbMarkets.find((m) => String(m.id) === selectedMarketId);
    const marketParam = matchMarket ? matchMarket.name : selectedMarketId;

    districtsService
      .getAll({ Market: marketParam })
      .then((res) => {
        if (!isMounted) return;
        if (res.success && Array.isArray(res.data)) {
          setDbDistricts(res.data);
          if (isFirstDistrictLoad.current) {
            isFirstDistrictLoad.current = false;
          } else {
            // When user changes market in form, reset selected district
            setSelectedDistrictId("");
          }
        }
      })
      .catch((err) => {
        console.error("Failed to load districts:", err);
      })
      .finally(() => {
        if (isMounted) setLoadingDistricts(false);
      });

    return () => {
      isMounted = false;
    };
  }, [needsDistrict, selectedMarketId, dbMarkets]);

  // 4. Load Stores ONLY when Store Manager role is selected
  useEffect(() => {
    if (!needsStore) {
      setDbStores([]);
      setSelectedStoreId("");
      return;
    }
    let isMounted = true;
    setLoadingStores(true);
    storesService
      .getAll()
      .then((res) => {
        if (!isMounted) return;
        if (res.success && Array.isArray(res.data)) {
          setDbStores(res.data);
        }
      })
      .catch((err) => {
        console.error("Failed to load stores:", err);
      })
      .finally(() => {
        if (isMounted) setLoadingStores(false);
      });
    return () => {
      isMounted = false;
    };
  }, [needsStore]);

  // Filtered dropdown lists based on inline search
  const filteredDbStates = useMemo(() => {
    return dbStates.filter((s) => s.name.toLowerCase().includes(stateSearch.toLowerCase()));
  }, [dbStates, stateSearch]);

  const filteredDbMarkets = useMemo(() => {
    return dbMarkets.filter((m) => m.name.toLowerCase().includes(marketSearch.toLowerCase()));
  }, [dbMarkets, marketSearch]);

  const filteredDbDistricts = useMemo(() => {
    return dbDistricts.filter((d) => d.name.toLowerCase().includes(districtSearch.toLowerCase()));
  }, [dbDistricts, districtSearch]);

  const filteredDbStores = useMemo(() => {
    return dbStores.filter((s) => {
      const searchLower = storeSearch.toLowerCase();
      const nameMatch = (s.name || "").toLowerCase().includes(searchLower);
      const numberMatch = s.number ? String(s.number).toLowerCase().includes(searchLower) : false;
      return nameMatch || numberMatch;
    });
  }, [dbStores, storeSearch]);

  const handlePortalToggle = (pName: string, checked: boolean) => {
    setPortalConfig((prev) => ({
      ...prev,
      [pName]: { ...prev[pName], enabled: checked },
    }));
  };

  const handlePortalRoleChange = (pName: string, selectedRole: string) => {
    setPortalConfig((prev) => ({
      ...prev,
      [pName]: { ...prev[pName], roleName: selectedRole },
    }));
  };

  const fullNameError = useMemo(() => {
    if (!fullName.trim()) return "Full name is required";
    if (fullName.trim().length < 2) return "Full name must be at least 2 characters";
    return null;
  }, [fullName]);

  const emailError = useMemo(() => {
    if (!email.trim()) return "Email or NTID is required";
    if (email.trim().length < 2) return "Email or NTID must be at least 2 characters";
    return null;
  }, [email]);

  const departmentError = useMemo(() => {
    if (department === "placeholder" || !department) return "Department assignment is required";
    return null;
  }, [department]);

  const passwordError = useMemo(() => {
    if (initial) return null;
    if (!password) return "Password is required";
    if (password.length < 6) return "Password must be at least 6 characters";
    return null;
  }, [initial, password]);

  const confirmPasswordError = useMemo(() => {
    if (initial) return null;
    if (!confirmPassword) return "Confirm password is required";
    if (password !== confirmPassword) return "Passwords do not match";
    return null;
  }, [initial, password, confirmPassword]);

  const hasSelectedPortals = Object.values(portalConfig).some((p) => p.enabled);
  const portalsError = useMemo(() => {
    if (!hasSelectedPortals) return "Please enable access control mapping for at least one portal";
    return null;
  }, [hasSelectedPortals]);

  const stateError = useMemo(() => {
    if (needsState && !selectedStateId) return "Please select a state";
    return null;
  }, [needsState, selectedStateId]);

  const marketError = useMemo(() => {
    if (needsMarket && !selectedMarketId) return "Please select a market";
    return null;
  }, [needsMarket, selectedMarketId]);

  const districtError = useMemo(() => {
    if (needsDistrict && !selectedDistrictId) return "Please select a district";
    return null;
  }, [needsDistrict, selectedDistrictId]);

  const storeError = useMemo(() => {
    if (needsStore && !selectedStoreId) return "Please select a store";
    return null;
  }, [needsStore, selectedStoreId]);

  const canSave =
    !fullNameError &&
    !emailError &&
    !departmentError &&
    !passwordError &&
    !confirmPasswordError &&
    !portalsError &&
    !stateError &&
    !marketError &&
    !districtError &&
    !storeError;

  const firstError =
    fullNameError ||
    emailError ||
    departmentError ||
    passwordError ||
    confirmPasswordError ||
    portalsError ||
    stateError ||
    marketError ||
    districtError ||
    storeError;

  const shouldShowFullNameError = (attemptedSubmit || touched.fullName) && !!fullNameError;
  const shouldShowEmailError = (attemptedSubmit || touched.email) && !!emailError;
  const shouldShowDeptError = (attemptedSubmit || touched.department) && !!departmentError;
  const shouldShowPasswordError = (attemptedSubmit || touched.password) && !!passwordError;
  const shouldShowConfirmError =
    (attemptedSubmit || touched.confirmPassword) && !!confirmPasswordError;
  const shouldShowPortalsError = attemptedSubmit && !!portalsError;
  const shouldShowStateError = attemptedSubmit && !!stateError;
  const shouldShowMarketError = attemptedSubmit && !!marketError;
  const shouldShowDistrictError = attemptedSubmit && !!districtError;
  const shouldShowStoreError = attemptedSubmit && !!storeError;

  const submit = async () => {
    setAttemptedSubmit(true);
    if (!canSave) {
      if (firstError) {
        toast.error(firstError);
      } else {
        toast.error("Please fill in all required fields marked in red");
      }
      formContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    try {
      setSubmitting(true);
      const assignedPortals: string[] = [];
      const portalAccess: any[] = [];

      Object.keys(portalConfig).forEach((k) => {
        if (portalConfig[k].enabled) {
          const masterObjectRef = portalsMasterList.find((p) => p.name === k);

          const selectedRoleName = portalConfig[k].roleName;
          const roleObjectRef = dynamicRoles.find(
            (r: any) =>
              String(r.name).toLowerCase().trim() === String(selectedRoleName).toLowerCase().trim(),
          );

          assignedPortals.push(k);
          portalAccess.push({
            portalId: masterObjectRef?.id ?? 0,
            portalName: k,
            roleId: roleObjectRef?.id ?? 0,
            roleName: portalConfig[k].roleName,
          });
        }
      });

      const pickObjs = (list: any[], ids: string[]) =>
        list
          .filter((x) => ids.includes(String(x.id)))
          .map((x) => ({ id: Number(x.id), name: x.name }));

      const selectedStates = pickObjs(dbStates, stateIds);
      const selectedMarkets = pickObjs(dbMarkets, marketIds);
      const selectedDistricts = pickObjs(dbDistricts, districtIds);
      const selectedStores = pickObjs(dbStores, storeIds);

      const selectedDeptObj = dbDepts.find((d) => d.name === department);

      const payload = {
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
        department: selectedDeptObj ? { id: selectedDeptObj.id, name: selectedDeptObj.name } : null,
        allowedUserManagement,
        active,
        assignedPortals,
        portalAccess,
        states: needsState ? selectedStates : [],
        markets: needsMarket ? selectedMarkets : [],
        districts: needsDistrict ? selectedDistricts : [],
        stores: needsStore ? selectedStores : [],
      };

      if (initial) {
        const response = await usersApi.update({ id: Number(initial.id), ...payload });
        if (response.success) {
          toast.success("User updated successfully");
          onSaved();
        } else {
          toast.error(response.message || "Failed to update user");
        }
      } else {
        const response = await usersApi.add({ ...payload, password } as any);
        if (response.success) {
          toast.success("User created successfully");
          onSaved();
        } else {
          toast.error(response.message || "Failed to create user");
        }
      }
    } catch (err: any) {
      toast.error(err?.message || "An error occurred during submission workflow");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      ref={formContainerRef}
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      autoComplete="off"
      className="space-y-4 max-h-[82vh] overflow-y-auto px-1 scrollbar-thin"
    >
      {/* Hidden dummy credentials to trap browser autofill */}
      <input
        type="text"
        name="fake_user_shield"
        style={{ display: "none", position: "absolute", opacity: 0, height: 0, width: 0 }}
        tabIndex={-1}
        autoComplete="off"
      />
      <input
        type="password"
        name="fake_password_shield"
        style={{ display: "none", position: "absolute", opacity: 0, height: 0, width: 0 }}
        tabIndex={-1}
        autoComplete="off"
      />
      {attemptedSubmit && !canSave && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-2.5 text-xs font-medium text-destructive animate-fade-in">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>Please fill in or correct the highlighted fields marked in red below.</span>
        </div>
      )}

      {/* Row 1: Full Name & Email */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="user-fullname">
            Full name <span className="text-destructive font-semibold">*</span>
          </Label>
          <Input
            id="user-fullname"
            placeholder="John Doe"
            value={fullName}
            onChange={(e) => {
              setFullName(e.target.value);
              markTouched("fullName");
            }}
            onBlur={() => markTouched("fullName")}
            className={
              shouldShowFullNameError ? "border-destructive ring-1 ring-destructive/30" : ""
            }
          />
          {shouldShowFullNameError && (
            <p className="text-xs text-destructive flex items-center gap-1 font-medium mt-1">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {fullNameError}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="user-email">
            Email or NTID <span className="text-destructive font-semibold">*</span>
          </Label>
          <Input
            id="user-email"
            type="text"
            placeholder="johndoe or john@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              markTouched("email");
            }}
            onBlur={() => markTouched("email")}
            className={shouldShowEmailError ? "border-destructive ring-1 ring-destructive/30" : ""}
          />
          {shouldShowEmailError && (
            <p className="text-xs text-destructive flex items-center gap-1 font-medium mt-1">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {emailError}
            </p>
          )}
        </div>
      </div>

      {/* Row 2: Phone & Department */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="user-phone">
            Phone <span className="text-xs text-muted-foreground font-normal">(Optional)</span>
          </Label>
          <Input
            id="user-phone"
            type="tel"
            placeholder="+1 (555) 000-0000"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="user-department">
            Department <span className="text-destructive font-semibold">*</span>
          </Label>
          <Select
            value={department}
            onValueChange={(val) => {
              setDepartment(val);
              markTouched("department");
            }}
          >
            <SelectTrigger
              id="user-department"
              className={`w-full ${
                shouldShowDeptError ? "border-destructive ring-1 ring-destructive/30" : ""
              }`}
            >
              <SelectValue placeholder="Select department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="placeholder" disabled>
                Select department
              </SelectItem>
              {dbDepts.map((d) => (
                <SelectItem key={d.id} value={d.name}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {shouldShowDeptError && (
            <p className="text-xs text-destructive flex items-center gap-1 font-medium mt-1">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {departmentError}
            </p>
          )}
        </div>
      </div>

      {/* Password fields only on create */}
      {!initial && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="user-password">
              Password <span className="text-destructive font-semibold">*</span>
            </Label>
            <div className="relative">
              <Input
                id="user-password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  markTouched("password");
                }}
                onBlur={() => markTouched("password")}
                className={`pr-9 ${
                  shouldShowPasswordError ? "border-destructive ring-1 ring-destructive/30" : ""
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {shouldShowPasswordError && (
              <p className="text-xs text-destructive flex items-center gap-1 font-medium mt-1">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {passwordError}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="user-confirm-password">
              Confirm password <span className="text-destructive font-semibold">*</span>
            </Label>
            <div className="relative">
              <Input
                id="user-confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  markTouched("confirmPassword");
                }}
                onBlur={() => markTouched("confirmPassword")}
                className={`pr-9 ${
                  shouldShowConfirmError ? "border-destructive ring-1 ring-destructive/30" : ""
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                tabIndex={-1}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {shouldShowConfirmError && (
              <p className="text-xs text-destructive flex items-center gap-1 font-medium mt-1">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {confirmPasswordError}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Row: Status toggles */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <Switch
            id="user-management-access"
            checked={allowedUserManagement}
            onCheckedChange={setAllowedUserManagement}
          />
          <Label htmlFor="user-management-access" className="text-xs cursor-pointer font-medium">
            Grant User Management Portal Access
          </Label>
        </div>

        <div className="flex items-center gap-2">
          <Switch id="user-active-status" checked={active} onCheckedChange={setActive} />
          <Label htmlFor="user-active-status" className="text-xs cursor-pointer font-medium">
            Account Active
          </Label>
        </div>
      </div>

      {/* Portal Matrix Card */}
      <div
        className={`border rounded-xl overflow-hidden transition-all duration-200 ${
          shouldShowPortalsError
            ? "border-destructive/60 ring-1 ring-destructive/20 shadow-sm"
            : "border-zinc-200 dark:border-zinc-800"
        }`}
      >
        <div className="bg-zinc-100 dark:bg-zinc-900 px-4 py-2.5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" /> Multi-Portal Authority Setup Matrix
          </span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
              shouldShowPortalsError
                ? "bg-destructive/15 text-destructive"
                : "bg-primary/10 text-primary"
            }`}
          >
            Required: At least 1
          </span>
        </div>

        <div className="p-3 bg-white dark:bg-zinc-950 divide-y divide-zinc-100 dark:divide-zinc-900">
          {loadingInitialModalData && portalsMasterList.length === 0 ? (
            <div className="py-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" /> Loading portal
              permissions...
            </div>
          ) : (
            portalsMasterList.map((p) => {
              const isEnabled = portalConfig[p.name]?.enabled ?? false;
              const currentRoleValue = portalConfig[p.name]?.roleName ?? "user";

              return (
                <div
                  key={p.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between py-3 gap-3 first:pt-1 last:pb-1"
                >
                  <div className="flex items-center gap-3">
                    <Switch
                      id={`portal-toggle-${p.name}`}
                      checked={isEnabled}
                      onCheckedChange={(checked) => handlePortalToggle(p.name, checked)}
                    />
                    <div>
                      <label
                        htmlFor={`portal-toggle-${p.name}`}
                        className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 cursor-pointer block capitalize"
                      >
                        {p.name} Portal
                      </label>
                      <span className="text-xs text-muted-foreground block">{p.description}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 min-w-[200px]">
                    <span className="text-xs text-muted-foreground shrink-0">Assigned Role:</span>
                    <Select
                      disabled={!isEnabled}
                      value={currentRoleValue}
                      onValueChange={(val) => handlePortalRoleChange(p.name, val)}
                    >
                      <SelectTrigger
                        className={`h-8 text-xs font-medium ${
                          isEnabled
                            ? "border-primary/50 ring-1 ring-primary/10"
                            : "bg-zinc-50 border-zinc-200"
                        }`}
                      >
                        <SelectValue placeholder="Choose role" />
                      </SelectTrigger>

                      <SelectContent>
                        {dynamicRoles.map((r) => (
                          <SelectItem key={r.id || r.name} value={r.name} className="text-xs">
                            {formatRoleName(r.name)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {shouldShowPortalsError && (
          <div className="p-2.5 bg-destructive/10 border-t border-destructive/20 text-destructive text-xs flex items-center gap-1.5 font-medium">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            Please enable access control mapping for at least one portal.
          </div>
        )}
      </div>

      {/* Regional Hierarchy Configuration Setup (Single Selection with Search) */}
      {showRegionalCard && (
        <div className="p-4 bg-zinc-50/50 dark:bg-zinc-900/40 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 space-y-3 animate-fade-in">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 pb-1 border-b border-zinc-200/60">
            <AlertCircle className="h-3.5 w-3.5" /> Regional Authority Hierarchy Configuration Setup
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* 1. STATE SELECTION (Single Select: Visible for State Manager, Market Manager, District Manager) */}
            {needsState && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>
                    State <span className="text-destructive font-semibold">*</span>
                  </Label>
                  {loadingStates && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
                </div>
                <Select
                  value={selectedStateId}
                  disabled={loadingStates}
                  onValueChange={setSelectedStateId}
                  onOpenChange={(open) => {
                    if (!open) setStateSearch("");
                    else setTimeout(() => stateSearchRef.current?.focus(), 100);
                  }}
                >
                  <SelectTrigger
                    className={`w-full bg-white dark:bg-zinc-950 ${
                      shouldShowStateError ? "border-destructive ring-1 ring-destructive/30" : ""
                    }`}
                  >
                    <SelectValue
                      placeholder={loadingStates ? "Loading states..." : "Select state"}
                    />
                  </SelectTrigger>
                  <SelectContent
                    onKeyDown={(e) => e.stopPropagation()}
                    onKeyUp={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center px-2 py-1.5 border-b sticky top-0 bg-popover z-10">
                      <Search className="h-3.5 w-3.5 mr-2 text-muted-foreground shrink-0" />
                      <input
                        ref={stateSearchRef}
                        placeholder="Search states..."
                        value={stateSearch}
                        onChange={(e) => {
                          setStateSearch(e.target.value);
                          setTimeout(() => stateSearchRef.current?.focus(), 0);
                        }}
                        className="w-full text-xs bg-transparent outline-none placeholder:text-muted-foreground"
                      />
                    </div>
                    {filteredDbStates.length === 0 ? (
                      <p className="text-[11px] text-center text-muted-foreground p-2">
                        {loadingStates ? "Fetching states..." : "No states found"}
                      </p>
                    ) : (
                      filteredDbStates.map((s) => (
                        <SelectItem key={s.id} value={String(s.id)}>
                          {s.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {shouldShowStateError && (
                  <p className="text-xs text-destructive flex items-center gap-1 font-medium mt-1">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    {stateError}
                  </p>
                )}
              </div>
            )}

            {/* 2. MARKET SELECTION (Single Select: Visible for Market Manager, District Manager. Disabled until State is selected) */}
            {needsMarket && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>
                    Market <span className="text-destructive font-semibold">*</span>
                  </Label>
                  {loadingMarkets && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
                </div>
                <Select
                  value={selectedMarketId}
                  disabled={!selectedStateId || loadingMarkets}
                  onValueChange={setSelectedMarketId}
                  onOpenChange={(open) => {
                    if (!open) setMarketSearch("");
                    else setTimeout(() => marketSearchRef.current?.focus(), 100);
                  }}
                >
                  <SelectTrigger
                    className={`w-full bg-white dark:bg-zinc-950 disabled:opacity-50 disabled:cursor-not-allowed ${
                      shouldShowMarketError ? "border-destructive ring-1 ring-destructive/30" : ""
                    }`}
                  >
                    <SelectValue
                      placeholder={
                        !selectedStateId
                          ? "Select State First"
                          : loadingMarkets
                            ? "Loading markets..."
                            : filteredDbMarkets.length === 0
                              ? "No markets available"
                              : "Select market"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent
                    onKeyDown={(e) => e.stopPropagation()}
                    onKeyUp={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center px-2 py-1.5 border-b sticky top-0 bg-popover z-10">
                      <Search className="h-3.5 w-3.5 mr-2 text-muted-foreground shrink-0" />
                      <input
                        ref={marketSearchRef}
                        placeholder="Search markets..."
                        value={marketSearch}
                        onChange={(e) => {
                          setMarketSearch(e.target.value);
                          setTimeout(() => marketSearchRef.current?.focus(), 0);
                        }}
                        className="w-full text-xs bg-transparent outline-none placeholder:text-muted-foreground"
                      />
                    </div>
                    {filteredDbMarkets.length === 0 ? (
                      <p className="text-[11px] text-center text-muted-foreground p-2">
                        {loadingMarkets ? "Fetching markets..." : "No markets found"}
                      </p>
                    ) : (
                      filteredDbMarkets.map((m) => (
                        <SelectItem key={m.id} value={String(m.id)}>
                          {m.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {shouldShowMarketError && (
                  <p className="text-xs text-destructive flex items-center gap-1 font-medium mt-1">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    {marketError}
                  </p>
                )}
              </div>
            )}

            {/* 3. DISTRICT SELECTION (Single Select: Visible for District Manager. Disabled until Market is selected) */}
            {needsDistrict && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>
                    District <span className="text-destructive font-semibold">*</span>
                  </Label>
                  {loadingDistricts && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
                </div>
                <Select
                  value={selectedDistrictId}
                  disabled={!selectedMarketId || loadingDistricts}
                  onValueChange={setSelectedDistrictId}
                  onOpenChange={(open) => {
                    if (!open) setDistrictSearch("");
                    else setTimeout(() => districtSearchRef.current?.focus(), 100);
                  }}
                >
                  <SelectTrigger
                    className={`w-full bg-white dark:bg-zinc-950 disabled:opacity-50 disabled:cursor-not-allowed ${
                      shouldShowDistrictError ? "border-destructive ring-1 ring-destructive/30" : ""
                    }`}
                  >
                    <SelectValue
                      placeholder={
                        !selectedMarketId
                          ? "Select Market First"
                          : loadingDistricts
                            ? "Loading districts..."
                            : filteredDbDistricts.length === 0
                              ? "No districts available"
                              : "Select district"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent
                    onKeyDown={(e) => e.stopPropagation()}
                    onKeyUp={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center px-2 py-1.5 border-b sticky top-0 bg-popover z-10">
                      <Search className="h-3.5 w-3.5 mr-2 text-muted-foreground shrink-0" />
                      <input
                        ref={districtSearchRef}
                        placeholder="Search districts..."
                        value={districtSearch}
                        onChange={(e) => {
                          setDistrictSearch(e.target.value);
                          setTimeout(() => districtSearchRef.current?.focus(), 0);
                        }}
                        className="w-full text-xs bg-transparent outline-none placeholder:text-muted-foreground"
                      />
                    </div>
                    {filteredDbDistricts.length === 0 ? (
                      <p className="text-[11px] text-center text-muted-foreground p-2">
                        {loadingDistricts ? "Fetching districts..." : "No districts found"}
                      </p>
                    ) : (
                      filteredDbDistricts.map((d) => (
                        <SelectItem key={d.id} value={String(d.id)}>
                          {d.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {shouldShowDistrictError && (
                  <p className="text-xs text-destructive flex items-center gap-1 font-medium mt-1">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    {districtError}
                  </p>
                )}
              </div>
            )}

            {/* 4. STORE SELECTION (Single Select: Visible ONLY for Store Manager) */}
            {needsStore && (
              <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
                <div className="flex items-center justify-between">
                  <Label>
                    Store <span className="text-destructive font-semibold">*</span>
                  </Label>
                  {loadingStores && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
                </div>
                <Select
                  value={selectedStoreId}
                  disabled={loadingStores}
                  onValueChange={setSelectedStoreId}
                  onOpenChange={(open) => {
                    if (!open) setStoreSearch("");
                    else setTimeout(() => storeSearchRef.current?.focus(), 100);
                  }}
                >
                  <SelectTrigger
                    className={`w-full bg-white dark:bg-zinc-950 ${
                      shouldShowStoreError ? "border-destructive ring-1 ring-destructive/30" : ""
                    }`}
                  >
                    <SelectValue
                      placeholder={loadingStores ? "Loading stores..." : "Select store"}
                    />
                  </SelectTrigger>
                  <SelectContent
                    onKeyDown={(e) => e.stopPropagation()}
                    onKeyUp={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center px-2 py-1.5 border-b sticky top-0 bg-popover z-10">
                      <Search className="h-3.5 w-3.5 mr-2 text-muted-foreground shrink-0" />
                      <input
                        ref={storeSearchRef}
                        placeholder="Search stores..."
                        value={storeSearch}
                        onChange={(e) => {
                          setStoreSearch(e.target.value);
                          setTimeout(() => storeSearchRef.current?.focus(), 0);
                        }}
                        className="w-full text-xs bg-transparent outline-none placeholder:text-muted-foreground"
                      />
                    </div>
                    {filteredDbStores.length === 0 ? (
                      <p className="text-[11px] text-center text-muted-foreground p-2">
                        {loadingStores ? "Fetching stores..." : "No stores found"}
                      </p>
                    ) : (
                      filteredDbStores.map((s) => (
                        <SelectItem key={s.id} value={String(s.id)}>
                          {s.name} {s.number ? `(${s.number})` : ""}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {shouldShowStoreError && (
                  <p className="text-xs text-destructive flex items-center gap-1 font-medium mt-1">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    {storeError}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <Button
        className="w-full flex items-center justify-center gap-2 mt-2 h-10 font-medium cursor-pointer"
        disabled={submitting}
        onClick={submit}
      >
        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
        {initial ? "Save changes" : "Create user"}
      </Button>
    </form>
  );
}

export default UsersPage;
