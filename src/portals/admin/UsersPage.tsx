// // import { useState } from "react";
// import { useData } from "@/lib/data-store";
// import { AdminGuard, CrudPage } from "@/components/crud-page";
// import { ALL_DEPARTMENTS, ALL_ROLES, type Department, type Role, type User } from "@/lib/types";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Button } from "@/components/ui/button";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// import { usersApi } from "@/lib/api/client";
// import { toast } from "sonner";

// ({
//   head: () => ({ meta: [{ title: "Users — Admin" }] }),
//   component: () => <AdminGuard><UsersPage /></AdminGuard>,
// });

// export default function UsersPage() {
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






































































































// // import { useState, useEffect } from "react";
// import { useData } from "@/lib/data-store";
// import { AdminGuard, CrudPage } from "@/components/crud-page";
// import { type Department, type Role, type User } from "@/lib/types";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Button } from "@/components/ui/button";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// import { usersApi, type BackendUser } from "@/lib/api/client";
// import { toast } from "sonner";

// 
// // 🛠️ Helper to format roles: "stateManager" or "state_manager" -> "State Manager"
// function formatRoleName(roleStr: string): string {
//   if (!roleStr) return "—";
//   // Insert space before capital letters and replace underscores with spaces
//   const spaced = roleStr.replace(/([A-Z])/g, " $1").replace(/_/g, " ").trim();
//   // Capitalize the first letter of each word
//   return spaced
//     .split(/\s+/)
//     .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
//     .join(" ");
// }

// // 🔄 Helper function to map Backend entity to Frontend view state
// function mapBackendToFrontendUser(bu: BackendUser): User & { phone?: string; stateName?: string; marketName?: string; districtName?: string; storeName?: string } {
//   const parts = (bu.fullName || "").trim().split(/\s+/);

//   const roleNameFromBackend = bu.role?.name?.toLowerCase() as Role || "user";
//   const departmentNameFromBackend = bu.department?.name as Department;

//   return {
//     id: String(bu.id),
//     firstName: parts[0] ?? "",
//     lastName: parts.slice(1).join(" ") || "",
//     email: bu.email || "",
//     roleName: roleNameFromBackend,
//     department: departmentNameFromBackend,
//     avatarColor: "#0d7a5f", 
//     active: bu.active ?? true,

//     // Raw IDs for Form
//     stateId: bu.state?.id ? String(bu.state.id) : "",
//     marketId: bu.market?.id ? String(bu.market.id) : "",
//     districtId: bu.district?.id ? String(bu.district.id) : "",
//     storeId: bu.store?.id ? String(bu.store.id) : "",

//     // UI View Text for Extended Columns
//     phone: bu.phone || "—",
//     stateName: bu.state?.name || "—",
//     marketName: bu.market?.name || "—",
//     districtName: bu.district?.name || "—",
//     storeName: bu.store?.name || "—",
//   };
// }

// function UsersPage() {
//   const { data, set } = useData();
//   const [deptFilter, setDeptFilter] = useState<string>("all");
//   const [roleFilter, setRoleFilter] = useState<string>("all");
//   const [loading, setLoading] = useState(false);

//   const [dynamicRoles, setDynamicRoles] = useState<string[]>([]);
//   const [dynamicDepts, setDynamicDepts] = useState<{ id: number; name: string }[]>([]);

//   // Injecting header styling programmatically on component mount to give theme background color
//   useEffect(() => {
//     const styleTag = document.createElement("style");
//     styleTag.innerHTML = `
//       /* Theme background fallback injection for the table header row */
//       .crud-page-table thead tr, 
//       table thead tr { 
//         background-color: rgba(13, 122, 95, 0.08) !important; 
//       }
//       table thead th {
//         color: #0d7a5f !important;
//         font-weight: 600 !important;
//       }
//     `;
//     document.head.appendChild(styleTag);
//     return () => {
//       document.head.removeChild(styleTag);
//     };
//   }, []);

//   // 📥 1. REAL API: Fetch users, roles, and departments (GET Requests)
//   useEffect(() => {
//     let isMounted = true;

//     async function fetchAllData() {
//       setLoading(true);
//       try {
//         const token = localStorage.getItem("token") || "";
//         const headers = {
//           "Content-Type": "application/json",
//           "Authorization": token ? `Bearer ${token}` : "",
//         };

//         const [usersRes, rolesRes, deptsRes] = await Promise.all([
//           usersApi.getAll(),
//           fetch("http://localhost:4570/api/users/roles", { method: "GET", headers }).then(r => r.json().catch(() => ({ data: [] }))),
//           fetch("http://localhost:4570/api/departments/get-all", { method: "GET", headers }).then(r => r.json().catch(() => ({ data: [] })))
//         ]);

//         if (isMounted) {
//           if (usersRes.success && Array.isArray(usersRes.data)) {
//             const mappedUsers = usersRes.data.map(mapBackendToFrontendUser);
//             set("users", mappedUsers);
//           }
//           if (rolesRes && Array.isArray(rolesRes.data)) {
//             setDynamicRoles(rolesRes.data);
//           } else if (Array.isArray(rolesRes)) {
//             setDynamicRoles(rolesRes);
//           }
//           if (deptsRes && Array.isArray(deptsRes.data)) {
//             setDynamicDepts(deptsRes.data);
//           } else if (Array.isArray(deptsRes)) {
//             setDynamicDepts(deptsRes);
//           }
//         }
//       } catch (err) {
//         if (isMounted) {
//           toast.error((err as Error).message || "Failed to fetch real users/filters data");
//         }
//         console.error("Fetch operational data error:", err);
//       } finally {
//         if (isMounted) setLoading(false);
//       }
//     }

//     fetchAllData();

//     return () => {
//       isMounted = false;
//     };
//   }, []);

//   const filtered = data.users.filter((u) => {
//     if (deptFilter !== "all" && (u.department || "").toLowerCase() !== deptFilter.toLowerCase()) return false;
//     if (roleFilter !== "all" && (u.roleName || "").toLowerCase() !== roleFilter.toLowerCase()) return false;
//     return true;
//   });

//   const handleDelete = async (u: User) => {
//     const numericId = Number(u.id);
//     if (Number.isNaN(numericId)) {
//       toast.error("Invalid local ID structure");
//       return;
//     }

//     try {
//       await usersApi.delete(numericId);
//       set("users", data.users.filter((x) => x.id !== u.id));
//       toast.success("User deleted successfully from database");
//     } catch (err) {
//       toast.error((err as Error).message || "Backend deletion failed");
//       console.error("Delete user error:", err);
//     }
//   };

//   return (
//     <CrudPage<any>
//       title="Users"
//       subtitle="Manage internal employees and their access roles."
//       rows={filtered}
//       rowKey={(u) => u.id}
//       extraToolbar={
//         <>
//           <Select value={deptFilter} onValueChange={setDeptFilter}>
//             <SelectTrigger className="h-9 w-[180px]"><SelectValue placeholder="Department" /></SelectTrigger>
//             <SelectContent>
//               <SelectItem value="all">All departments</SelectItem>
//               {dynamicDepts.map((d) => (
//                 <SelectItem key={d.id} value={d.name}>{d.name || "—"}</SelectItem>
//               ))}
//             </SelectContent>
//           </Select>

