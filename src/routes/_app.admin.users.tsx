// import { createFileRoute } from "@tanstack/react-router";
// import { useState } from "react";
// import { useData } from "@/lib/data-store";
// import { AdminGuard, CrudPage } from "@/components/crud-page";
// import { ALL_DEPARTMENTS, ALL_ROLES, type Department, type Role, type User } from "@/lib/types";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Button } from "@/components/ui/button";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// import { usersApi } from "@/lib/api/client";
// import { toast } from "sonner";

// export const Route = createFileRoute("/_app/admin/users")({
//   head: () => ({ meta: [{ title: "Users — Admin" }] }),
//   component: () => <AdminGuard><UsersPage /></AdminGuard>,
// });

// function UsersPage() {
//   const { data, set } = useData();
//   const [deptFilter, setDeptFilter] = useState<Department | "all">("all");
//   const [roleFilter, setRoleFilter] = useState<Role | "all">("all");

//   const filtered = data.users.filter((u) => {
//     if (deptFilter !== "all" && u.department !== deptFilter) return false;
//     if (roleFilter !== "all" && u.role !== roleFilter) return false;
//     return true;
//   });

//   const handleDelete = async (u: User) => {
//     try {
//       const numericId = Number(u.id);
//       if (!Number.isNaN(numericId)) await usersApi.delete(numericId);
//     } catch (err) {
//       // Network/backend failure: still remove locally for demo continuity
//       console.warn("Delete user API failed, removing locally:", (err as Error).message);
//     }
//     set("users", data.users.filter((x) => x.id !== u.id));
//     toast.success("User deleted");
//   };

//   return (
//     <CrudPage<User>
//       title="Users"
//       subtitle="Manage internal employees and their access roles."
//       rows={filtered}
//       rowKey={(u) => u.id}
//       extraToolbar={
//         <>
//           <Select value={deptFilter} onValueChange={(v) => setDeptFilter(v as typeof deptFilter)}>
//             <SelectTrigger className="h-9 w-[180px]"><SelectValue placeholder="Department" /></SelectTrigger>
//             <SelectContent>
//               <SelectItem value="all">All departments</SelectItem>
//               {ALL_DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
//             </SelectContent>
//           </Select>
//           <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as typeof roleFilter)}>
//             <SelectTrigger className="h-9 w-[180px]"><SelectValue placeholder="Role" /></SelectTrigger>
//             <SelectContent>
//               <SelectItem value="all">All roles</SelectItem>
//               {ALL_ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
//             </SelectContent>
//           </Select>
//           <span className="text-xs text-muted-foreground">{filtered.length} of {data.users.length}</span>
//         </>
//       }
//       columns={[
//         { key: "name", header: "Name", accessor: (u) => (
//             <div className="flex items-center gap-2">
//               <div className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white" style={{ backgroundColor: u.avatarColor ?? "#0d7a5f" }}>
//                 {u.firstName[0]}{u.lastName[0]}
//               </div>
//               <div><div className="font-medium">{u.firstName} {u.lastName}</div><div className="text-xs text-muted-foreground">{u.email}</div></div>
//             </div>
//           ), searchValue: (u) => `${u.firstName} ${u.lastName} ${u.email}` },
//         { key: "dept", header: "Department", accessor: (u) => u.department, searchValue: (u) => u.department },
//         { key: "role", header: "Role", accessor: (u) => ALL_ROLES.find((r) => r.value === u.role)?.label ?? u.role, searchValue: (u) => u.role },
//       ]}
//       onDelete={handleDelete}
//       renderForm={(initial, close) => (
//         <UserForm initial={initial} onSaved={(next) => {
//           if (initial) set("users", data.users.map((x) => x.id === next.id ? next : x));
//           else set("users", [...data.users, next]);
//           close();
//         }} />
//       )}
//       createLabel="Add user"
//     />
//   );
// }

