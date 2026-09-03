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
import {
  usersApi,
  hierarchyApi,
  StatesApi,
  DistrictsApi,
  MarketsApi,
  StoresApi,
} from "@/lib/api/client";
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
  const [users, setUsers] = useState<any[]>([]);
  const [deptFilter, setDeptFilter] = useState<string>("all");

  const [portalFilter, setPortalFilter] = useState<string>("all");

  const [dynamicRoles, setDynamicRoles] = useState<any[]>([]);
  const [dynamicDepts, setDynamicDepts] = useState<{ id: number; name: string }[]>([]);
  const [portalsMasterList, setPortalsMasterList] = useState<any[]>([]);

  const [mainDeptSearch, setMainDeptSearch] = useState("");
  const [mainPortalSearch, setMainPortalSearch] = useState(""); // Portal Toolbar Search state

  const mainDeptSearchRef = useRef<HTMLInputElement>(null);
  const mainPortalSearchRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [loadingUserId, setLoadingUserId] = useState<string | null>(null);

  const [page, setPage] = useState<number>(0);
  const [size, setSize] = useState<number>(15);
  const [totalRecords, setTotalRecords] = useState<number>(0);

  const lastFetchedKey = useRef<string>("");
  const isFetchingRef = useRef<boolean>(false);
  const initialLookupsFetchedRef = useRef<boolean>(false);

  const navigate = useNavigate();

  // 🌟 Fetching Portals with Authorized Token Header Injection Pattern
  const fetchPortalsMaster = async () => {
    try {
      const token = localStorage.getItem("token");
      // const response = await fetch("http://localhost:4570/api/portals/get-all", {
      const response = await fetch(
        "http://technocomm-dev.us-west-2.elasticbeanstalk.com/api/portals/get-all",
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : "", // Token integrated identically to api client
          },
        },
      );
      const res = await response.json();
      if (res.success && Array.isArray(res.data)) {
        setPortalsMasterList(res.data);
      }
    } catch (err) {
      console.error("Failed to load portals structure:", err);
    }
  };

  const fetchInitialLookups = async () => {
    if (initialLookupsFetchedRef.current) return;
    try {
      await fetchPortalsMaster();
      const [rolesRes, deptsRes] = await Promise.all([
        hierarchyApi.getRoles(),
        hierarchyApi.getDepartments(),
      ]);
      if (rolesRes.success && Array.isArray(rolesRes.data)) setDynamicRoles(rolesRes.data);
      if (deptsRes.success && Array.isArray(deptsRes.data)) setDynamicDepts(deptsRes.data);
      if (rolesRes.success && deptsRes.success) {
        initialLookupsFetchedRef.current = true;
      }
    } catch (err) {
      console.error("Failed to load initial lookups:", err);
    }
  };

  const fetchUsers = async (
    targetPage: number,
    targetSize: number,
    targetDept: string,
    targetPortal: string,
  ) => {
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

  useEffect(() => {
    fetchUsers(page, size, deptFilter, portalFilter);
  }, [page, size, deptFilter, portalFilter]);

  const handleDelete = async (u: any) => {
    try {
      setActionLoading(true);
      const res = await usersApi.delete(Number(u.id));
      if (res.success) {
        toast.success("User record safely removed");
        lastFetchedKey.current = "";
        fetchUsers(page, size, deptFilter, portalFilter);
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
  }, []);

  const filteredMainDeptsOptions = useMemo(() => {
    return dynamicDepts.filter((d) =>
      (d.name || "").toLowerCase().includes(mainDeptSearch.toLowerCase()),
    );
  }, [dynamicDepts, mainDeptSearch]);

  const filteredMainPortalsOptions = useMemo(() => {
    return portalsMasterList.filter((p) =>
      (p.name || "").toLowerCase().includes(mainPortalSearch.toLowerCase()),
    );
  }, [portalsMasterList, mainPortalSearch]);

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
                disabled={deptFilter === "all" && portalFilter === "all"}
                onClick={() => {
                  lastFetchedKey.current = "";
                  setPage(0);
                  setDeptFilter("all");
                  setPortalFilter("all");
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
              searchValue: (u) => u.fullName,
            },
            {
              key: "email",
              header: "Email",
              accessor: (u) => u.email || "—",
              searchValue: (u) => u.email,
            },
            { key: "phone", header: "Phone", accessor: (u) => u.phone || "—" },
            { key: "dept", header: "Department", accessor: (u) => u.department || "—" },
            {
              key: "active",
              header: "Active",
              className: "w-24",
              accessor: (u) => {
                const isCurrentRowLoading = loadingUserId === u.id;

                const rowEmail = u.email ? String(u.email).toLowerCase().trim() : "";

                const isSelfDeactivation = rowEmail === currentLoggedInUserEmail;

                //  Default admin email
                const isDefaultAdmin = rowEmail === "admin@techno.com";

                const isDisabled = isCurrentRowLoading || isSelfDeactivation || isDefaultAdmin;

                const tooltipMessage = isSelfDeactivation
                  ? "You cannot deactivate your own account"
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

          onDelete={handleDelete}
          renderForm={(initial, close) => (
            <UserForm
              initial={initial}
              dynamicRoles={dynamicRoles}
              portalsMasterList={portalsMasterList}
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
  dynamicRoles,
  portalsMasterList,
  onSaved,
}: {
  initial: any | null;
  dynamicRoles: any[];
  portalsMasterList: any[];
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
  const formContainerRef = useRef<HTMLDivElement>(null);

  const markTouched = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const [department, setDepartment] = useState<string>(
    initial?.department === "—" ? "placeholder" : (initial?.department ?? "placeholder"),
  );
  const [allowedUserManagement, setAllowedUserManagement] = useState<boolean>(
    initial?.allowedUserManagement ?? false,
  );
  const [active, setActive] = useState<boolean>(initial?.active ?? true);

  const [portalConfig, setPortalConfig] = useState<
    Record<string, { enabled: boolean; roleName: string }>
  >(() => {
    const initMap: Record<string, { enabled: boolean; roleName: string }> = {};
    portalsMasterList.forEach((p) => {
      initMap[p.name] = { enabled: false, roleName: "user" };
    });
    if (initial && Array.isArray(initial.portalAccess)) {
      initial.portalAccess.forEach((pa: any) => {
        initMap[pa.portalName] = { enabled: true, roleName: pa.roleName };
      });
    }
    return initMap;
  });

  const [dbDepts, setDbDepts] = useState<any[]>([]);
  const [dbStates, setDbStates] = useState<any[]>([]);
  const [dbDistricts, setDbDistricts] = useState<any[]>([]);
  const [dbMarkets, setDbMarkets] = useState<any[]>([]);
  const [dbStores, setDbStores] = useState<any[]>([]);

  const initialIds = (arr: any[] | undefined) =>
    Array.isArray(arr) ? arr.map((x: any) => String(x?.id ?? x)).filter(Boolean) : [];

  const [stateIds, setStateIds] = useState<string[]>(initialIds(initial?.states));
  const [districtIds, setDistrictIds] = useState<string[]>(initialIds(initial?.districts));
  const [marketIds, setMarketIds] = useState<string[]>(initialIds(initial?.markets));
  const [storeIds, setStoreIds] = useState<string[]>(initialIds(initial?.stores));
  const [submitting, setSubmitting] = useState(false);

  const activeRolesList = Object.keys(portalConfig)
    .filter((k) => portalConfig[k].enabled)
    .map((k) => portalConfig[k].roleName.toLowerCase());

  const needsState = activeRolesList.some((r) =>
    [
      "state_manager",
      "statemanager",
      "district_manager",
      "districtmanager",
      "market_manager",
      "marketmanager",
      "store_manager",
      "storemanager",
    ].includes(r),
  );
  const needsDistrict = activeRolesList.some((r) =>
    [
      "district_manager",
      "districtmanager",
      "market_manager",
      "marketmanager",
      "store_manager",
      "storemanager",
    ].includes(r),
  );
  const needsMarket = activeRolesList.some((r) =>
    ["market_manager", "marketmanager", "store_manager", "storemanager"].includes(r),
  );
  const needsStore = activeRolesList.some((r) => ["store_manager", "storemanager"].includes(r));

  useEffect(() => {
    hierarchyApi.getDepartments().then((res) => {
      if (res.success) setDbDepts(res.data);
    });
    StatesApi.getAll({ size: 1000 } as any).then((res) => {
      if (res.success && res.data) setDbStates(res.data);
    });
    DistrictsApi.getAll({ size: 5000 } as any).then((res) => {
      if (res.success && res.data) setDbDistricts(res.data);
    });
    MarketsApi.getAll({ size: 5000 } as any).then((res) => {
      if (res.success && res.data) setDbMarkets(res.data);
    });
    StoresApi.getAll({ size: 5000 } as any).then((res) => {
      if (res.success && res.data) setDbStores(res.data);
    });
  }, []);

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
    if (needsState && stateIds.length === 0) return "Select at least one state";
    return null;
  }, [needsState, stateIds.length]);

  const districtError = useMemo(() => {
    if (needsDistrict && districtIds.length === 0) return "Select at least one district";
    return null;
  }, [needsDistrict, districtIds.length]);

  const marketError = useMemo(() => {
    if (needsMarket && marketIds.length === 0) return "Select at least one market";
    return null;
  }, [needsMarket, marketIds.length]);

  const storeError = useMemo(() => {
    if (needsStore && storeIds.length === 0) return "Select at least one store";
    return null;
  }, [needsStore, storeIds.length]);

  const canSave =
    !fullNameError &&
    !emailError &&
    !departmentError &&
    !passwordError &&
    !confirmPasswordError &&
    !portalsError &&
    !stateError &&
    !districtError &&
    !marketError &&
    !storeError;

  const firstError =
    fullNameError ||
    emailError ||
    departmentError ||
    passwordError ||
    confirmPasswordError ||
    portalsError ||
    stateError ||
    districtError ||
    marketError ||
    storeError;

  const shouldShowFullNameError = (attemptedSubmit || touched.fullName) && !!fullNameError;
  const shouldShowEmailError = (attemptedSubmit || touched.email) && !!emailError;
  const shouldShowDeptError = (attemptedSubmit || touched.department) && !!departmentError;
  const shouldShowPasswordError = (attemptedSubmit || touched.password) && !!passwordError;
  const shouldShowConfirmError =
    (attemptedSubmit || touched.confirmPassword) && !!confirmPasswordError;
  const shouldShowPortalsError = attemptedSubmit && !!portalsError;
  const shouldShowStateError = attemptedSubmit && !!stateError;
  const shouldShowDistrictError = attemptedSubmit && !!districtError;
  const shouldShowMarketError = attemptedSubmit && !!marketError;
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
      const selectedDistricts = pickObjs(dbDistricts, districtIds);
      const selectedMarkets = pickObjs(dbMarkets, marketIds);
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
        districts: needsDistrict ? selectedDistricts : [],
        markets: needsMarket ? selectedMarkets : [],
        stores: needsStore ? selectedStores : [],
      };

      if (initial) {
        const response = await usersApi.update({ id: Number(initial.id), ...payload });
        if (response.success) {
          toast.success("User config sync finalized");
          onSaved();
        }
      } else {
        const response = await usersApi.add({ ...payload, password } as any);
        if (response.success) {
          toast.success("User created successfully");
          onSaved();
        }
      }
    } catch (err: any) {
      toast.error(err?.message || "An error occurred during submission workflow");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      ref={formContainerRef}
      className="space-y-4 max-h-[82vh] overflow-y-auto px-1 scrollbar-thin"
    >
      {attemptedSubmit && !canSave && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-2.5 text-xs font-medium text-destructive animate-fade-in">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>Please fill in or correct the highlighted fields marked in red below.</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label
            className={
              shouldShowFullNameError ? "text-red-600 dark:text-red-400 font-semibold" : ""
            }
          >
            Full name <span className="text-destructive">*</span>
          </Label>
          <Input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            onBlur={() => markTouched("fullName")}
            placeholder="e.g. Arslan Khan"
            autoComplete="off"
            className={
              shouldShowFullNameError
                ? "border-red-500 focus-visible:ring-red-500 ring-2 ring-red-500/30 bg-red-50/40 dark:bg-red-950/20"
                : ""
            }
          />
          {shouldShowFullNameError && (
            <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1 font-medium mt-1">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {fullNameError}
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label
            className={shouldShowEmailError ? "text-red-600 dark:text-red-400 font-semibold" : ""}
          >
            Email or NTID <span className="text-destructive">*</span>
          </Label>
          <Input
            type="text"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => markTouched("email")}
            placeholder="you@techno.com or NTID"
            autoComplete="new-password"
            className={
              shouldShowEmailError
                ? "border-red-500 focus-visible:ring-red-500 ring-2 ring-red-500/30 bg-red-50/40 dark:bg-red-950/20"
                : ""
            }
          />
          {shouldShowEmailError && (
            <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1 font-medium mt-1">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {emailError}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>
            Phone <span className="text-muted-foreground text-xs">(Optional)</span>
          </Label>
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="e.g. +923001234567"
          />
        </div>
        <div className="space-y-1.5">
          <Label
            className={shouldShowDeptError ? "text-red-600 dark:text-red-400 font-semibold" : ""}
          >
            Department <span className="text-destructive">*</span>
          </Label>
          <Select
            value={department}
            onValueChange={(val) => {
              setDepartment(val);
              markTouched("department");
            }}
          >
            <SelectTrigger
              className={
                shouldShowDeptError
                  ? "border-red-500 focus:ring-red-500 ring-2 ring-red-500/30 bg-red-50/40 dark:bg-red-950/20 text-red-700 dark:text-red-300"
                  : ""
              }
              onBlur={() => markTouched("department")}
            >
              <SelectValue placeholder="Select department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="placeholder" disabled>
                Select department
              </SelectItem>
              {dbDepts.map((d) => (
                <SelectItem key={d.id} value={d.name}>
                  {d.name || "—"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {shouldShowDeptError && (
            <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1 font-medium mt-1">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {departmentError}
            </p>
          )}
        </div>
      </div>

      {!initial && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label
              className={
                shouldShowPasswordError ? "text-red-600 dark:text-red-400 font-semibold" : ""
              }
            >
              Password <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => markTouched("password")}
                placeholder="Min 6 characters"
                className={`pr-10 ${
                  shouldShowPasswordError
                    ? "border-red-500 focus-visible:ring-red-500 ring-2 ring-red-500/30 bg-red-50/40 dark:bg-red-950/20"
                    : ""
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-0.5"
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {shouldShowPasswordError && (
              <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1 font-medium mt-1">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {passwordError}
              </p>
            )}

            {/* Explicit password requirements display as requested */}
            <div
              className={`mt-1.5 rounded-lg border p-2.5 text-[11px] space-y-1.5 transition-colors ${
                shouldShowPasswordError
                  ? "border-red-300 dark:border-red-900/60 bg-red-50/60 dark:bg-red-950/30"
                  : "border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/60"
              }`}
            >
              <p
                className={`font-semibold ${shouldShowPasswordError ? "text-red-700 dark:text-red-300" : "text-zinc-700 dark:text-zinc-300"}`}
              >
                Password Requirements:
              </p>
              <div className="flex items-center gap-1.5">
                <span
                  className={`inline-block h-2 w-2 rounded-full shrink-0 ${
                    password.length >= 6
                      ? "bg-emerald-500 ring-2 ring-emerald-500/20"
                      : shouldShowPasswordError
                        ? "bg-red-500 ring-2 ring-red-500/20"
                        : "bg-zinc-400"
                  }`}
                />
                <span
                  className={
                    password.length >= 6
                      ? "text-emerald-600 dark:text-emerald-400 font-medium"
                      : shouldShowPasswordError
                        ? "text-red-600 dark:text-red-400 font-medium"
                        : "text-muted-foreground"
                  }
                >
                  Length: Minimum 6 characters {password.length > 0 ? `(${password.length}/6)` : ""}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className={`inline-block h-2 w-2 rounded-full shrink-0 ${
                    /[A-Za-z]/.test(password) && /[0-9]/.test(password)
                      ? "bg-emerald-500 ring-2 ring-emerald-500/20"
                      : "bg-zinc-400"
                  }`}
                />
                <span
                  className={
                    /[A-Za-z]/.test(password) && /[0-9]/.test(password)
                      ? "text-emerald-600 dark:text-emerald-400 font-medium"
                      : "text-muted-foreground"
                  }
                >
                  Type: Recommended combination of letters & numbers
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label
              className={
                shouldShowConfirmError ? "text-red-600 dark:text-red-400 font-semibold" : ""
              }
            >
              Confirm password <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onBlur={() => markTouched("confirmPassword")}
                placeholder="Re-enter password"
                className={`pr-10 ${
                  shouldShowConfirmError
                    ? "border-red-500 focus-visible:ring-red-500 ring-2 ring-red-500/30 bg-red-50/40 dark:bg-red-950/20"
                    : ""
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-0.5"
                tabIndex={-1}
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {shouldShowConfirmError && (
              <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1 font-medium mt-1">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {confirmPasswordError}
              </p>
            )}
            {!shouldShowConfirmError &&
              confirmPassword.length > 0 &&
              password === confirmPassword && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium mt-1">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  Passwords match
                </p>
              )}
          </div>
        </div>
      )}

      <div className="bg-zinc-50 dark:bg-zinc-900 p-3 rounded-lg border border-zinc-200/60 dark:border-zinc-800 grid grid-cols-2 gap-4">
        <div className="flex items-center justify-between space-x-2">
          <div className="flex flex-col space-y-0.5">
            <Label className="text-sm font-semibold">User Manager Access</Label>
            <span className="text-[11px] text-muted-foreground">
              Allows managing user directories administration
            </span>
          </div>
          <Switch checked={allowedUserManagement} onCheckedChange={setAllowedUserManagement} />
        </div>

        <div className="flex items-center justify-between space-x-2">
          <div className="flex flex-col space-y-0.5">
            <Label className="text-sm font-semibold">Account Status</Label>
            <span className="text-[11px] text-muted-foreground">
              Toggle active status state for portal operations logging
            </span>
          </div>
          <Switch checked={active} onCheckedChange={setActive} />
        </div>
      </div>

      <div
        className={`border rounded-xl overflow-hidden shadow-sm transition-colors ${
          shouldShowPortalsError
            ? "border-destructive ring-1 ring-destructive/30 bg-destructive/[0.02]"
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
          {portalsMasterList.map((p) => {
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
          })}
        </div>

        {shouldShowPortalsError && (
          <div className="p-2.5 bg-destructive/10 border-t border-destructive/20 text-destructive text-xs flex items-center gap-1.5 font-medium">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            Please enable access control mapping for at least one portal.
          </div>
        )}
      </div>

      {needsState && (
        <div className="p-4 bg-zinc-50/50 dark:bg-zinc-900/40 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 space-y-3 animate-fade-in">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 pb-1 border-b border-zinc-200/60">
            <AlertCircle className="h-3.5 w-3.5" /> Regional Authority Hierarchy Configuration Setup
          </div>

          <div className="grid grid-cols-2 gap-3">
            {needsState && (
              <div className="space-y-1.5">
                <Label>
                  States <span className="text-destructive">*</span>
                </Label>
                <MultiSelect
                  options={dbStates.map((s) => ({ value: String(s.id), label: s.name }))}
                  value={stateIds}
                  onChange={setStateIds}
                  placeholder="Select states"
                  className={
                    shouldShowStateError ? "border-destructive ring-1 ring-destructive/30" : ""
                  }
                />
                {shouldShowStateError && (
                  <p className="text-xs text-destructive flex items-center gap-1 font-medium mt-1">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    {stateError}
                  </p>
                )}
              </div>
            )}

            {needsDistrict && (
              <div className="space-y-1.5">
                <Label>
                  Districts <span className="text-destructive">*</span>
                </Label>
                <MultiSelect
                  options={dbDistricts.map((d) => ({ value: String(d.id), label: d.name }))}
                  value={districtIds}
                  onChange={setDistrictIds}
                  placeholder="Select districts"
                  className={
                    shouldShowDistrictError ? "border-destructive ring-1 ring-destructive/30" : ""
                  }
                />
                {shouldShowDistrictError && (
                  <p className="text-xs text-destructive flex items-center gap-1 font-medium mt-1">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    {districtError}
                  </p>
                )}
              </div>
            )}

            {needsMarket && (
              <div className="space-y-1.5">
                <Label>
                  Markets <span className="text-destructive">*</span>
                </Label>
                <MultiSelect
                  options={dbMarkets.map((m) => ({ value: String(m.id), label: m.name }))}
                  value={marketIds}
                  onChange={setMarketIds}
                  placeholder="Select markets"
                  className={
                    shouldShowMarketError ? "border-destructive ring-1 ring-destructive/30" : ""
                  }
                />
                {shouldShowMarketError && (
                  <p className="text-xs text-destructive flex items-center gap-1 font-medium mt-1">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    {marketError}
                  </p>
                )}
              </div>
            )}

            {needsStore && (
              <div className="space-y-1.5">
                <Label>
                  Stores <span className="text-destructive">*</span>
                </Label>
                <MultiSelect
                  options={dbStores.map((s) => ({ value: String(s.id), label: s.name }))}
                  value={storeIds}
                  onChange={setStoreIds}
                  placeholder="Select stores"
                  className={
                    shouldShowStoreError ? "border-destructive ring-1 ring-destructive/30" : ""
                  }
                />
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
    </div>
  );
}

export default UsersPage;