//           <Select value={roleFilter} onValueChange={setRoleFilter}>
//             <SelectTrigger className="h-9 w-[180px]"><SelectValue placeholder="Role" /></SelectTrigger>
//             <SelectContent>
//               <SelectItem value="all">All roles</SelectItem>
//               {/* 🛠️ Fixed: Capitalized dynamically using Pascal Word Case mapping */}
//               {dynamicRoles.map((roleStr) => (
//                 <SelectItem key={roleStr} value={roleStr}>{formatRoleName(roleStr)}</SelectItem>
//               ))}
//             </SelectContent>
//           </Select>

//           <span className="text-xs text-muted-foreground">
//             {loading ? "Loading..." : `${filtered.length} of ${data.users.length}`}
//           </span>
//         </>
//       }
//       columns={[
//         {
//           key: "name", header: "Name", accessor: (u) => (
//             <div className="flex items-center gap-2">
//               <div className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white" style={{ backgroundColor: u.avatarColor ?? "#0d7a5f" }}>
//                 {(u.firstName?.[0] || "")}{(u.lastName?.[0] || "")}
//               </div>
//               <div className="font-medium">{u.firstName} {u.lastName}</div>
//             </div>
//           ), searchValue: (u) => `${u.firstName} ${u.lastName}`
//         },
//         { key: "email", header: "Email", accessor: (u) => u.email || "—", searchValue: (u) => u.email },
//         { key: "phone", header: "Phone", accessor: (u) => u.phone || "—" },
//         { key: "dept", header: "Department", accessor: (u) => u.department || "—", searchValue: (u) => u.department },
//         // 🛠️ Fixed: Capitalized table row column mapping using the formatRoleName utility
//         { key: "role", header: "Role", accessor: (u) => formatRoleName(String(u.roleName || "")), searchValue: (u) => u.roleName },
//         { key: "state", header: "State", accessor: (u) => u.stateName || "—" },
//         { key: "market", header: "Market", accessor: (u) => u.marketName || "—" },
//         { key: "district", header: "District", accessor: (u) => u.districtName || "—" },
//         { key: "store", header: "Store", accessor: (u) => u.storeName || "—" },
//       ]}
//       onDelete={handleDelete}
//       renderForm={(initial, close) => (
//         <UserForm initial={initial} dynamicRoles={dynamicRoles} dynamicDepts={dynamicDepts} onSaved={(next) => {
//           if (initial) set("users", data.users.map((x) => x.id === next.id ? next : x));
//           else set("users", [...data.users, next]);
//           close();
//         }} />
//       )}
//       createLabel="Add user"
//     />
//   );
// }

// function UserForm({ initial, dynamicRoles, dynamicDepts, onSaved }: { initial: User | null; dynamicRoles: string[]; dynamicDepts: any[]; onSaved: (u: User) => void }) {
//   const { data } = useData();
//   const [fullName, setFullName] = useState(initial ? `${initial.firstName} ${initial.lastName}`.trim() : "");
//   const [email, setEmail] = useState(initial?.email ?? "");
//   const [password, setPassword] = useState("");
//   const [confirmPassword, setConfirmPassword] = useState("");
//   const [role, setRole] = useState<Role>(initial?.roleName ?? ("user" as Role));
//   const [department, setDepartment] = useState<Department>(initial?.department ?? ("Administration" as Department));

//   const [stateId, setStateId] = useState(initial?.stateId ?? "");
//   const [marketId, setMarketId] = useState(initial?.marketId ?? "");
//   const [districtId, setDistrictId] = useState(initial?.districtId ?? "");
//   const [storeId, setStoreId] = useState(initial?.storeId ?? "");
//   const [submitting, setSubmitting] = useState(false);

//   const lowercaseRole = String(role).toLowerCase();
//   const needsState = lowercaseRole === "state_manager" || lowercaseRole === "statemanager" || lowercaseRole === "district_manager" || lowercaseRole === "districtmanager" || lowercaseRole === "market_manager" || lowercaseRole === "marketmanager" || lowercaseRole === "store_manager" || lowercaseRole === "storemanager";
//   const needsMarket = lowercaseRole === "district_manager" || lowercaseRole === "districtmanager" || lowercaseRole === "market_manager" || lowercaseRole === "marketmanager" || lowercaseRole === "store_manager" || lowercaseRole === "storemanager";
//   const needsDistrict = lowercaseRole === "district_manager" || lowercaseRole === "districtmanager" || lowercaseRole === "store_manager" || lowercaseRole === "storemanager";
//   const needsStore = lowercaseRole === "store_manager" || lowercaseRole === "storemanager";
//   const departmentRequired = lowercaseRole !== "admin";

//   const markets = data.markets.filter((m) => m.stateId === stateId);
//   const districts = data.districts.filter((d) => d.marketId === marketId);
//   const stores = data.stores.filter((s) => s.districtId === districtId);

//   const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
//   const passwordOk = initial
//     ? (!password && !confirmPassword) || (password.length >= 6 && password === confirmPassword)
//     : password.length >= 6 && password === confirmPassword;

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
//     try {
//       const payload = {
//         fullName: fullName.trim(),
//         email: email.trim(),
//         role: { id: 0, name: role },
//         department: departmentRequired && department ? { id: 0, name: department } : null,
//         state: needsState && stateId ? { id: String(stateId), name: "" } : null,
//         market: needsMarket && marketId ? { id: String(marketId), name: "" } : null,
//         district: needsDistrict && districtId ? { id: String(districtId), name: "" } : null,
//         store: needsStore && storeId ? { id: String(storeId), name: "" } : null,
//       };

//       if (initial) {
//         const numericId = Number(initial.id);
//         const response = await usersApi.update({ id: numericId, ...payload });
//         if (response.success) {
//           onSaved(mapBackendToFrontendUser(response.data));
//           toast.success("User updated on backend");
//         }
//       } else {
//         const response = await usersApi.add({ ...payload, password } as any);
//         if (response.success) {
//           onSaved(mapBackendToFrontendUser(response.data));
//           toast.success("User successfully added to database");
//         }
//       }
//     } catch (err) {
//       toast.error((err as Error).message || "An API operation error occurred");
//       console.error("Form Submit Error:", err);
//     } finally {
//       setSubmitting(false);
//     }
//   };

//   return (
//     <div className="space-y-3">
//       <div className="space-y-1.5">
//         <Label>Full name <span className="text-destructive">*</span></Label>
//         <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Arslan Khan" autoComplete="off" />
//       </div>
//       <div className="space-y-1.5">
//         <Label>Email <span className="text-destructive">*</span></Label>
//         <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@techno.com" autoComplete="new-password" />
//       </div>
//       <div className="grid grid-cols-2 gap-3">
//         <div className="space-y-1.5">
//           <Label>Password {!initial && <span className="text-destructive">*</span>}</Label>
//           <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={initial ? "Leave blank to keep" : "Min 6 chars"} autoComplete="new-password" />
//         </div>
//         <div className="space-y-1.5">
//           <Label>Confirm password {!initial && <span className="text-destructive">*</span>}</Label>
//           <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-enter password" autoComplete="new-password" />
//         </div>
//       </div>
//       <div className="grid grid-cols-2 gap-3">
//         <div className="space-y-1.5">
//           <Label>Role <span className="text-destructive">*</span></Label>
//           <Select value={role} onValueChange={(v) => setRole(v as Role)}>
//             <SelectTrigger><SelectValue /></SelectTrigger>
//             <SelectContent>
//               {/* 🛠️ Fixed: Modal user form also uses elegant Pascal Case parsing */}
//               {dynamicRoles.map((roleStr) => (
//                 <SelectItem key={roleStr} value={roleStr}>{formatRoleName(roleStr)}</SelectItem>
//               ))}
//             </SelectContent>
//           </Select>
//         </div>
//         <div className="space-y-1.5">
//           <Label>
//             Department {departmentRequired && <span className="text-destructive">*</span>}
//             {!departmentRequired && <span className="ml-1 text-xs text-muted-foreground">(saved as "all" for Admin)</span>}
//           </Label>
//           <Select
//             value={departmentRequired ? department : "all"}
//             onValueChange={(v) => setDepartment(v as Department)}
//             disabled={!departmentRequired}
//           >
//             <SelectTrigger><SelectValue placeholder={departmentRequired ? "Select department" : "—"} /></SelectTrigger>
//             <SelectContent>
//               {dynamicDepts.map((d) => <SelectItem key={d.id} value={d.name}>{d.name || "—"}</SelectItem>)}
//             </SelectContent>
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

