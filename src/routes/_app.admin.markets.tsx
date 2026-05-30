import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useData } from "@/lib/data-store";
import { AdminGuard, CrudPage } from "@/components/crud-page";
import type { Market } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/admin/markets")({
  head: () => ({ meta: [{ title: "Markets — Admin" }] }),
  component: () => <AdminGuard><MarketsPage /></AdminGuard>,
});

function MarketsPage() {
  const { data, set } = useData();
  const stateName = (id: string) => data.states.find((s) => s.id === id)?.name ?? "—";
  return (
    <CrudPage<Market>
      title="Markets"
      rows={data.markets}
      rowKey={(m) => m.id}
      columns={[
        { key: "name", header: "Name", accessor: (m) => m.name, searchValue: (m) => m.name },
        { key: "state", header: "State", accessor: (m) => stateName(m.stateId), searchValue: (m) => stateName(m.stateId) },
      ]}
      onDelete={(m) => {
        set("markets", data.markets.filter((x) => x.id !== m.id));
        toast.success("Market deleted");
      }}
      renderForm={(initial, close) => (
        <MarketForm
          initial={initial}
          states={data.states}
          onSave={(next) => {
            if (initial) set("markets", data.markets.map((x) => x.id === next.id ? next : x));
            else set("markets", [...data.markets, next]);
            toast.success(initial ? "Market updated" : "Market added");
            close();
          }}
        />
      )}
    />
  );
}

function MarketForm({
  initial, states, onSave,
}: { initial: Market | null; states: { id: string; name: string }[]; onSave: (m: Market) => void }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [stateId, setStateId] = useState(initial?.stateId ?? states[0]?.id ?? "");
  return (
    <div className="space-y-4">
      <div className="space-y-1.5"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
      <div className="space-y-1.5">
        <Label>State</Label>
        <Select value={stateId} onValueChange={setStateId}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{states.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <Button
        disabled={!name || !stateId}
        onClick={() => onSave({ id: initial?.id ?? `mk-${Date.now()}`, name: name.trim(), stateId })}
      >
        Save
      </Button>
    </div>
  );
}