// function splitName(full: string): { firstName: string; lastName: string } {
//   const parts = full.trim().split(/\s+/);
//   return { firstName: parts[0] ?? "", lastName: parts.slice(1).join(" ") };
// }

// function UserForm({ initial, onSaved }: { initial: User | null; onSaved: (u: User) => void }) {
//   const { data } = useData();
//   const [fullName, setFullName] = useState(initial ? `${initial.firstName} ${initial.lastName}`.trim() : "");
//   const [email, setEmail] = useState(initial?.email ?? "");
//   const [password, setPassword] = useState("");
//   const [confirmPassword, setConfirmPassword] = useState("");
//   const [role, setRole] = useState<Role>(initial?.role ?? "user");
//   const [department, setDepartment] = useState<Department>(initial?.department ?? ALL_DEPARTMENTS[0]);
//   const [stateId, setStateId] = useState(initial?.stateId ?? "");
//   const [marketId, setMarketId] = useState(initial?.marketId ?? "");
//   const [districtId, setDistrictId] = useState(initial?.districtId ?? "");
//   const [storeId, setStoreId] = useState(initial?.storeId ?? "");
//   const [submitting, setSubmitting] = useState(false);

//   const needsState   = role === "state_manager" || role === "district_manager" || role === "market_manager" || role === "store_manager";
//   const needsMarket  = role === "district_manager" || role === "market_manager" || role === "store_manager";
//   const needsDistrict= role === "district_manager" || role === "store_manager";
//   const needsStore   = role === "store_manager";
//   const departmentRequired = role !== "admin";

//   const markets = data.markets.filter((m) => m.stateId === stateId);
//   const districts = data.districts.filter((d) => d.marketId === marketId);
//   const stores = data.stores.filter((s) => s.districtId === districtId);

//   const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
//   const passwordOk = initial
//     ? (!password && !confirmPassword) || (password.length >= 6 && password === confirmPassword)
//     : password.length >= 6 && password === confirmPassword;

//   // Validation requirements: fullName, email, role required.
//   // Password + confirm required when creating; department required if role != admin.
//   const baseValid = fullName.trim().length >= 2 && validEmail && role;
//   const canSave =
//     baseValid && passwordOk &&
//     (!departmentRequired || !!department) &&
//     (!needsState || stateId) && (!needsMarket || marketId) &&
//     (!needsDistrict || districtId) && (!needsStore || storeId);

//   const validationHint = (() => {
//     if (!fullName.trim()) return "Full name is required";
//     if (!validEmail) return "Valid email is required";
//     if (!initial && password.length < 6) return "Password must be at least 6 characters";
//     if (password !== confirmPassword) return "Passwords do not match";
//     if (departmentRequired && !department) return "Department is required for non-admin roles";
//     return null;
//   })();

//   const submit = async () => {
//     if (!canSave) {
//       if (validationHint) toast.error(validationHint);
//       return;
//     }
//     setSubmitting(true);
//     const { firstName, lastName } = splitName(fullName);
//     try {
//       if (initial) {
//         const numericId = Number(initial.id);
//         if (!Number.isNaN(numericId)) {
//           await usersApi.update({
//             id: numericId,
//             fullName: fullName.trim(),
//             email: email.trim(),
//             role,
//             department: departmentRequired ? department : null,
//           });
//         }
//         onSaved({
//           ...initial,
//           firstName, lastName,
//           email: email.trim(),
//           role,
//           department,
//           stateId: needsState ? stateId : undefined,
//           marketId: needsMarket ? marketId : undefined,
//           districtId: needsDistrict ? districtId : undefined,
//           storeId: needsStore ? storeId : undefined,
//         });
//         toast.success("User updated");
//       } else {
//         let newId: string = `u-${Date.now()}`;
//         try {
//           const res = await usersApi.add({
//             fullName: fullName.trim(),
//             email: email.trim(),
//             password,
//             role,
//             ...(departmentRequired ? { department } : {}),
//           });
//           newId = String(res.data.id);
//         } catch (err) {
//           console.warn("Add user API failed, saving locally:", (err as Error).message);
//         }
//         onSaved({
//           id: newId,
//           firstName, lastName,
//           email: email.trim(),
//           role, department,
//           stateId: needsState ? stateId : undefined,
//           marketId: needsMarket ? marketId : undefined,
//           districtId: needsDistrict ? districtId : undefined,
//           storeId: needsStore ? storeId : undefined,
//           avatarColor: "#0d7a5f",
//         });
//         toast.success("User added");
//       }
//     } catch (err) {
//       toast.error((err as Error).message);
//     } finally {
//       setSubmitting(false);
//     }
//   };