//       {validationHint && <p className="text-xs text-muted-foreground">{validationHint}</p>}

//       <Button disabled={!canSave || submitting} onClick={submit}>
//         {submitting ? "Saving..." : initial ? "Update user" : "Add user"}
//       </Button>
//     </div>
//   );
// }


































// // import { useState, useEffect, useRef, useMemo } from "react";
// import { AdminGuard, CrudPage } from "@/components/crud-page";
// import { useData } from "@/lib/data-store";
// import { type Department, type Role, type User } from "@/lib/types";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Button } from "@/components/ui/button";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// import { usersApi, hierarchyApi, type BackendUser } from "@/lib/api/client";
// import { toast } from "sonner";
// import { Loader2, Search, XCircle } from "lucide-react";

// 
// function formatRoleName(roleStr: string): string {
//   if (!roleStr) return "—";
//   const spaced = roleStr.replace(/([A-Z])/g, " $1").replace(/_/g, " ").trim();
//   return spaced
//     .split(/\s+/)
//     .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
//     .join(" ");
// }

// function mapBackendToFrontendUser(bu: any): User & { phone?: string; stateName?: string; marketName?: string; districtName?: string; storeName?: string } {
//   const parts = (bu.fullName || "").trim().split(/\s+/);

//   const roleNameFromBackend = (bu.roleName || "user").toLowerCase() as Role;
//   const departmentNameFromBackend = bu.departmentName as Department;

//   return {
//     id: String(bu.id),
//     firstName: parts[0] ?? "",
//     lastName: parts.slice(1).join(" ") || "",
//     email: bu.email || "",
//     roleName: roleNameFromBackend,
//     department: departmentNameFromBackend,
//     avatarColor: "#0d7a5f",
//     active: bu.active ?? true,

//     // Raw IDs for Forms (Fallback to string conversion)
//     stateId: bu.stateId ? String(bu.stateId) : "",
//     marketId: bu.marketId ? String(bu.marketId) : "",
//     districtId: bu.districtId ? String(bu.districtId) : "",
//     storeId: bu.storeId ? String(bu.storeId) : "",

//     phone: bu.phone || "—",
//     stateName: bu.stateName || "—",
//     marketName: bu.marketName || "—",
//     districtName: bu.districtName || "—",
//     storeName: bu.storeName || "—",
//   };
// }

// function UsersPage() {
//   const [users, setUsers] = useState<any[]>([]);
//   const [deptFilter, setDeptFilter] = useState<string>("all");
//   const [roleFilter, setRoleFilter] = useState<string>("all");

//   const [dynamicRoles, setDynamicRoles] = useState<string[]>([]);
//   const [dynamicDepts, setDynamicDepts] = useState<{ id: number; name: string }[]>([]);

//   // Search input filters queries buffers
//   const [mainDeptSearch, setMainDeptSearch] = useState("");
//   const [mainRoleSearch, setMainRoleSearch] = useState("");

//   const mainDeptSearchRef = useRef<HTMLInputElement>(null);
//   const mainRoleSearchRef = useRef<HTMLInputElement>(null);

//   const [loading, setLoading] = useState(true);
//   const [actionLoading, setActionLoading] = useState(false);

//   // Pagination states
//   const [page, setPage] = useState<number>(0);
//   const [size, setSize] = useState<number>(10);
//   const [totalRecords, setTotalRecords] = useState<number>(0);

//   const lastFetchedKey = useRef<string>("");
//   const isFetchingRef = useRef<boolean>(false);
//   const initialLookupsFetchedRef = useRef<boolean>(false);

//   useEffect(() => {
//     const styleTag = document.createElement("style");
//     styleTag.innerHTML = `
//       .crud-page-table thead tr, table thead tr { 
//         background-color: rgba(13, 122, 95, 0.08) !important; 
//       }
//       table thead th {
//         color: #0d7a5f !important;
//         font-weight: 600 !important;
//       }
//     `;
//     document.head.appendChild(styleTag);
//     return () => {
//       document.head.removeChild(styleTag);
//     };
//   }, []);

//   const fetchUsers = async (targetPage: number, targetSize: number, targetDept: string, targetRole: string) => {
//     const currentRequestKey = `${targetPage}-${targetSize}-${targetDept}-${targetRole}`;

//     if (lastFetchedKey.current === currentRequestKey || isFetchingRef.current) {
//       return;
//     }

//     try {
//       setLoading(true);
//       isFetchingRef.current = true;
//       lastFetchedKey.current = currentRequestKey;

//       // Single invocation fetch for dynamic roles and departments mapping lookups
//       if (!initialLookupsFetchedRef.current) {
//         const [rolesRes, deptsRes] = await Promise.all([
//           hierarchyApi.getRoles(),
//           hierarchyApi.getDepartments()
//         ]);

//         if (rolesRes.success && Array.isArray(rolesRes.data)) setDynamicRoles(rolesRes.data);
//         if (deptsRes.success && Array.isArray(deptsRes.data)) setDynamicDepts(deptsRes.data);

//         if (rolesRes.success && deptsRes.success) {
//           initialLookupsFetchedRef.current = true;
//         }
//       }

//       // Hit users endpoint matching advanced structural layout filters
//       const apiClient = usersApi.getAll as any;
//       const res = await apiClient({
//         page: targetPage,
//         size: targetSize,
//         department: targetDept !== "all" ? targetDept : undefined,
//         role: targetRole !== "all" ? targetRole : undefined
//       });

//       if (res.success) {
//         if (res.data.length === 0 && res.pagination && res.pagination.totalRecords > 0 && targetPage > 0) {
//           const maxAvailablePage = Math.ceil(res.pagination.totalRecords / targetSize) - 1;
//           const fallbackPage = Math.max(0, maxAvailablePage);

//           isFetchingRef.current = false;
//           lastFetchedKey.current = "";
//           setPage(fallbackPage);
//           return;
//         }

//         const mapped = res.data.map(mapBackendToFrontendUser);
//         setUsers(mapped);
//         setTotalRecords(res.pagination?.totalRecords ?? mapped.length);
//       } else {
//         toast.error(res.message || "Failed to load users data layout matrix");
//         lastFetchedKey.current = "";
//       }
//     } catch (err: any) {
//       toast.error(err?.message || "Something went wrong while retrieving records");
//       lastFetchedKey.current = "";
//     } finally {
//       setLoading(false);
//       isFetchingRef.current = false;
//     }
//   };

