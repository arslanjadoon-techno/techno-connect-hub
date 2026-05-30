import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useData } from "@/lib/data-store";
import { AdminGuard, CrudPage } from "@/components/crud-page";
import type { District } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/admin/districts")({
  head: () => ({ meta: [{ title: "Districts — Admin" }] }),
  component: () => <AdminGuard><DistrictsPage /></AdminGuard>,
});

function DistrictsPage() {
  const { data, set } = useData();
  const stateName = (id: string) => data.states.find((s) => s.id === id)?.name ?? "—";
  const marketName = (id: string) => data.markets.find((m) => m.id === id)?.name ?? "—";
  return (
    <CrudPage<District>
      title="Districts"
      rows={data.districts}
      rowKey={(d) => d.id}
      columns={[
        { key: "name", header: "Name", accessor: (d) => d.name, searchValue: (d) => d.name },
        { key: "state", header: "State", accessor: (d) => stateName(d.stateId), searchValue: (d) => stateName(d.stateId) },
        { key: "market", header: "Market", accessor: (d) => marketName(d.marketId), searchValue: (d) => marketName(d.marketId) },
      ]}
      onDelete={(d) => { set("districts", data.districts.filter((x) => x.id !== d.id)); toast.success("Deleted"); }}
      renderForm={(initial, close) => (
        <DistrictForm
          initial={initial}
          onSave={(next) => {
            if (initial) set("districts", data.districts.map((x) => x.id === next.id ? next : x));
            else set("districts", [...data.districts, next]);
            toast.success(initial ? "Updated" : "Added");
            close();
          }}
        />
      )}
    />
  );
}

function DistrictForm({ initial, onSave }: { initial: District | null; onSave: (d: District) => void }) {
  const { data } = useData();
  const [name, setName] = useState(initial?.name ?? "");
  const [stateId, setStateId] = useState(initial?.stateId ?? data.states[0]?.id ?? "");
  const [marketId, setMarketId] = useState(initial?.marketId ?? "");
  const filteredMarkets = data.markets.filter((m) => m.stateId === stateId);
  return (
    <div className="space-y-4">
      <div className="space-y-1.5"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
      <div className="space-y-1.5">
        <Label>State</Label>
        <Select value={stateId} onValueChange={(v) => { setStateId(v); setMarketId(""); }}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{data.states.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Market</Label>
        <Select value={marketId} onValueChange={setMarketId}>
          <SelectTrigger><SelectValue placeholder="Select market" /></SelectTrigger>
          <SelectContent>{filteredMarkets.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <Button
        disabled={!name || !stateId || !marketId}
        onClick={() => onSave({ id: initial?.id ?? `ds-${Date.now()}`, name: name.trim(), stateId, marketId })}
      >
        Save
      </Button>
    </div>
  );
}