//   return (
//     <div className="space-y-3">
//       <div className="space-y-1.5">
//         <Label>Full name <span className="text-destructive">*</span></Label>
//         <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Arslan Khan" />
//       </div>
//       <div className="space-y-1.5">
//         <Label>Email <span className="text-destructive">*</span></Label>
//         <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@techno.com" />
//       </div>
//       <div className="grid grid-cols-2 gap-3">
//         <div className="space-y-1.5">
//           <Label>Password {!initial && <span className="text-destructive">*</span>}</Label>
//           <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={initial ? "Leave blank to keep" : "Min 6 chars"} />
//         </div>
//         <div className="space-y-1.5">
//           <Label>Confirm password {!initial && <span className="text-destructive">*</span>}</Label>
//           <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-enter password" />
//         </div>
//       </div>
//       <div className="grid grid-cols-2 gap-3">
//         <div className="space-y-1.5">
//           <Label>Role <span className="text-destructive">*</span></Label>
//           <Select value={role} onValueChange={(v) => setRole(v as Role)}>
//             <SelectTrigger><SelectValue /></SelectTrigger>
//             <SelectContent>{ALL_ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
//           </Select>
//         </div>
//         <div className="space-y-1.5">
//           <Label>
//             Department {departmentRequired && <span className="text-destructive">*</span>}
//             {!departmentRequired && <span className="ml-1 text-xs text-muted-foreground">(not required for Admin)</span>}
//           </Label>
//           <Select
//             value={department}
//             onValueChange={(v) => setDepartment(v as Department)}
//             disabled={!departmentRequired}
//           >
//             <SelectTrigger><SelectValue placeholder={departmentRequired ? "Select department" : "—"} /></SelectTrigger>
//             <SelectContent>{ALL_DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
//           </Select>
//         </div>
//       </div>

//       {needsState && (
//         <div className="space-y-1.5">
//           <Label>State</Label>
//           <Select value={stateId} onValueChange={(v) => { setStateId(v); setMarketId(""); setDistrictId(""); setStoreId(""); }}>
//             <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
//             <SelectContent>{data.states.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
//           </Select>
//         </div>
//       )}
//       {needsMarket && (
//         <div className="space-y-1.5">
//           <Label>Market</Label>
//           <Select value={marketId} onValueChange={(v) => { setMarketId(v); setDistrictId(""); setStoreId(""); }}>
//             <SelectTrigger><SelectValue placeholder="Select market" /></SelectTrigger>
//             <SelectContent>{markets.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
//           </Select>
//         </div>
//       )}
//       {needsDistrict && (
//         <div className="space-y-1.5">
//           <Label>District</Label>
//           <Select value={districtId} onValueChange={(v) => { setDistrictId(v); setStoreId(""); }}>
//             <SelectTrigger><SelectValue placeholder="Select district" /></SelectTrigger>
//             <SelectContent>{districts.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
//           </Select>
//         </div>
//       )}
//       {needsStore && (
//         <div className="space-y-1.5">
//           <Label>Store</Label>
//           <Select value={storeId} onValueChange={setStoreId}>
//             <SelectTrigger><SelectValue placeholder="Select store" /></SelectTrigger>
//             <SelectContent>{stores.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
//           </Select>
//         </div>
//       )}