//   useEffect(() => {
//     fetchUsers(page, size, deptFilter, roleFilter);
//   }, [page, size, deptFilter, roleFilter]);

//   const handleDeptFilterChange = (val: string) => {
//     lastFetchedKey.current = "";
//     setPage(0);
//     setDeptFilter(val);
//   };

//   const handleRoleFilterChange = (val: string) => {
//     lastFetchedKey.current = "";
//     setPage(0);
//     setRoleFilter(val);
//   };

//   const handleResetFilters = () => {
//     if (deptFilter === "all" && roleFilter === "all") return;
//     lastFetchedKey.current = "";
//     setPage(0);
//     setDeptFilter("all");
//     setRoleFilter("all");
//     toast.success("Filters cleared successfully");
//   };

//   const handleDelete = async (u: any) => {
//     const numericId = Number(u.id);
//     if (Number.isNaN(numericId)) {
//       toast.error("Invalid internal configuration parsing ID structure");
//       return;
//     }

//     try {
//       setActionLoading(true);
//       const res = await usersApi.delete(numericId);
//       if (res.success) {
//         toast.success(res.message || "User record safely removed");
//         lastFetchedKey.current = "";
//         fetchUsers(page, size, deptFilter, roleFilter);
//       } else {
//         toast.error(res.message || "Deletion sequence failed");
//       }
//     } catch (err: any) {
//       toast.error(err?.message || "Backend constraint deletion crash");
//     } finally {
//       setActionLoading(false);
//     }
//   };

//   const filteredMainDeptsOptions = useMemo(() => {
//     return dynamicDepts.filter((d) => (d.name || "").toLowerCase().includes(mainDeptSearch.toLowerCase()));
//   }, [dynamicDepts, mainDeptSearch]);

//   const filteredMainRolesOptions = useMemo(() => {
//     return dynamicRoles.filter((r) => r.toLowerCase().includes(mainRoleSearch.toLowerCase()));
//   }, [dynamicRoles, mainRoleSearch]);

//   if (loading && users.length === 0) {
//     return (
//       <div className="flex h-[50vh] w-full flex-col items-center justify-center gap-2 text-muted-foreground">
//         <Loader2 className="h-8 w-8 animate-spin text-primary" />
//         <p className="text-sm font-medium">Loading Identity & Access Portal...</p>
//       </div>
//     );
//   }

//   return (
//     <div className="w-full">
//       <div className="w-full border-0 shadow-none bg-transparent [&_input]:bg-white dark:[&_input]:bg-zinc-950 [&_button.w-\[180px\]]:bg-white dark:[&_button.w-\[180px\]]:bg-zinc-950 [&_tbody_tr]:bg-background [&_tbody_tr]:even:bg-zinc-50/50 dark:[&_tbody_tr]:even:bg-zinc-900/30 [&_tbody_tr]:hover:bg-muted/40 [&_th:last-child]:text-right [&_th:last-child]:pr-10 [&_td:last-child]:text-right [&_td[colspan]]:text-center [&_td[colspan]]:font-medium">
//         <div className="[&_.flex-col]:flex-row [&_.flex-col]:items-center [&_.flex-col]:justify-between [&_.max-w-sm]:order-last [&_.max-w-sm]:ml-auto">
//           <CrudPage<any>
//             title="Users"
//             subtitle="Manage internal employees and their access roles."
//             rows={users}
//             rowKey={(u) => u.id}
//             isSaving={actionLoading}
//             isLoading={loading}
//             rowCount={totalRecords}
//             page={page}
//             pageSize={size}
//             onPageChange={(newPage) => setPage(newPage)}
//             onPageSizeChange={(newSize) => setSize(newSize)}
//             createLabel="Add user"
//             extraToolbar={
//               <div className="flex items-end gap-3 pb-0.5">
//                 {/* Department Filters Option Setup */}
//                 <div className="relative flex flex-col pt-2.5">
//                   <span className="absolute -top-1 left-2 bg-background px-1 text-[11px] font-semibold text-muted-foreground z-10">
//                     Department
//                   </span>
//                   <Select value={deptFilter} onValueChange={handleDeptFilterChange} onOpenChange={(open) => { if (!open) setMainDeptSearch(""); else setTimeout(() => mainDeptSearchRef.current?.focus(), 100); }}>
//                     <SelectTrigger className="w-[180px] h-9 focus:ring-0 border-muted-foreground/40"><SelectValue placeholder="Department" /></SelectTrigger>
//                     <SelectContent onKeyDown={(e) => e.stopPropagation()} onKeyUp={(e) => e.stopPropagation()}>
//                       <div className="flex items-center px-2 py-1.5 border-b sticky top-0 bg-popover z-10">
//                         <Search className="h-3.5 w-3.5 mr-2 text-muted-foreground shrink-0" />
//                         <input ref={mainDeptSearchRef} placeholder="Search depts..." value={mainDeptSearch} onChange={(e) => { setMainDeptSearch(e.target.value); setTimeout(() => mainDeptSearchRef.current?.focus(), 0); }} className="w-full text-xs bg-transparent outline-none placeholder:text-muted-foreground" />
//                       </div>
//                       <SelectItem value="all">All departments</SelectItem>
//                       {filteredMainDeptsOptions.map((d) => (
//                         <SelectItem key={d.id} value={d.name}>{d.name || "—"}</SelectItem>
//                       ))}
//                     </SelectContent>
//                   </Select>
//                 </div>

//                 {/* Role Filters Option Setup */}
//                 <div className="relative flex flex-col pt-2.5">
//                   <span className="absolute -top-1 left-2 bg-background px-1 text-[11px] font-semibold text-muted-foreground z-10">
//                     Role
//                   </span>
//                   <Select value={roleFilter} onValueChange={handleRoleFilterChange} onOpenChange={(open) => { if (!open) setMainRoleSearch(""); else setTimeout(() => mainRoleSearchRef.current?.focus(), 100); }}>
//                     <SelectTrigger className="w-[180px] h-9 focus:ring-0 border-muted-foreground/40"><SelectValue placeholder="Role" /></SelectTrigger>
//                     <SelectContent onKeyDown={(e) => e.stopPropagation()} onKeyUp={(e) => e.stopPropagation()}>
//                       <div className="flex items-center px-2 py-1.5 border-b sticky top-0 bg-popover z-10">
//                         <Search className="h-3.5 w-3.5 mr-2 text-muted-foreground shrink-0" />
//                         <input ref={mainRoleSearchRef} placeholder="Search roles..." value={mainRoleSearch} onChange={(e) => { setMainRoleSearch(e.target.value); setTimeout(() => mainRoleSearchRef.current?.focus(), 0); }} className="w-full text-xs bg-transparent outline-none placeholder:text-muted-foreground" />
//                       </div>
//                       <SelectItem value="all">All roles</SelectItem>
//                       {filteredMainRolesOptions.map((roleStr) => (
//                         <SelectItem key={roleStr} value={roleStr}>{formatRoleName(roleStr)}</SelectItem>
//                       ))}
//                     </SelectContent>
//                   </Select>
//                 </div>

