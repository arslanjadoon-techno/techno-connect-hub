import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { CrudPage } from "@/components/crud-page";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { MultiSelect } from "@/components/multi-select";
import { usersApi, hierarchyApi, StatesApi, DistrictsApi, MarketsApi, StoresApi } from "@/lib/api/client";
import { toast } from "sonner";
import { Loader2, Search, XCircle, Shield, CheckCircle2, AlertCircle } from "lucide-react";
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
    department: bu.department && typeof bu.department === "object"
      ? bu.department.name
      : (bu.department || "—"),
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

  // 🌟 ROLES FILTER REPLACED WITH PORTALS FILTER
  const [portalFilter, setPortalFilter] = useState<string>("all");

  const [dynamicRoles, setDynamicRoles] = useState<string[]>([]);
  const [dynamicDepts, setDynamicDepts] = useState<{ id: number; name: string }[]>([]);
  const [portalsMasterList, setPortalsMasterList] = useState<any[]>([]);

  const [mainDeptSearch, setMainDeptSearch] = useState("");
  const [mainPortalSearch, setMainPortalSearch] = useState(""); // Portal Toolbar Search state

  const mainDeptSearchRef = useRef<HTMLInputElement>(null);
  const mainPortalSearchRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [page, setPage] = useState<number>(0);
  const [size, setSize] = useState<number>(10);
  const [totalRecords, setTotalRecords] = useState<number>(0);

  const lastFetchedKey = useRef<string>("");
  const isFetchingRef = useRef<boolean>(false);
  const initialLookupsFetchedRef = useRef<boolean>(false);

  const navigate = useNavigate();

  // 🌟 Fetching Portals with Authorized Token Header Injection Pattern
  const fetchPortalsMaster = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:4570/api/portals/get-all", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": token ? `Bearer ${token}` : "", // Token integrated identically to api client
        },
      });
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
        hierarchyApi.getDepartments()
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

  const fetchUsers = async (targetPage: number, targetSize: number, targetDept: string, targetPortal: string) => {
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
        portal: targetPortal !== "all" ? targetPortal : undefined
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
      setActionLoading(true);
      // Optimistic UI
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, active: nextValue } : x));
      const raw = u._raw ?? {};
      const payload: any = {
        id: Number(u.id),
        fullName: raw.fullName ?? u.fullName,
        email: raw.email ?? u.email,
        phone: raw.phone ?? (u.phone === "—" ? null : u.phone),
        department: raw.department ?? u.departmentObj ?? null,
        allowedUserManagement: raw.allowedUserManagement ?? u.allowedUserManagement,
        active: nextValue,
        assignedPortals: raw.assignedPortals ?? u.assignedPortals,
        portalAccess: raw.portalAccess ?? u.portalAccess,
        states: raw.states ?? u.states,
        districts: raw.districts ?? u.districts,
        markets: raw.markets ?? u.markets,
        stores: raw.stores ?? u.stores,
      };
      const res = await usersApi.update(payload);
      if (res.success) {
        toast.success(`User ${nextValue ? "activated" : "deactivated"}`);
      }
    } catch (err: any) {
      // revert
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, active: !nextValue } : x));
      toast.error(err?.message || "Failed to update status");
    } finally {
      setActionLoading(false);
    }
  };

  const filteredMainDeptsOptions = useMemo(() => {
    return dynamicDepts.filter((d) => (d.name || "").toLowerCase().includes(mainDeptSearch.toLowerCase()));
  }, [dynamicDepts, mainDeptSearch]);

  const filteredMainPortalsOptions = useMemo(() => {
    return portalsMasterList.filter((p) => (p.name || "").toLowerCase().includes(mainPortalSearch.toLowerCase()));
  }, [portalsMasterList, mainPortalSearch]);

  const getPortalColor = (name: string) => {
    const colors: Record<string, string> = {
      ticketing: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400",
      ranker: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400",
      commission: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400",
      leasing: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400",
      attendence: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400",
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
      <div className="w-full border-0 shadow-none bg-transparent [&_input]:bg-white dark:[&_input]:bg-zinc-950 [&_button.w-\[180px\]]:bg-white dark:[&_button.w-\[180px\]]:bg-zinc-950 [&_tbody_tr]:bg-background [&_tbody_tr]:even:bg-zinc-50/50 dark:[&_tbody_tr]:even:bg-zinc-900/30 [&_tbody_tr]:hover:bg-muted/40 [&_th:last-child]:text-right [&_th:last-child]:pr-10 [&_td:last-child]:text-right">
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
                <span className="absolute -top-1 left-2 bg-background px-1 text-[11px] font-semibold text-muted-foreground z-10">Department</span>
                <Select value={deptFilter} onValueChange={(val) => { lastFetchedKey.current = ""; setPage(0); setDeptFilter(val); }} onOpenChange={(open) => { if (!open) setMainDeptSearch(""); else setTimeout(() => mainDeptSearchRef.current?.focus(), 100); }}>
                  <SelectTrigger className="w-[180px] h-9 focus:ring-0 border-muted-foreground/40"><SelectValue placeholder="Department" /></SelectTrigger>
                  <SelectContent onKeyDown={(e) => e.stopPropagation()}>
                    <div className="flex items-center px-2 py-1.5 border-b sticky top-0 bg-popover z-10">
                      <Search className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                      <input ref={mainDeptSearchRef} placeholder="Search depts..." value={mainDeptSearch} onChange={(e) => setMainDeptSearch(e.target.value)} className="w-full text-xs bg-transparent outline-none" />
                    </div>
                    <SelectItem value="all">All departments</SelectItem>
                    {filteredMainDeptsOptions.map((d) => <SelectItem key={d.id} value={d.name}>{d.name || "—"}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* 🌟 ROLES DROP-DOWN REPLACED WITH PORTALS SELECTION FILTER */}
              <div className="relative flex flex-col pt-2.5">
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
              </div>

              <Button type="button" variant="ghost" size="sm" disabled={deptFilter === "all" && portalFilter === "all"} onClick={() => { lastFetchedKey.current = ""; setPage(0); setDeptFilter("all"); setPortalFilter("all"); }} className="h-9 px-3 text-xs border border-dashed border-muted-foreground/30"><XCircle className="h-3.5 w-3.5 mr-1.5" />Reset Filters</Button>
            </div>
          }
          onRowClick={(u: any) => navigate(`/admin/users/${u.id}`)}
          columns={[
            {
              key: "name", header: "Name", accessor: (u) => (
                <div className="flex items-center gap-2 py-1">
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white uppercase"
                    style={{ backgroundColor: u.avatarColor }}
                  >
                    {(u.firstName?.[0] || "")}{(u.lastName?.[0] || "")}
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
              ), searchValue: (u) => u.fullName
            },
            { key: "email", header: "Email", accessor: (u) => u.email || "—", searchValue: (u) => u.email },
            { key: "phone", header: "Phone", accessor: (u) => u.phone || "—" },
            { key: "dept", header: "Department", accessor: (u) => u.department || "—" },
            {
              key: "active",
              header: "Active",
              className: "w-24",
              accessor: (u) => (
                <div onClick={(e) => e.stopPropagation()}>
                  <Switch
                    checked={!!u.active}
                    disabled={actionLoading}
                    onCheckedChange={(v) => handleToggleActive(u, v)}
                  />
                </div>
              )
            },
          ]}
          hideEdit
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
  onSaved
}: {
  initial: any | null;
  dynamicRoles: string[];
  portalsMasterList: any[];
  onSaved: () => void
}) {
  const [fullName, setFullName] = useState(initial?.fullName ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [phone, setPhone] = useState(initial?.phone === "—" ? "" : (initial?.phone ?? ""));
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [department, setDepartment] = useState<string>(initial?.department === "—" ? "placeholder" : (initial?.department ?? "placeholder"));
  const [allowedUserManagement, setAllowedUserManagement] = useState<boolean>(initial?.allowedUserManagement ?? false);
  const [active, setActive] = useState<boolean>(initial?.active ?? true);

  const [portalConfig, setPortalConfig] = useState<Record<string, { enabled: boolean; roleName: string }>>(() => {
    const initMap: Record<string, { enabled: boolean; roleName: string }> = {};
    portalsMasterList.forEach(p => {
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
    .filter(k => portalConfig[k].enabled)
    .map(k => portalConfig[k].roleName.toLowerCase());

  const needsState = activeRolesList.some(r => ["state_manager", "statemanager", "district_manager", "districtmanager", "market_manager", "marketmanager", "store_manager", "storemanager"].includes(r));
  const needsDistrict = activeRolesList.some(r => ["district_manager", "districtmanager", "market_manager", "marketmanager", "store_manager", "storemanager"].includes(r));
  const needsMarket = activeRolesList.some(r => ["market_manager", "marketmanager", "store_manager", "storemanager"].includes(r));
  const needsStore = activeRolesList.some(r => ["store_manager", "storemanager"].includes(r));

  useEffect(() => {
    hierarchyApi.getDepartments().then(res => { if (res.success) setDbDepts(res.data); });
    StatesApi.getAll({ size: 1000 } as any).then(res => { if (res.success && res.data) setDbStates(res.data); });
    DistrictsApi.getAll({ size: 5000 } as any).then(res => { if (res.success && res.data) setDbDistricts(res.data); });
    MarketsApi.getAll({ size: 5000 } as any).then(res => { if (res.success && res.data) setDbMarkets(res.data); });
    StoresApi.getAll({ size: 5000 } as any).then(res => { if (res.success && res.data) setDbStores(res.data); });
  }, []);

  const handlePortalToggle = (pName: string, checked: boolean) => {
    setPortalConfig(prev => ({
      ...prev,
      [pName]: { ...prev[pName], enabled: checked }
    }));
  };

  const handlePortalRoleChange = (pName: string, selectedRole: string) => {
    setPortalConfig(prev => ({
      ...prev,
      [pName]: { ...prev[pName], roleName: selectedRole }
    }));
  };

  const identityOk = email.trim().length >= 2;
  const passwordOk = initial ? true : password.length >= 6 && password === confirmPassword;

  const isDeptFilled = department !== "placeholder" && !!department;
  const isHierarchyFilled =
    (!needsState || stateIds.length > 0) &&
    (!needsDistrict || districtIds.length > 0) &&
    (!needsMarket || marketIds.length > 0) &&
    (!needsStore || storeIds.length > 0);

  const hasSelectedPortals = Object.values(portalConfig).some(p => p.enabled);
  const canSave = fullName.trim().length >= 2 && validEmail && passwordOk && isDeptFilled && isHierarchyFilled && hasSelectedPortals;

  const validationHint = (() => {
    if (!fullName.trim()) return "Full name is required";
    if (!validEmail) return "Valid email address structure is required";
    if (!initial && password.length < 6) return "Password must be at least 6 characters";
    if (!initial && password !== confirmPassword) return "Form entry passwords do not match";
    if (department === "placeholder") return "Department assignment is required";
    if (!hasSelectedPortals) return "Please enable access control mapping for at least one portal";
    if (needsState && stateIds.length === 0) return "Select at least one state";
    if (needsDistrict && districtIds.length === 0) return "Select at least one district";
    if (needsMarket && marketIds.length === 0) return "Select at least one market";
    if (needsStore && storeIds.length === 0) return "Select at least one store";
    return null;
  })();

  const submit = async () => {
    if (!canSave) {
      if (validationHint) toast.error(validationHint);
      return;
    }
    try {
      setSubmitting(true);
      const assignedPortals: string[] = [];
      const portalAccess: any[] = [];

      Object.keys(portalConfig).forEach(k => {
        if (portalConfig[k].enabled) {
          const masterObjectRef = portalsMasterList.find(p => p.name === k);
          assignedPortals.push(k);
          portalAccess.push({
            portalId: masterObjectRef?.id ?? 0,
            portalName: k,
            roleId: 1,
            roleName: portalConfig[k].roleName
          });
        }
      });

      const pickObjs = (list: any[], ids: string[]) =>
        list.filter(x => ids.includes(String(x.id))).map(x => ({ id: Number(x.id), name: x.name }));
      const selectedStates = pickObjs(dbStates, stateIds);
      const selectedDistricts = pickObjs(dbDistricts, districtIds);
      const selectedMarkets = pickObjs(dbMarkets, marketIds);
      const selectedStores = pickObjs(dbStores, storeIds);

      const selectedDeptObj = dbDepts.find(d => d.name === department);

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
    <div className="space-y-4 max-h-[82vh] overflow-y-auto px-1 scrollbar-thin">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Full name <span className="text-destructive">*</span></Label>
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Arslan Khan" autoComplete="off" />
        </div>
        <div className="space-y-1.5">
          <Label>Email <span className="text-destructive">*</span></Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@techno.com" autoComplete="new-password" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Phone <span className="text-muted-foreground text-xs">(Optional)</span></Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. +923001234567" />
        </div>
        <div className="space-y-1.5">
          <Label>Department <span className="text-destructive">*</span></Label>
          <Select value={department} onValueChange={setDepartment}>
            <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="placeholder" disabled>Select department</SelectItem>
              {dbDepts.map((d) => <SelectItem key={d.id} value={d.name}>{d.name || "—"}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!initial && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Password <span className="text-destructive">*</span></Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 6 chars" />
          </div>
          <div className="space-y-1.5">
            <Label>Confirm password <span className="text-destructive">*</span></Label>
            <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-enter password" />
          </div>
        </div>
      )}

      <div className="bg-zinc-50 dark:bg-zinc-900 p-3 rounded-lg border border-zinc-200/60 dark:border-zinc-800 grid grid-cols-2 gap-4">
        <div className="flex items-center justify-between space-x-2">
          <div className="flex flex-col space-y-0.5">
            <Label className="text-sm font-semibold">User Manager Access</Label>
            <span className="text-[11px] text-muted-foreground">Allows managing user directories administration</span>
          </div>
          <Switch checked={allowedUserManagement} onCheckedChange={setAllowedUserManagement} />
        </div>

        <div className="flex items-center justify-between space-x-2">
          <div className="flex flex-col space-y-0.5">
            <Label className="text-sm font-semibold">Account Status</Label>
            <span className="text-[11px] text-muted-foreground">Toggle active status state for portal operations logging</span>
          </div>
          <Switch checked={active} onCheckedChange={setActive} />
        </div>
      </div>

      <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
        <div className="bg-zinc-100 dark:bg-zinc-900 px-4 py-2.5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" /> Multi-Portal Authority Setup Matrix
          </span>
          <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold">Required: At least 1</span>
        </div>

        <div className="p-3 bg-white dark:bg-zinc-950 divide-y divide-zinc-100 dark:divide-zinc-900">
          {portalsMasterList.map((p) => {
            const isEnabled = portalConfig[p.name]?.enabled ?? false;
            const currentRoleValue = portalConfig[p.name]?.roleName ?? "user";

            return (
              <div key={p.id} className="flex flex-col sm:flex-row sm:items-center justify-between py-3 gap-3 first:pt-1 last:pb-1">
                <div className="flex items-center gap-3">
                  <Switch
                    id={`portal-toggle-${p.name}`}
                    checked={isEnabled}
                    onCheckedChange={(checked) => handlePortalToggle(p.name, checked)}
                  />
                  <div>
                    <label htmlFor={`portal-toggle-${p.name}`} className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 cursor-pointer block capitalize">
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
                    <SelectTrigger className={`h-8 text-xs font-medium ${isEnabled ? "border-primary/50 ring-1 ring-primary/10" : "bg-zinc-50 border-zinc-200"}`}>
                      <SelectValue placeholder="Choose role" />
                    </SelectTrigger>
                    <SelectContent>
                      {dynamicRoles.map((r) => (
                        <SelectItem key={r} value={r} className="text-xs">
                          {formatRoleName(r)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {needsState && (
        <div className="p-4 bg-zinc-50/50 dark:bg-zinc-900/40 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 space-y-3 animate-fade-in">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 pb-1 border-b border-zinc-200/60">
            <AlertCircle className="h-3.5 w-3.5" /> Regional Authority Hierarchy Configuration Setup
          </div>

          <div className="grid grid-cols-2 gap-3">
            {needsState && (
              <div className="space-y-1.5">
                <Label>States <span className="text-destructive">*</span></Label>
                <MultiSelect
                  options={dbStates.map(s => ({ value: String(s.id), label: s.name }))}
                  value={stateIds}
                  onChange={setStateIds}
                  placeholder="Select states"
                />
              </div>
            )}

            {needsDistrict && (
              <div className="space-y-1.5">
                <Label>Districts <span className="text-destructive">*</span></Label>
                <MultiSelect
                  options={dbDistricts.map(d => ({ value: String(d.id), label: d.name }))}
                  value={districtIds}
                  onChange={setDistrictIds}
                  placeholder="Select districts"
                />
              </div>
            )}

            {needsMarket && (
              <div className="space-y-1.5">
                <Label>Markets <span className="text-destructive">*</span></Label>
                <MultiSelect
                  options={dbMarkets.map(m => ({ value: String(m.id), label: m.name }))}
                  value={marketIds}
                  onChange={setMarketIds}
                  placeholder="Select markets"
                />
              </div>
            )}

            {needsStore && (
              <div className="space-y-1.5">
                <Label>Stores <span className="text-destructive">*</span></Label>
                <MultiSelect
                  options={dbStores.map(s => ({ value: String(s.id), label: s.name }))}
                  value={storeIds}
                  onChange={setStoreIds}
                  placeholder="Select stores"
                />
              </div>
            )}
          </div>
        </div>
      )}

      <Button className="w-full flex items-center justify-center gap-2 mt-2 h-10 font-medium" disabled={!canSave || submitting} onClick={submit}>
        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
        {initial ? "Save updated user configuration framework" : "Create new user instance matrix"}
      </Button>
    </div>
  );
}

export default UsersPage;