//       {validationHint && (
//         <p className="text-xs text-muted-foreground">{validationHint}</p>
//       )}

//       <Button disabled={!canSave || submitting} onClick={submit}>
//         {submitting ? "Saving..." : initial ? "Update user" : "Add user"}
//       </Button>
//     </div>
//   );
// }




















































import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useData } from "@/lib/data-store";
import { AdminGuard, CrudPage } from "@/components/crud-page";
import { type Department, type Role, type User } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usersApi, type BackendUser } from "@/lib/api/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/admin/users")({
  head: () => ({ meta: [{ title: "Users — Admin" }] }),
  component: () => <AdminGuard><UsersPage /></AdminGuard>,
});

// 🛠️ Helper to format roles: "stateManager" or "state_manager" -> "State Manager"
function formatRoleName(roleStr: string): string {
  if (!roleStr) return "—";
  // Insert space before capital letters and replace underscores with spaces
  const spaced = roleStr.replace(/([A-Z])/g, " $1").replace(/_/g, " ").trim();
  // Capitalize the first letter of each word
  return spaced
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

// 🔄 Helper function to map Backend entity to Frontend view state
function mapBackendToFrontendUser(bu: BackendUser): User & { phone?: string; stateName?: string; marketName?: string; districtName?: string; storeName?: string } {
  const parts = (bu.fullName || "").trim().split(/\s+/);

  const roleNameFromBackend = bu.role?.name?.toLowerCase() as Role || "user";
  const departmentNameFromBackend = bu.department?.name as Department;

  return {
    id: String(bu.id),
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" ") || "",
    email: bu.email || "",
    roleName: roleNameFromBackend,
    department: departmentNameFromBackend,
    avatarColor: "#0d7a5f", 
    active: bu.active ?? true,

    // Raw IDs for Form
    stateId: bu.state?.id ? String(bu.state.id) : "",
    marketId: bu.market?.id ? String(bu.market.id) : "",
    districtId: bu.district?.id ? String(bu.district.id) : "",
    storeId: bu.store?.id ? String(bu.store.id) : "",

    // UI View Text for Extended Columns
    phone: bu.phone || "—",
    stateName: bu.state?.name || "—",
    marketName: bu.market?.name || "—",
    districtName: bu.district?.name || "—",
    storeName: bu.store?.name || "—",
  };
}