//                 <Button type="button" variant="ghost" size="sm" disabled={deptFilter === "all" && roleFilter === "all"} onClick={handleResetFilters} className="h-9 px-3 text-xs font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 border border-dashed border-muted-foreground/30 transition-all duration-300 ease-out group active:scale-95">
//                   <XCircle className="h-3.5 w-3.5 mr-1.5 text-muted-foreground/70 group-hover:rotate-90 transition-transform duration-300" />
//                   Reset Filters
//                 </Button>
//               </div>
//             }
//             columns={[
//               {
//                 key: "name", header: "Name", accessor: (u) => (
//                   <div className="flex items-center gap-2 py-1">
//                     <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white" style={{ backgroundColor: u.avatarColor ?? "#0d7a5f" }}>
//                       {(u.firstName?.[0] || "")}{(u.lastName?.[0] || "")}
//                     </div>
//                     <div className="font-medium text-zinc-900 dark:text-zinc-100">{u.firstName} {u.lastName}</div>
//                   </div>
//                 ), searchValue: (u) => `${u.firstName} {u.lastName}`
//               },
//               { key: "email", header: "Email", accessor: (u) => u.email || "—", searchValue: (u) => u.email },
//               { key: "phone", header: "Phone", accessor: (u) => u.phone || "—" },
//               { key: "dept", header: "Department", accessor: (u) => u.department || "—", searchValue: (u) => u.department },
//               { key: "role", header: "Role", accessor: (u) => formatRoleName(String(u.roleName || "")), searchValue: (u) => u.roleName },
//               { key: "state", header: "State", accessor: (u) => u.stateName || "—" },
//               { key: "market", header: "Market", accessor: (u) => u.marketName || "—" },
//               { key: "district", header: "District", accessor: (u) => u.districtName || "—" },
//               { key: "store", header: "Store", accessor: (u) => u.storeName || "—" },
//             ]}
//             onDelete={handleDelete}
//             renderForm={(initial, close) => (
//               <UserForm
//                 initial={initial}
//                 dynamicRoles={dynamicRoles}
//                 dynamicDepts={dynamicDepts}
//                 onSaved={() => {
//                   lastFetchedKey.current = "";
//                   fetchUsers(page, size, deptFilter, roleFilter);
//                   close();
//                 }}
//               />
//             )}
//           />
//         </div>
//       </div>
//     </div>
//   );
// }

// // ==========================================
// // FORM COMPONENT MODAL INSTANCE
// // ==========================================

// function UserForm({ initial, dynamicRoles, dynamicDepts, onSaved }: { initial: any | null; dynamicRoles: string[]; dynamicDepts: any[]; onSaved: () => void }) {
//   const { data, set } = useData();
//   const [fullName, setFullName] = useState(initial ? `${initial.firstName} ${initial.lastName}`.trim() : "");
//   const [email, setEmail] = useState(initial?.email ?? "");

//   // Password buffers fields removed from edit mode configuration layout matrix
//   const [password, setPassword] = useState("");
//   const [confirmPassword, setConfirmPassword] = useState("");

//   const [role, setRole] = useState<Role>(initial?.roleName ?? ("user" as Role));
//   const [department, setDepartment] = useState<Department>(initial?.department ?? ("Administration" as Department));

//   const [stateId, setStateId] = useState(initial?.stateId ?? "");
//   const [marketId, setMarketId] = useState(initial?.marketId ?? "");
//   const [districtId, setDistrictId] = useState(initial?.districtId ?? "");
//   const [storeId, setStoreId] = useState(initial?.storeId ?? "");
//   const [submitting, setSubmitting] = useState(false);

//   const lowercaseRole = String(role).toLowerCase();
//   const needsState = lowercaseRole === "state_manager" || lowercaseRole === "statemanager" || lowercaseRole === "district_manager" || lowercaseRole === "districtmanager" || lowercaseRole === "market_manager" || lowercaseRole === "marketmanager" || lowercaseRole === "store_manager" || lowercaseRole === "storemanager";
//   const needsMarket = lowercaseRole === "district_manager" || lowercaseRole === "districtmanager" || lowercaseRole === "market_manager" || lowercaseRole === "marketmanager" || lowercaseRole === "store_manager" || lowercaseRole === "storemanager";
//   const needsDistrict = lowercaseRole === "district_manager" || lowercaseRole === "districtmanager" || lowercaseRole === "store_manager" || lowercaseRole === "storemanager";
//   const needsStore = lowercaseRole === "store_manager" || lowercaseRole === "storemanager";
//   const departmentRequired = lowercaseRole !== "admin";

//   const markets = data.markets.filter((m) => String(m.stateId) === String(stateId));
//   const districts = data.districts.filter((d) => String(d.marketId) === String(marketId));
//   const stores = data.stores.filter((s) => String(s.districtId) === String(districtId));

//   const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

//   // Adjusted conditional password checker logic
//   const passwordOk = initial
//     ? true
//     : password.length >= 6 && password === confirmPassword;

//   const baseValid = fullName.trim().length >= 2 && validEmail && role;
//   const canSave =
//     baseValid && passwordOk &&
//     (!departmentRequired || !!department) &&
//     (!needsState || stateId) && (!needsMarket || marketId) &&
//     (!needsDistrict || districtId) && (!needsStore || storeId);

//   const validationHint = (() => {
//     if (!fullName.trim()) return "Full name is required";
//     if (!validEmail) return "Valid email address structure is required";
//     if (!initial && password.length < 6) return "Password must be at least 6 characters";
//     if (!initial && password !== confirmPassword) return "Form entry passwords do not match";
//     if (departmentRequired && !department) return "Department assignment is required";
//     return null;
//   })();

//   const submit = async () => {
//     if (!canSave) {
//       if (validationHint) toast.error(validationHint);
//       return;
//     }
//     try {
//       setSubmitting(true);
//       const payload = {
//         fullName: fullName.trim(),
//         email: email.trim(),
//         role: { id: 0, name: role },
//         department: departmentRequired && department ? { id: 0, name: department } : null,
//         state: needsState && stateId ? { id: String(stateId), name: "" } : null,
//         market: needsMarket && marketId ? { id: String(marketId), name: "" } : null,
//         district: needsDistrict && districtId ? { id: String(districtId), name: "" } : null,
//         store: needsStore && storeId ? { id: String(storeId), name: "" } : null,
//       };

//       if (initial) {
//         const numericId = Number(initial.id);
//         const updateApi = usersApi.update as any;
//         const response = await updateApi({ id: numericId, ...payload });
//         if (response.success) {
//           toast.success("User configuration updated successfully");
//           onSaved();
//         }
//       } else {
//         const addApi = usersApi.add as any;
//         const response = await addApi({ ...payload, password });
//         if (response.success) {
//           toast.success("User safely saved to database");
//           onSaved();
//         }
//       }
//     } catch (err: any) {
//       toast.error(err?.message || "An error occurred during submission workflow");
//     } finally {
//       setSubmitting(false);
//     }
//   };

//   return (
//     <div className="space-y-4">
//       <div className="space-y-1.5">
//         <Label>Full name <span className="text-destructive">*</span></Label>
//         <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Arslan Khan" autoComplete="off" />
//       </div>

//       <div className="space-y-1.5">
//         <Label>Email <span className="text-destructive">*</span></Label>
//         <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@techno.com" autoComplete="new-password" />
//       </div>

