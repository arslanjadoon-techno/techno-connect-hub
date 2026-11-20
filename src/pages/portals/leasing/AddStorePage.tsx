import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Store, Hash, Mail, Phone, MapPin, Map, User, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { leasingService, type LeaseRecord } from "@/services/portals/leasing";

interface StoreForm {
  techId: string;
  storeName: string;
  storeEmail: string;
  storePhoneNumber: string;
  storeAddress: string;
  marketName: string;
  marketManager: string;
}

const EMPTY: StoreForm = {
  techId: "",
  storeName: "",
  storeEmail: "",
  storePhoneNumber: "",
  storeAddress: "",
  marketName: "",
  marketManager: "",
};

export default function AddStorePage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<StoreForm>(EMPTY);
  const [saving, setSaving] = useState(false);

  const set = (key: keyof StoreForm, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async () => {
    if (!form.techId.trim()) {
      toast.error("Tech ID is required.");
      return;
    }
    if (!form.storeName.trim()) {
      toast.error("Store name is required.");
      return;
    }
    setSaving(true);
    try {
      const payload: Partial<LeaseRecord> = {
        techId: form.techId.trim().toUpperCase(),
        storeName: form.storeName.trim(),
        storeEmail: form.storeEmail.trim() || null,
        storePhoneNumber: form.storePhoneNumber.trim() || null,
        storeAddress: form.storeAddress.trim() || null,
        marketName: form.marketName.trim() || null,
        marketManager: form.marketManager.trim() || null,
      };
      await leasingService.addStore(payload);
      toast.success("Store added successfully.");
      navigate("/leasing/manage-leasing");
    } catch (error) {
      toast.error(`Failed to add store: ${(error as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl">
      <Card className="p-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Store className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold">New store</h1>
            <p className="text-sm text-muted-foreground">Fill in the details to register a new store</p>
          </div>
        </div>

        <Section title="IDENTITY">
          <Field label="Tech ID" required icon={<Hash className="h-4 w-4" />} value={form.techId} onChange={(v) => set("techId", v)} />
          <Field label="Store name" required icon={<Store className="h-4 w-4" />} value={form.storeName} onChange={(v) => set("storeName", v)} />
          <Field label="Store email" icon={<Mail className="h-4 w-4" />} value={form.storeEmail} onChange={(v) => set("storeEmail", v)} />
          <Field label="Store phone" icon={<Phone className="h-4 w-4" />} value={form.storePhoneNumber} onChange={(v) => set("storePhoneNumber", v)} />
        </Section>

        <Section title="LOCATION">
          <Field label="Store address" full icon={<MapPin className="h-4 w-4" />} value={form.storeAddress} onChange={(v) => set("storeAddress", v)} />
          <Field label="Market" icon={<Map className="h-4 w-4" />} value={form.marketName} onChange={(v) => set("marketName", v)} />
          <Field label="Market Manager" icon={<User className="h-4 w-4" />} value={form.marketManager} onChange={(v) => set("marketManager", v)} />
        </Section>

        <div className="mt-6">
          <Button className="w-full" size="lg" onClick={handleSubmit} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add store"}
          </Button>
        </div>
      </Card>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6 border-t pt-4 first:border-t-0 first:pt-0">
      <h2 className="mb-3 text-xs font-bold tracking-wide text-muted-foreground">{title}</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </div>
  );
}

function Field({ label, value, onChange, icon, required, full }: { label: string; value: string; onChange: (v: string) => void; icon?: React.ReactNode; required?: boolean; full?: boolean }) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <label className="mb-1 block text-xs text-muted-foreground">
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </label>
      <div className="relative">
        {icon && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{icon}</span>}
        <Input value={value} onChange={(e) => onChange(e.target.value)} className={icon ? "pl-9" : ""} />
      </div>
    </div>
  );
}
