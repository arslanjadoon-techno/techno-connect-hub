import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useData } from "@/lib/data-store";
import { AdminGuard, CrudPage } from "@/components/crud-page";
import type { State } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/admin/states")({
  head: () => ({ meta: [{ title: "States — Admin" }] }),
  component: () => <AdminGuard><StatesPage /></AdminGuard>,
});

function StatesPage() {
  const { data, set } = useData();
  return (
    <CrudPage<State>
      title="States"
      subtitle="Manage US states the company operates in."
      rows={data.states}
      rowKey={(s) => s.id}
      columns={[
        { key: "name", header: "Name", accessor: (s) => s.name, searchValue: (s) => s.name },
        { key: "code", header: "Code", accessor: (s) => s.code, searchValue: (s) => s.code },
      ]}
      onDelete={(s) => {
        set("states", data.states.filter((x) => x.id !== s.id));
        toast.success("State deleted");
      }}
      renderForm={(initial, close) => (
        <StateForm
          initial={initial}
          onSave={(next) => {
            if (initial) {
              set("states", data.states.map((x) => x.id === next.id ? next : x));
              toast.success("State updated");
            } else {
              set("states", [...data.states, next]);
              toast.success("State added");
            }
            close();
          }}
        />
      )}
    />
  );
}

function StateForm({ initial, onSave }: { initial: State | null; onSave: (s: State) => void }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [code, setCode] = useState(initial?.code ?? "");
  return (
    <div className="space-y-4">
      <div className="space-y-1.5"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
      <div className="space-y-1.5"><Label>Code</Label><Input value={code} onChange={(e) => setCode(e.target.value)} maxLength={3} /></div>
      <Button
        disabled={!name || !code}
        onClick={() => onSave({ id: initial?.id ?? `st-${Date.now()}`, name: name.trim(), code: code.trim().toUpperCase() })}
      >
        Save
      </Button>
    </div>
  );
}