//       {/* CONDITIONAL UNMOUNT: Password inputs display strictly when adding a new record instance */}
//       {!initial && (
//         <div className="grid grid-cols-2 gap-3">
//           <div className="space-y-1.5">
//             <Label>Password <span className="text-destructive">*</span></Label>
//             <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 6 chars" autoComplete="new-password" />
//           </div>
//           <div className="space-y-1.5">
//             <Label>Confirm password <span className="text-destructive">*</span></Label>
//             <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-enter password" autoComplete="new-password" />
//           </div>
//         </div>
//       )}

//       <div className="grid grid-cols-2 gap-3">
//         <div className="space-y-1.5">
//           <Label>Role <span className="text-destructive">*</span></Label>
//           <Select value={role} onValueChange={(v) => setRole(v as Role)}>
//             <SelectTrigger><SelectValue /></SelectTrigger>
//             <SelectContent>
//               {dynamicRoles.map((roleStr) => (
//                 <SelectItem key={roleStr} value={roleStr}>{formatRoleName(roleStr)}</SelectItem>
//               ))}
//             </SelectContent>
//           </Select>
//         </div>

//         <div className="space-y-1.5">
//           <Label>
//             Department {departmentRequired && <span className="text-destructive">*</span>}
//             {!departmentRequired && <span className="ml-1 text-xs text-muted-foreground">(all for Admin)</span>}
//           </Label>
//           <Select value={departmentRequired ? department : "all"} onValueChange={(v) => setDepartment(v as Department)} disabled={!departmentRequired}>
//             <SelectTrigger><SelectValue placeholder={departmentRequired ? "Select department" : "—"} /></SelectTrigger>
//             <SelectContent>
//               {dynamicDepts.map((d) => <SelectItem key={d.id} value={d.name}>{d.name || "—"}</SelectItem>)}
//             </SelectContent>
//           </Select>
//         </div>
//       </div>

//       {/* Cascading Matrix Fields for Operations Roles Assignment */}
//       {needsState && (
//         <div className="space-y-1.5">
//           <Label>State</Label>
//           <Select value={stateId} onValueChange={(v) => { setStateId(v); setMarketId(""); setDistrictId(""); setStoreId(""); }}>
//             <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
//             <SelectContent>{data.states.map((s) => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}</SelectContent>
//           </Select>
//         </div>
//       )}
//       {needsMarket && (
//         <div className="space-y-1.5">
//           <Label>Market</Label>
//           <Select value={marketId} disabled={!stateId} onValueChange={(v) => { setMarketId(v); setDistrictId(""); setStoreId(""); }}>
//             <SelectTrigger><SelectValue placeholder={!stateId ? "Choose operating state" : "Select market"} /></SelectTrigger>
//             <SelectContent>{markets.map((m) => <SelectItem key={m.id} value={m.id.toString()}>{m.name}</SelectItem>)}</SelectContent>
//           </Select>
//         </div>
//       )}
//       {needsDistrict && (
//         <div className="space-y-1.5">
//           <Label>District</Label>
//           <Select value={districtId} disabled={!marketId} onValueChange={(v) => { setDistrictId(v); setStoreId(""); }}>
//             <SelectTrigger><SelectValue placeholder={!marketId ? "Choose mapped market" : "Select district"} /></SelectTrigger>
//             <SelectContent>{districts.map((d) => <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>)}</SelectContent>
//           </Select>
//         </div>
//       )}
//       {needsStore && (
//         <div className="space-y-1.5">
//           <Label>Store</Label>
//           <Select value={storeId} disabled={!districtId} onValueChange={setStoreId}>
//             <SelectTrigger><SelectValue placeholder={!districtId ? "Choose local district" : "Select store"} /></SelectTrigger>
//             <SelectContent>{stores.map((s) => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}</SelectContent>
//           </Select>
//         </div>
//       )}

//       <Button className="w-full flex items-center justify-center gap-2 mt-2" disabled={!canSave || submitting} onClick={submit}>
//         {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
//         {initial ? "Update user configuration" : "Create user instance"}
//       </Button>
//     </div>
//   );
// }
























































































































import { useState, useEffect, useRef, useMemo } from "react";
import { AdminGuard, CrudPage } from "@/components/crud-page";
import { type Department, type Role, type User } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usersApi, hierarchyApi, StatesApi, DistrictsApi, MarketsApi, StoresApi, type BackendUser } from "@/lib/api/client";
import { toast } from "sonner";
import { Loader2, Search, XCircle } from "lucide-react";



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

function mapBackendToFrontendUser(bu: any): User & { phone?: string; stateName?: string; marketName?: string; districtName?: string; storeName?: string } {
  const parts = (bu.fullName || "").trim().split(/\s+/);
  const roleNameFromBackend = (bu.roleName || "user").toLowerCase() as Role;
  const departmentNameFromBackend = bu.departmentName as Department;

  return {
    id: String(bu.id),
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" ") || "",
    email: bu.email || "",
    roleName: roleNameFromBackend,
    department: departmentNameFromBackend,
    avatarColor: "#0d7a5f", 
    active: bu.active ?? true,
    stateId: bu.stateId ? String(bu.stateId) : "",
    marketId: bu.marketId ? String(bu.marketId) : "",
    districtId: bu.districtId ? String(bu.districtId) : "",
    storeId: bu.storeId ? String(bu.storeId) : "",
    phone: bu.phone || "—",
    stateName: bu.stateName || "—",
    marketName: bu.marketName || "—",
    districtName: bu.districtName || "—",
    storeName: bu.storeName || "—",
  };
}

