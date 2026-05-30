import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useData } from "@/lib/data-store";
import { AdminGuard, CrudPage } from "@/components/crud-page";
import type { ExternalVendor } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/admin/external")({
  head: () => ({ meta: [{ title: "External Team — Admin" }] }),
  component: () => <AdminGuard><ExternalPage /></AdminGuard>,
});

function ExternalPage() {
  const { data, set } = useData();
  const marketName = (id: string) => data.markets.find((m) => m.id === id)?.name ?? "—";
  return (
    <CrudPage<ExternalVendor>
      title="External Team"
      subtitle="Vendors hired for overflow maintenance, repairs and other on-demand work."
      rows={data.vendors}
      rowKey={(v) => v.id}
      columns={[
        { key: "name", header: "Name", accessor: (v) => v.name, searchValue: (v) => v.name },
        { key: "phone", header: "Phone", accessor: (v) => v.phone, searchValue: (v) => v.phone },
        { key: "market", header: "Market", accessor: (v) => marketName(v.marketId), searchValue: (v) => marketName(v.marketId) },
        { key: "address", header: "Address", accessor: (v) => v.address, searchValue: (v) => v.address },
        { key: "nature", header: "Nature of work", accessor: (v) => v.natureOfWork, searchValue: (v) => v.natureOfWork },
      ]}
      onDelete={(v) => { set("vendors", data.vendors.filter((x) => x.id !== v.id)); toast.success("Deleted"); }}
      renderForm={(initial, close) => (
        <VendorForm initial={initial} onSave={(next) => {
          if (initial) set("vendors", data.vendors.map((x) => x.id === next.id ? next : x));
          else set("vendors", [...data.vendors, next]);
          toast.success(initial ? "Updated" : "Added");
          close();
        }} />
      )}
      createLabel="Add vendor"
    />
  );
}

function VendorForm({ initial, onSave }: { initial: ExternalVendor | null; onSave: (v: ExternalVendor) => void }) {
  const { data } = useData();
  const [name, setName] = useState(initial?.name ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [marketId, setMarketId] = useState(initial?.marketId ?? data.markets[0]?.id ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [natureOfWork, setNature] = useState(initial?.natureOfWork ?? "");
  return (
    <div className="space-y-3">
      <div className="space-y-1.5"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5"><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
        <div className="space-y-1.5">
          <Label>Market</Label>
          <Select value={marketId} onValueChange={setMarketId}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{data.markets.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1.5"><Label>Address</Label><Input value={address} onChange={(e) => setAddress(e.target.value)} /></div>
      <div className="space-y-1.5"><Label>Nature of work</Label><Input value={natureOfWork} onChange={(e) => setNature(e.target.value)} placeholder="e.g. HVAC repair, Plumbing" /></div>
      <Button
        disabled={!name || !phone || !marketId || !natureOfWork}
        onClick={() => onSave({
          id: initial?.id ?? `ev-${Date.now()}`,
          name: name.trim(), phone: phone.trim(), marketId,
          address: address.trim(), natureOfWork: natureOfWork.trim(),
        })}
      >
        Save
      </Button>
    </div>
  );
}