function UsersPage() {
  const { data, set } = useData();
  const [deptFilter, setDeptFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [loading, setLoading] = useState(false);

  const [dynamicRoles, setDynamicRoles] = useState<string[]>([]);
  const [dynamicDepts, setDynamicDepts] = useState<{ id: number; name: string }[]>([]);

  // Injecting header styling programmatically on component mount to give theme background color
  useEffect(() => {
    const styleTag = document.createElement("style");
    styleTag.innerHTML = `
      /* Theme background fallback injection for the table header row */
      .crud-page-table thead tr, 
      table thead tr { 
        background-color: rgba(13, 122, 95, 0.08) !important; 
      }
      table thead th {
        color: #0d7a5f !important;
        font-weight: 600 !important;
      }
    `;
    document.head.appendChild(styleTag);
    return () => {
      document.head.removeChild(styleTag);
    };
  }, []);

  // 📥 1. REAL API: Fetch users, roles, and departments (GET Requests)
  useEffect(() => {
    let isMounted = true;

    async function fetchAllData() {
      setLoading(true);
      try {
        const token = localStorage.getItem("token") || "";
        const headers = {
          "Content-Type": "application/json",
          "Authorization": token ? `Bearer ${token}` : "",
        };

        const [usersRes, rolesRes, deptsRes] = await Promise.all([
          usersApi.getAll(),
          fetch("http://localhost:4570/api/users/roles", { method: "GET", headers }).then(r => r.json().catch(() => ({ data: [] }))),
          fetch("http://localhost:4570/api/departments/get-all", { method: "GET", headers }).then(r => r.json().catch(() => ({ data: [] })))
        ]);

        if (isMounted) {
          if (usersRes.success && Array.isArray(usersRes.data)) {
            const mappedUsers = usersRes.data.map(mapBackendToFrontendUser);
            set("users", mappedUsers);
          }
          if (rolesRes && Array.isArray(rolesRes.data)) {
            setDynamicRoles(rolesRes.data);
          } else if (Array.isArray(rolesRes)) {
            setDynamicRoles(rolesRes);
          }
          if (deptsRes && Array.isArray(deptsRes.data)) {
            setDynamicDepts(deptsRes.data);
          } else if (Array.isArray(deptsRes)) {
            setDynamicDepts(deptsRes);
          }
        }
      } catch (err) {
        if (isMounted) {
          toast.error((err as Error).message || "Failed to fetch real users/filters data");
        }
        console.error("Fetch operational data error:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchAllData();

    return () => {
      isMounted = false;
    };
  }, []);

  const filtered = data.users.filter((u) => {
    if (deptFilter !== "all" && (u.department || "").toLowerCase() !== deptFilter.toLowerCase()) return false;
    if (roleFilter !== "all" && (u.roleName || "").toLowerCase() !== roleFilter.toLowerCase()) return false;
    return true;
  });

  const handleDelete = async (u: User) => {
    const numericId = Number(u.id);
    if (Number.isNaN(numericId)) {
      toast.error("Invalid local ID structure");
      return;
    }

    try {
      await usersApi.delete(numericId);
      set("users", data.users.filter((x) => x.id !== u.id));
      toast.success("User deleted successfully from database");
    } catch (err) {
      toast.error((err as Error).message || "Backend deletion failed");
      console.error("Delete user error:", err);
    }
  };

  return (
    <CrudPage<any>
      title="Users"
      subtitle="Manage internal employees and their access roles."
      rows={filtered}
      rowKey={(u) => u.id}
      extraToolbar={
        <>
          <Select value={deptFilter} onValueChange={setDeptFilter}>
            <SelectTrigger className="h-9 w-[180px]"><SelectValue placeholder="Department" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All departments</SelectItem>
              {dynamicDepts.map((d) => (
                <SelectItem key={d.id} value={d.name}>{d.name || "—"}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="h-9 w-[180px]"><SelectValue placeholder="Role" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              {/* 🛠️ Fixed: Capitalized dynamically using Pascal Word Case mapping */}
              {dynamicRoles.map((roleStr) => (
                <SelectItem key={roleStr} value={roleStr}>{formatRoleName(roleStr)}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <span className="text-xs text-muted-foreground">
            {loading ? "Loading..." : `${filtered.length} of ${data.users.length}`}
          </span>
        </>
      }
      columns={[
        {
          key: "name", header: "Name", accessor: (u) => (
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white" style={{ backgroundColor: u.avatarColor ?? "#0d7a5f" }}>
                {(u.firstName?.[0] || "")}{(u.lastName?.[0] || "")}
              </div>
              <div className="font-medium">{u.firstName} {u.lastName}</div>
            </div>
          ), searchValue: (u) => `${u.firstName} ${u.lastName}`
        },
        { key: "email", header: "Email", accessor: (u) => u.email || "—", searchValue: (u) => u.email },
        { key: "phone", header: "Phone", accessor: (u) => u.phone || "—" },
        { key: "dept", header: "Department", accessor: (u) => u.department || "—", searchValue: (u) => u.department },
        // 🛠️ Fixed: Capitalized table row column mapping using the formatRoleName utility
        { key: "role", header: "Role", accessor: (u) => formatRoleName(String(u.roleName || "")), searchValue: (u) => u.roleName },
        { key: "state", header: "State", accessor: (u) => u.stateName || "—" },
        { key: "market", header: "Market", accessor: (u) => u.marketName || "—" },
        { key: "district", header: "District", accessor: (u) => u.districtName || "—" },
        { key: "store", header: "Store", accessor: (u) => u.storeName || "—" },
      ]}
      onDelete={handleDelete}
      renderForm={(initial, close) => (
        <UserForm initial={initial} dynamicRoles={dynamicRoles} dynamicDepts={dynamicDepts} onSaved={(next) => {
          if (initial) set("users", data.users.map((x) => x.id === next.id ? next : x));
          else set("users", [...data.users, next]);
          close();
        }} />
      )}
      createLabel="Add user"
    />
  );
}

function UserForm({ initial, dynamicRoles, dynamicDepts, onSaved }: { initial: User | null; dynamicRoles: string[]; dynamicDepts: any[]; onSaved: (u: User) => void }) {
  const { data } = useData();
  const [fullName, setFullName] = useState(initial ? `${initial.firstName} ${initial.lastName}`.trim() : "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<Role>(initial?.roleName ?? ("user" as Role));
  const [department, setDepartment] = useState<Department>(initial?.department ?? ("Administration" as Department));
  
  const [stateId, setStateId] = useState(initial?.stateId ?? "");
  const [marketId, setMarketId] = useState(initial?.marketId ?? "");
  const [districtId, setDistrictId] = useState(initial?.districtId ?? "");
  const [storeId, setStoreId] = useState(initial?.storeId ?? "");
  const [submitting, setSubmitting] = useState(false);

  const lowercaseRole = String(role).toLowerCase();
  const needsState = lowercaseRole === "state_manager" || lowercaseRole === "statemanager" || lowercaseRole === "district_manager" || lowercaseRole === "districtmanager" || lowercaseRole === "market_manager" || lowercaseRole === "marketmanager" || lowercaseRole === "store_manager" || lowercaseRole === "storemanager";
  const needsMarket = lowercaseRole === "district_manager" || lowercaseRole === "districtmanager" || lowercaseRole === "market_manager" || lowercaseRole === "marketmanager" || lowercaseRole === "store_manager" || lowercaseRole === "storemanager";
  const needsDistrict = lowercaseRole === "district_manager" || lowercaseRole === "districtmanager" || lowercaseRole === "store_manager" || lowercaseRole === "storemanager";
  const needsStore = lowercaseRole === "store_manager" || lowercaseRole === "storemanager";
  const departmentRequired = lowercaseRole !== "admin";

  const markets = data.markets.filter((m) => m.stateId === stateId);
  const districts = data.districts.filter((d) => d.marketId === marketId);
  const stores = data.stores.filter((s) => s.districtId === districtId);

  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const passwordOk = initial
    ? (!password && !confirmPassword) || (password.length >= 6 && password === confirmPassword)
    : password.length >= 6 && password === confirmPassword;

  const baseValid = fullName.trim().length >= 2 && validEmail && role;
  const canSave =
    baseValid && passwordOk &&
    (!departmentRequired || !!department) &&
    (!needsState || stateId) && (!needsMarket || marketId) &&
    (!needsDistrict || districtId) && (!needsStore || storeId);

  const validationHint = (() => {
    if (!fullName.trim()) return "Full name is required";
    if (!validEmail) return "Valid email is required";
    if (!initial && password.length < 6) return "Password must be at least 6 characters";
    if (password !== confirmPassword) return "Passwords do not match";
    if (departmentRequired && !department) return "Department is required for non-admin roles";
    return null;
  })();

  const submit = async () => {
    if (!canSave) {
      if (validationHint) toast.error(validationHint);
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        fullName: fullName.trim(),
        email: email.trim(),
        role: { id: 0, name: role },
        department: departmentRequired && department ? { id: 0, name: department } : null,
        state: needsState && stateId ? { id: String(stateId), name: "" } : null,
        market: needsMarket && marketId ? { id: String(marketId), name: "" } : null,
        district: needsDistrict && districtId ? { id: String(districtId), name: "" } : null,
        store: needsStore && storeId ? { id: String(storeId), name: "" } : null,
      };

      if (initial) {
        const numericId = Number(initial.id);
        const response = await usersApi.update({ id: numericId, ...payload });
        if (response.success) {
          onSaved(mapBackendToFrontendUser(response.data));
          toast.success("User updated on backend");
        }
      } else {
        const response = await usersApi.add({ ...payload, password } as any);
        if (response.success) {
          onSaved(mapBackendToFrontendUser(response.data));
          toast.success("User successfully added to database");
        }
      }
    } catch (err) {
      toast.error((err as Error).message || "An API operation error occurred");
      console.error("Form Submit Error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>Full name <span className="text-destructive">*</span></Label>
        <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Arslan Khan" autoComplete="off" />
      </div>
      <div className="space-y-1.5">
        <Label>Email <span className="text-destructive">*</span></Label>
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@techno.com" autoComplete="new-password" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Password {!initial && <span className="text-destructive">*</span>}</Label>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={initial ? "Leave blank to keep" : "Min 6 chars"} autoComplete="new-password" />
        </div>
        <div className="space-y-1.5">
          <Label>Confirm password {!initial && <span className="text-destructive">*</span>}</Label>
          <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-enter password" autoComplete="new-password" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Role <span className="text-destructive">*</span></Label>
          <Select value={role} onValueChange={(v) => setRole(v as Role)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {/* 🛠️ Fixed: Modal user form also uses elegant Pascal Case parsing */}
              {dynamicRoles.map((roleStr) => (
                <SelectItem key={roleStr} value={roleStr}>{formatRoleName(roleStr)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>
            Department {departmentRequired && <span className="text-destructive">*</span>}
            {!departmentRequired && <span className="ml-1 text-xs text-muted-foreground">(saved as "all" for Admin)</span>}
          </Label>
          <Select
            value={departmentRequired ? department : "all"}
            onValueChange={(v) => setDepartment(v as Department)}
            disabled={!departmentRequired}
          >
            <SelectTrigger><SelectValue placeholder={departmentRequired ? "Select department" : "—"} /></SelectTrigger>
            <SelectContent>
              {dynamicDepts.map((d) => <SelectItem key={d.id} value={d.name}>{d.name || "—"}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {needsState && (
        <div className="space-y-1.5">
          <Label>State</Label>
          <Select value={stateId} onValueChange={(v) => { setStateId(v); setMarketId(""); setDistrictId(""); setStoreId(""); }}>
            <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
            <SelectContent>{data.states.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      )}
      {needsMarket && (
        <div className="space-y-1.5">
          <Label>Market</Label>
          <Select value={marketId} onValueChange={(v) => { setMarketId(v); setDistrictId(""); setStoreId(""); }}>
            <SelectTrigger><SelectValue placeholder="Select market" /></SelectTrigger>
            <SelectContent>{markets.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      )}
      {needsDistrict && (
        <div className="space-y-1.5">
          <Label>District</Label>
          <Select value={districtId} onValueChange={(v) => { setDistrictId(v); setStoreId(""); }}>
            <SelectTrigger><SelectValue placeholder="Select district" /></SelectTrigger>
            <SelectContent>{districts.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      )}
      {needsStore && (
        <div className="space-y-1.5">
          <Label>Store</Label>
          <Select value={storeId} onValueChange={setStoreId}>
            <SelectTrigger><SelectValue placeholder="Select store" /></SelectTrigger>
            <SelectContent>{stores.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      )}

      {validationHint && <p className="text-xs text-muted-foreground">{validationHint}</p>}

      <Button disabled={!canSave || submitting} onClick={submit}>
        {submitting ? "Saving..." : initial ? "Update user" : "Add user"}
      </Button>
    </div>
  );
}