function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [deptFilter, setDeptFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  
  const [dynamicRoles, setDynamicRoles] = useState<string[]>([]);
  const [dynamicDepts, setDynamicDepts] = useState<{ id: number; name: string }[]>([]);

  const [mainDeptSearch, setMainDeptSearch] = useState("");
  const [mainRoleSearch, setMainRoleSearch] = useState("");

  const mainDeptSearchRef = useRef<HTMLInputElement>(null);
  const mainRoleSearchRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [page, setPage] = useState<number>(0);
  const [size, setSize] = useState<number>(10);
  const [totalRecords, setTotalRecords] = useState<number>(0);

  const lastFetchedKey = useRef<string>("");
  const isFetchingRef = useRef<boolean>(false);
  const initialLookupsFetchedRef = useRef<boolean>(false);

  useEffect(() => {
    const styleTag = document.createElement("style");
    styleTag.innerHTML = `
      .crud-page-table thead tr, table thead tr { 
        background-color: rgba(244, 244, 245, 1) !important; 
      }
      table thead th {
        color: #18181b !important;
        font-weight: 600 !important;
      }
    `;
    document.head.appendChild(styleTag);
    return () => {
      document.head.removeChild(styleTag);
    };
  }, []);

  const fetchUsers = async (targetPage: number, targetSize: number, targetDept: string, targetRole: string) => {
    const currentRequestKey = `${targetPage}-${targetSize}-${targetDept}-${targetRole}`;
    if (lastFetchedKey.current === currentRequestKey || isFetchingRef.current) return;
    
    try {
      setLoading(true);
      isFetchingRef.current = true;
      lastFetchedKey.current = currentRequestKey;

      if (!initialLookupsFetchedRef.current) {
        const [rolesRes, deptsRes] = await Promise.all([
          hierarchyApi.getRoles(),
          hierarchyApi.getDepartments()
        ]);
        if (rolesRes.success && Array.isArray(rolesRes.data)) setDynamicRoles(rolesRes.data);
        if (deptsRes.success && Array.isArray(deptsRes.data)) setDynamicDepts(deptsRes.data);
        if (rolesRes.success && deptsRes.success) initialLookupsFetchedRef.current = true;
      }

      const res = await usersApi.getAll({
        page: targetPage,
        size: targetSize,
        department: targetDept !== "all" ? targetDept : undefined,
        role: targetRole !== "all" ? targetRole : undefined
      });

      if (res.success) {
        if (res.data.length === 0 && res.pagination && res.pagination.totalRecords > 0 && targetPage > 0) {
          const maxAvailablePage = Math.ceil(res.pagination.totalRecords / targetSize) - 1;
          setPage(Math.max(0, maxAvailablePage));
          return;
        }
        setUsers(res.data.map(mapBackendToFrontendUser));
        setTotalRecords(res.pagination?.totalRecords ?? res.data.length);
      } else {
        toast.error(res.message || "Failed to load records mapping structure");
      }
    } catch (err: any) {
      toast.error(err?.message || "Something went wrong while retrieving records");
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  };

  useEffect(() => {
    fetchUsers(page, size, deptFilter, roleFilter);
  }, [page, size, deptFilter, roleFilter]);

  const handleDelete = async (u: any) => {
    try {
      setActionLoading(true);
      const res = await usersApi.delete(Number(u.id));
      if (res.success) {
        toast.success("User record safely removed");
        lastFetchedKey.current = "";
        fetchUsers(page, size, deptFilter, roleFilter);
      }
    } catch (err: any) {
      toast.error(err?.message || "Deletion framework error encountered");
    } finally {
      setActionLoading(false);
    }
  };

  const filteredMainDeptsOptions = useMemo(() => {
    return dynamicDepts.filter((d) => (d.name || "").toLowerCase().includes(mainDeptSearch.toLowerCase()));
  }, [dynamicDepts, mainDeptSearch]);

  const filteredMainRolesOptions = useMemo(() => {
    return dynamicRoles.filter((r) => r.toLowerCase().includes(mainRoleSearch.toLowerCase()));
  }, [dynamicRoles, mainRoleSearch]);

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
          subtitle="Manage internal employees and their access roles."
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

              <div className="relative flex flex-col pt-2.5">
                <span className="absolute -top-1 left-2 bg-background px-1 text-[11px] font-semibold text-muted-foreground z-10">Role</span>
                <Select value={roleFilter} onValueChange={(val) => { lastFetchedKey.current = ""; setPage(0); setRoleFilter(val); }} onOpenChange={(open) => { if (!open) setMainRoleSearch(""); else setTimeout(() => mainRoleSearchRef.current?.focus(), 100); }}>
                  <SelectTrigger className="w-[180px] h-9 focus:ring-0 border-muted-foreground/40"><SelectValue placeholder="Role" /></SelectTrigger>
                  <SelectContent onKeyDown={(e) => e.stopPropagation()}>
                    <div className="flex items-center px-2 py-1.5 border-b sticky top-0 bg-popover z-10">
                      <Search className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                      <input ref={mainRoleSearchRef} placeholder="Search roles..." value={mainRoleSearch} onChange={(e) => setMainRoleSearch(e.target.value)} className="w-full text-xs bg-transparent outline-none" />
                    </div>
                    <SelectItem value="all">All roles</SelectItem>
                    {filteredMainRolesOptions.map((roleStr) => <SelectItem key={roleStr} value={roleStr}>{formatRoleName(roleStr)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <Button type="button" variant="ghost" size="sm" disabled={deptFilter === "all" && roleFilter === "all"} onClick={() => { lastFetchedKey.current = ""; setPage(0); setDeptFilter("all"); setRoleFilter("all"); }} className="h-9 px-3 text-xs border border-dashed border-muted-foreground/30"><XCircle className="h-3.5 w-3.5 mr-1.5" />Reset Filters</Button>
            </div>
          }
          columns={[
            {
              key: "name", header: "Name", accessor: (u) => (
                <div className="flex items-center gap-2 py-1">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white" style={{ backgroundColor: u.avatarColor ?? "#0d7a5f" }}>
                    {(u.firstName?.[0] || "")}{(u.lastName?.[0] || "")}
                  </div>
                  <div className="font-medium text-zinc-900 dark:text-zinc-100">{u.firstName} {u.lastName}</div>
                </div>
              ), searchValue: (u) => `${u.firstName} ${u.lastName}`
            },
            { key: "email", header: "Email", accessor: (u) => u.email || "—", searchValue: (u) => u.email },
            { key: "phone", header: "Phone", accessor: (u) => u.phone || "—" },
            { key: "dept", header: "Department", accessor: (u) => u.department || "—", searchValue: (u) => u.department },
            { key: "role", header: "Role", accessor: (u) => formatRoleName(String(u.roleName || "")), searchValue: (u) => u.roleName },
            
            // 🌟 Fixed: Reordered Hierarchy Columns according to specified layout priority criteria
            { key: "state", header: "State", accessor: (u) => u.stateName || "—" },
            { key: "district", header: "District", accessor: (u) => u.districtName || "—" },
            { key: "market", header: "Market", accessor: (u) => u.marketName || "—" },
            { key: "store", header: "Store", accessor: (u) => u.storeName || "—" },
          ]}
          onDelete={handleDelete}
          renderForm={(initial, close) => (
            <UserForm
              initial={initial}
              dynamicRoles={dynamicRoles}
              onSaved={() => {
                lastFetchedKey.current = "";
                fetchUsers(page, size, deptFilter, roleFilter);
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

function UserForm({ initial, dynamicRoles, onSaved }: { initial: any | null; dynamicRoles: string[]; onSaved: () => void }) {
  const [fullName, setFullName] = useState(initial ? `${initial.firstName} ${initial.lastName}`.trim() : "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [role, setRole] = useState<Role>(initial?.roleName ?? ("user" as Role));
  
  // 🌟 Fixed: Default set to "placeholder" string token value to prevent auto-selecting backend indices
  const [department, setDepartment] = useState<string>(initial?.department ?? "placeholder");

  // Real Dynamic Options Lookups Buffers arrays
  const [dbDepts, setDbDepts] = useState<any[]>([]);
  const [dbStates, setDbStates] = useState<any[]>([]);
  const [dbDistricts, setDbDistricts] = useState<any[]>([]);
  const [dbMarkets, setDbMarkets] = useState<any[]>([]);
  const [dbStores, setDbStores] = useState<any[]>([]);

  const [stateId, setStateId] = useState(initial?.stateId ?? "");
  const [districtId, setDistrictId] = useState(initial?.districtId ?? "");
  const [marketId, setMarketId] = useState(initial?.marketId ?? "");
  const [storeId, setStoreId] = useState(initial?.storeId ?? "");
  const [submitting, setSubmitting] = useState(false);

  const lowercaseRole = String(role).toLowerCase();

  // Dynamic Validation Framework Flags
  const isAdmin = lowercaseRole === "admin";
  const isUserOrManager = lowercaseRole === "user" || lowercaseRole === "manager";

  const needsState = ["state_manager", "statemanager", "district_manager", "districtmanager", "market_manager", "marketmanager", "store_manager", "storemanager"].includes(lowercaseRole);
  const needsDistrict = ["district_manager", "districtmanager", "market_manager", "marketmanager", "store_manager", "storemanager"].includes(lowercaseRole);
  const needsMarket = ["market_manager", "marketmanager", "store_manager", "storemanager"].includes(lowercaseRole);
  const needsStore = ["store_manager", "storemanager"].includes(lowercaseRole);

  // 🌟 Fetching dynamic data via API lookups
  useEffect(() => {
    hierarchyApi.getDepartments().then(res => { if(res.success) setDbDepts(res.data); });
    StatesApi.getAll().then(res => { if(res.success && res.data) setDbStates(res.data); });
  }, []);

  useEffect(() => {
    if (stateId) {
      DistrictsApi.getAll({ state: stateId, size: 1000 }).then(res => { if(res.success && res.data) setDbDistricts(res.data); });
    } else {
      setDbDistricts([]);
    }
  }, [stateId]);

  useEffect(() => {
    if (districtId) {
      MarketsApi.getAll({ district: districtId, size: 1000 }).then(res => { if(res.success && res.data) setDbMarkets(res.data); });
    } else {
      setDbMarkets([]);
    }
  }, [districtId]);

  useEffect(() => {
    if (marketId) {
      StoresApi.getAll({ market: marketId, size: 1000 }).then(res => { if(res.success && res.data) setDbStores(res.data); });
    } else {
      setDbStores([]);
    }
  }, [marketId]);

  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const passwordOk = initial ? true : password.length >= 6 && password === confirmPassword;
  
  // 🌟 Fixed validation rules as per assignment configuration specifications
  const isDeptFilled = isAdmin ? true : isUserOrManager ? (department !== "placeholder" && !!department) : true;
  const isHierarchyFilled = 
    (!needsState || !!stateId) && 
    (!needsDistrict || !!districtId) && 
    (!needsMarket || !!marketId) && 
    (!needsStore || !!storeId);

  const canSave = fullName.trim().length >= 2 && validEmail && role && passwordOk && isDeptFilled && isHierarchyFilled;

  const validationHint = (() => {
    if (!fullName.trim()) return "Full name is required";
    if (!validEmail) return "Valid email address structure is required";
    if (!initial && password.length < 6) return "Password must be at least 6 characters";
    if (!initial && password !== confirmPassword) return "Form entry passwords do not match";
    if (isUserOrManager && department === "placeholder") return "Department assignment is required for User/Manager roles";
    if (needsState && !stateId) return "State mapping selection is required";
    if (needsDistrict && !districtId) return "District mapping selection is required";
    if (needsMarket && !marketId) return "Market mapping selection is required";
    if (needsStore && !storeId) return "Store mapping selection is required";
    return null;
  })();

  const submit = async () => {
    if (!canSave) {
      if (validationHint) toast.error(validationHint);
      return;
    }
    try {
      setSubmitting(true);
      
      // 🌟 Fixed final department output values payload assignment routing
      let finalDeptPayload = null;
      if (isAdmin) {
        finalDeptPayload = { id: 0, name: "all" };
      } else if (department !== "placeholder" && department) {
        finalDeptPayload = { id: 0, name: department };
      }

    const selectedDeptObj = dbDepts.find(d => d.name === department);
      const departmentId = isAdmin ? 0 : (selectedDeptObj ? Number(selectedDeptObj.id) : null);
      const departmentName = isAdmin ? "all" : (department !== "placeholder" ? department : null);

      const payload = {
        fullName: fullName.trim(),
        email: email.trim(),
        roleName: role,
        departmentId: departmentId,
        departmentName: departmentName,
        stateId: needsState && stateId ? Number(stateId) : null,
        districtId: needsDistrict && districtId ? Number(districtId) : null,
        marketId: needsMarket && marketId ? Number(marketId) : null,
        storeId: needsStore && storeId ? Number(storeId) : null,
      };


      if (initial) {
        const response = await usersApi.update({ id: Number(initial.id), ...payload });
        if (response.success) {
          toast.success("User configuration updated successfully");
          onSaved();
        }
      } else {
        const response = await usersApi.add({ ...payload, password } as any);
        if (response.success) {
          toast.success("User safely saved to database");
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
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Full name <span className="text-destructive">*</span></Label>
        <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Arslan Khan" autoComplete="off" />
      </div>
      
      <div className="space-y-1.5">
        <Label>Email <span className="text-destructive">*</span></Label>
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@techno.com" autoComplete="new-password" />
      </div>

      {!initial && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Password <span className="text-destructive">*</span></Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 6 chars" autoComplete="new-password" />
          </div>
          <div className="space-y-1.5">
            <Label>Confirm password <span className="text-destructive">*</span></Label>
            <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-enter password" autoComplete="new-password" />
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Role <span className="text-destructive">*</span></Label>
          <Select value={role} onValueChange={(v) => { setRole(v as Role); if(v.toLowerCase() === "admin") setDepartment("placeholder"); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {dynamicRoles.map((roleStr) => <SelectItem key={roleStr} value={roleStr}>{formatRoleName(roleStr)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-1.5">
          <Label>
            Department {isUserOrManager && <span className="text-destructive">*</span>}
            {isAdmin && <span className="ml-1 text-xs text-muted-foreground">("all" for Admins)</span>}
          </Label>
          <Select value={isAdmin ? "all" : department} onValueChange={setDepartment} disabled={isAdmin}>
            <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
            <SelectContent>
              {isAdmin ? (
                <SelectItem value="all">all</SelectItem>
              ) : (
                <>
                  <SelectItem value="placeholder" disabled>Select department</SelectItem>
                  {dbDepts.map((d) => <SelectItem key={d.id} value={d.name}>{d.name || "—"}</SelectItem>)}
                </>
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 🌟 Prioritized Hierarchical Cascading Chains Grid Setup */}
      {needsState && (
        <div className="space-y-1.5">
          <Label>State <span className="text-destructive">*</span></Label>
          <Select value={stateId} onValueChange={(v) => { setStateId(v); setDistrictId(""); setMarketId(""); setStoreId(""); }}>
            <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
            <SelectContent>{dbStates.map((s) => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      )}

      {needsDistrict && (
        <div className="space-y-1.5">
          <Label>District <span className="text-destructive">*</span></Label>
          <Select value={districtId} disabled={!stateId} onValueChange={(v) => { setDistrictId(v); setMarketId(""); setStoreId(""); }}>
            <SelectTrigger><SelectValue placeholder={!stateId ? "Choose state first" : "Select district"} /></SelectTrigger>
            <SelectContent>{dbDistricts.map((d) => <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      )}

      {needsMarket && (
        <div className="space-y-1.5">
          <Label>Market <span className="text-destructive">*</span></Label>
          <Select value={marketId} disabled={!districtId} onValueChange={(v) => { setMarketId(v); setStoreId(""); }}>
            <SelectTrigger><SelectValue placeholder={!districtId ? "Choose district first" : "Select market"} /></SelectTrigger>
            <SelectContent>{dbMarkets.map((m) => <SelectItem key={m.id} value={m.id.toString()}>{m.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      )}

      {needsStore && (
        <div className="space-y-1.5">
          <Label>Store <span className="text-destructive">*</span></Label>
          <Select value={storeId} disabled={!marketId} onValueChange={setStoreId}>
            <SelectTrigger><SelectValue placeholder={!marketId ? "Choose market first" : "Select store"} /></SelectTrigger>
            <SelectContent>{dbStores.map((s) => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      )}

      <Button className="w-full flex items-center justify-center gap-2 mt-2" disabled={!canSave || submitting} onClick={submit}>
        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
        {initial ? "Update user configuration" : "Create user instance"}
      </Button>
    </div>
  );
}