import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useData } from "@/lib/data-store";
import { AdminGuard, CrudPage } from "@/components/crud-page";
import type { House } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/admin/houses")({
  head: () => ({ meta: [{ title: "Houses — Admin" }] }),
  component: () => <AdminGuard><HousesPage /></AdminGuard>,
});

function HousesPage() {
  const { data, set } = useData();
  return (
    <CrudPage<House>
      title="Houses"
      rows={data.houses}
      rowKey={(s) => s.id}
      columns={[
        { key: "name", header: "House", accessor: (s) => (
            <div><div className="font-medium">{s.name}</div><div className="text-xs text-muted-foreground font-mono">{s.code}</div></div>
          ), searchValue: (s) => `${s.name} ${s.code}` },
        { key: "state", header: "State", accessor: (s) => data.states.find((x) => x.id === s.stateId)?.name ?? "—", searchValue: (s) => data.states.find((x) => x.id === s.stateId)?.name ?? "" },
        { key: "market", header: "Market", accessor: (s) => data.markets.find((x) => x.id === s.marketId)?.name ?? "—", searchValue: (s) => data.markets.find((x) => x.id === s.marketId)?.name ?? "" },
        { key: "district", header: "District", accessor: (s) => data.districts.find((x) => x.id === s.districtId)?.name ?? "—", searchValue: (s) => data.districts.find((x) => x.id === s.districtId)?.name ?? "" },
        { key: "address", header: "Address", accessor: (s) => <span className="text-sm">{s.address}</span>, searchValue: (s) => s.address },
      ]}
      onDelete={(s) => { set("houses", data.houses.filter((x) => x.id !== s.id)); toast.success("Deleted"); }}
      renderForm={(initial, close) => (
        <HouseForm initial={initial} onSave={(next) => {
          if (initial) set("houses", data.houses.map((x) => x.id === next.id ? next : x));
          else set("houses", [...data.houses, next]);
          toast.success(initial ? "Updated" : "Added");
          close();
        }} />
      )}
    />
  );
}

function HouseForm({ initial, onSave }: { initial: House | null; onSave: (s: House) => void }) {
  const { data } = useData();
  const [name, setName] = useState(initial?.name ?? "");
  const [code, setCode] = useState(initial?.code ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [stateId, setStateId] = useState(initial?.stateId ?? data.states[0]?.id ?? "");
  const [marketId, setMarketId] = useState(initial?.marketId ?? "");
  const [districtId, setDistrictId] = useState(initial?.districtId ?? "");
  const markets = data.markets.filter((m) => m.stateId === stateId);
  const districts = data.districts.filter((d) => d.marketId === marketId);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Code</Label><Input value={code} onChange={(e) => setCode(e.target.value)} /></div>
      </div>
      <div className="space-y-1.5"><Label>Address</Label><Input value={address} onChange={(e) => setAddress(e.target.value)} /></div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label>State</Label>
          <Select value={stateId} onValueChange={(v) => { setStateId(v); setMarketId(""); setDistrictId(""); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{data.states.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Market</Label>
          <Select value={marketId} onValueChange={(v) => { setMarketId(v); setDistrictId(""); }}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>{markets.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>District</Label>
          <Select value={districtId} onValueChange={setDistrictId}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>{districts.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <Button
        disabled={!name || !code || !stateId || !marketId || !districtId}
        onClick={() => onSave({
          id: initial?.id ?? `sto-${Date.now()}`,
          name: name.trim(), code: code.trim(), address: address.trim(),
          stateId, marketId, districtId,
        })}
      >
        Save
      </Button>
    </div>
  );
}
