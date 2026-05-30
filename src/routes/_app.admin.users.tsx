import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useData } from "@/lib/data-store";
import { AdminGuard, CrudPage } from "@/components/crud-page";
import { ALL_DEPARTMENTS, ALL_ROLES, type Department, type Role, type User } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/admin/users")({
  head: () => ({ meta: [{ title: "Users — Admin" }] }),
  component: () => <AdminGuard><UsersPage /></AdminGuard>,
});

function UsersPage() {
  const { data, set } = useData();
  return (
    <CrudPage<User>
      title="Users"
      subtitle="Manage internal employees and their access roles."
      rows={data.users}
      rowKey={(u) => u.id}
      columns={[
        { key: "name", header: "Name", accessor: (u) => (
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white" style={{ backgroundColor: u.avatarColor ?? "#0d7a5f" }}>
                {u.firstName[0]}{u.lastName[0]}
              </div>
              <div><div className="font-medium">{u.firstName} {u.lastName}</div><div className="text-xs text-muted-foreground">{u.email}</div></div>
            </div>
          ), searchValue: (u) => `${u.firstName} ${u.lastName} ${u.email}` },
        { key: "dept", header: "Department", accessor: (u) => u.department, searchValue: (u) => u.department },
        { key: "role", header: "Role", accessor: (u) => ALL_ROLES.find((r) => r.value === u.role)?.label ?? u.role, searchValue: (u) => u.role },
      ]}
      onDelete={(u) => { set("users", data.users.filter((x) => x.id !== u.id)); toast.success("User deleted"); }}
      renderForm={(initial, close) => (
        <UserForm initial={initial} onSave={(next) => {
          if (initial) set("users", data.users.map((x) => x.id === next.id ? next : x));
          else set("users", [...data.users, next]);
          toast.success(initial ? "User updated" : "User added");
          close();
        }} />
      )}
      createLabel="Add user"
    />
  );
}

function UserForm({ initial, onSave }: { initial: User | null; onSave: (u: User) => void }) {
  const { data } = useData();
  const [firstName, setFirstName] = useState(initial?.firstName ?? "");
  const [lastName, setLastName] = useState(initial?.lastName ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [department, setDepartment] = useState<Department>(initial?.department ?? ALL_DEPARTMENTS[0]);
  const [role, setRole] = useState<Role>(initial?.role ?? "user");
  const [stateId, setStateId] = useState(initial?.stateId ?? "");
  const [marketId, setMarketId] = useState(initial?.marketId ?? "");
  const [districtId, setDistrictId] = useState(initial?.districtId ?? "");
  const [storeId, setStoreId] = useState(initial?.storeId ?? "");

  const needsState   = role === "state_manager" || role === "district_manager" || role === "market_manager" || role === "store_manager";
  const needsMarket  = role === "district_manager" || role === "market_manager" || role === "store_manager";
  const needsDistrict= role === "district_manager" || role === "store_manager";
  const needsStore   = role === "store_manager";

  const markets = data.markets.filter((m) => m.stateId === stateId);
  const districts = data.districts.filter((d) => d.marketId === marketId);
  const stores = data.stores.filter((s) => s.districtId === districtId);

  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const canSave =
    firstName.trim() && lastName.trim() && validEmail &&
    (!needsState || stateId) && (!needsMarket || marketId) &&
    (!needsDistrict || districtId) && (!needsStore || storeId);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5"><Label>First name</Label><Input value={firstName} onChange={(e) => setFirstName(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Last name</Label><Input value={lastName} onChange={(e) => setLastName(e.target.value)} /></div>
      </div>
      <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Department</Label>
          <Select value={department} onValueChange={(v) => setDepartment(v as Department)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{ALL_DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Role</Label>
          <Select value={role} onValueChange={(v) => setRole(v as Role)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{ALL_ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
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

      <Button
        disabled={!canSave}
        onClick={() => onSave({
          id: initial?.id ?? `u-${Date.now()}`,
          firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim(),
          department, role,
          stateId: needsState ? stateId : undefined,
          marketId: needsMarket ? marketId : undefined,
          districtId: needsDistrict ? districtId : undefined,
          storeId: needsStore ? storeId : undefined,
          avatarColor: initial?.avatarColor ?? "#0d7a5f",
        })}
      >
        Save
      </Button>
    </div>
  );
}
