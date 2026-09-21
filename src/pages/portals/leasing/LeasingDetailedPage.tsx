import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Pencil, Check, Loader2, Trash2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import {
  leasingService,
  type LeaseRecord,
  type LeaseRentAgreement,
} from "@/services/portals/leasing";
import { storesService } from "@/services/user-manager/stores.service";
import type { Store } from "@/lib/api/client";
import EditableField from "./components/EditableField";

const ENTITY_OPTIONS = [
  "Texas Mobile PCS LLC", "Techno CA LLC", "Techno Communications LLC", "Active Wireless",
  "MDH Estates LLC", "MDY Estates LLC", "Techno Oklahoma", "Techno GA LLC",
  "Techno Kentucky", "Techno Portland", "Techno Florida", "TMDH WIRELESS LLC",
];
const LEASE_TYPE_OPTIONS = ["Month to Month", "Master Lease", "Assignment", "Extension/Amendment", "Option Period"];
const PAYMENT_MODE_OPTIONS = ["CORP PAY", "AUTO DEBIT", "PORTAL PAYMENT", "CHECK PAYMENT", "WIRE TRANSFER", "Hold", "COMPENSATION", "PENDING"];
const YES_NO_UNKNOWN = ["Allowed", "Not Allowed", "Not Found"];
const GUARANTY_TYPE_OPTIONS = ["Personal Guarantor", "Corporate Guarantor", "No Guarantor"];

const AGREEMENT_TOTAL = (a: { monthlyRent?: number | null; camCharges?: number | null; otherCharges?: number | null }) =>
  (Number(a.monthlyRent) || 0) + (Number(a.camCharges) || 0) + (Number(a.otherCharges) || 0);

const money = (v?: number | null) => (v == null || Number.isNaN(Number(v)) ? "—" : Number(v).toFixed(2));

function statusTone(status?: string | null): string {
  if (status === "Active") return "border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400";
  if (status === "InActive") return "border-border bg-muted text-muted-foreground";
  if (status === "Door Closure") return "border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400";
  return "border-border bg-muted text-muted-foreground";
}

function yesNoTone(v?: string | null): string {
  if (v === "Allowed" || v === "Yes") return "border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400";
  if (v === "Not Allowed" || v === "No") return "border-destructive/30 bg-destructive/10 text-destructive";
  return "border-border bg-muted text-muted-foreground";
}

export default function LeasingDetailedPage() {
  const { techId } = useParams<{ techId: string }>();
  const navigate = useNavigate();

  const [allLeases, setAllLeases] = useState<LeaseRecord[]>([]);
  const [store, setStore] = useState<Store | null>(null);
  const [agreements, setAgreements] = useState<LeaseRentAgreement[]>([]);
  const [remarks, setRemarks] = useState("");
  const [pageLoading, setPageLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<LeaseRecord | null>(null);
  const [saving, setSaving] = useState(false);

  const [agreementEditKey, setAgreementEditKey] = useState<string | null>(null);
  const [agreementForm, setAgreementForm] = useState<Partial<LeaseRentAgreement>>({});
  const [addingAgreement, setAddingAgreement] = useState(false);
  const [newAgreement, setNewAgreement] = useState({ monthlyRent: "", camCharges: "", otherCharges: "", startDate: "", endDate: "", comments: "" });
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [savingRemarks, setSavingRemarks] = useState(false);

  const leaseData = useMemo(() => allLeases.find((l) => l.techId === techId) ?? null, [allLeases, techId]);

  const loadAgreements = useCallback(async () => {
    if (!techId) return;
    try {
      const data = await leasingService.getLeaseRentAgreementByTechId(techId);
      setAgreements(data.filter((a) => a.techId === techId));
    } catch (error) {
      console.error("Error loading agreements:", error);
    }
  }, [techId]);

  useEffect(() => {
    if (!techId) return;
    let active = true;
    (async () => {
      setPageLoading(true);
      try {
        const [leases, storesRes, remarkRows] = await Promise.all([
          leasingService.getAllLeasing(),
          storesService.getAll({ size: 2000 }),
          leasingService.getLeaseExpirationRemarks(techId),
        ]);
        if (!active) return;
        setAllLeases(leases);
        const matchedStore = storesRes.data?.find((s) => s.techId === techId) ?? null;
        setStore(matchedStore);
        const firstRemark = remarkRows[0] as Record<string, unknown> | undefined;
        setRemarks((firstRemark?.remarks as string) ?? (firstRemark?.remark as string) ?? "");
      } catch (error) {
        console.error("Error loading lease detail:", error);
        toast.error("Failed to load lease details");
      } finally {
        if (active) setPageLoading(false);
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [techId]);

  useEffect(() => {
    loadAgreements();
  }, [loadAgreements]);

  useEffect(() => {
    if (leaseData) setFormData({ ...leaseData });
  }, [leaseData]);

  const set = (key: keyof LeaseRecord, value: unknown) => setFormData((f) => (f ? { ...f, [key]: value } : f));

  const daysLeft = leaseData?.expiry_Due
    ? Math.floor((new Date(leaseData.expiry_Due).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const handleSave = async () => {
    if (!formData || !leaseData) return;
    setSaving(true);
    try {
      const payload: LeaseRecord = {
        ...formData,
        techId: leaseData.techId,
        storeName: store?.name ?? formData.storeName,
        marketName: formData.marketName,
        contactNumber: store?.phone ?? formData.contactNumber,
        start_Date: formData.start_Date?.trim() === "" ? null : formData.start_Date,
        expiry_Due: formData.expiry_Due?.trim() === "" ? null : formData.expiry_Due,
        assignmentDate: formData.assignmentDate?.trim() === "" ? null : formData.assignmentDate,
        takeOverDate: formData.takeOverDate?.trim() === "" ? null : formData.takeOverDate,
        commencementDateRent: formData.commencementDateRent?.trim() === "" ? null : formData.commencementDateRent,
        optionNoticeDate: formData.optionNoticeDate?.trim() === "" ? null : formData.optionNoticeDate,
        isDeleted: false,
      };
      await leasingService.postLeasingInfo(payload);
      setAllLeases((prev) => prev.map((l) => (l.techId === techId ? { ...l, ...payload } : l)));
      toast.success("Leasing data updated successfully!");
      setIsEditing(false);
    } catch (error) {
      toast.error(`Error occurred: ${(error as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  const startAgreementEdit = (a: LeaseRentAgreement) => {
    setAgreementEditKey(`${a.techId}-${a.startDate}`);
    setAgreementForm({ ...a });
  };

  const saveAgreementEdit = async () => {
    try {
      await leasingService.updateLeaseRentAgreement(agreementForm);
      toast.success("Agreement updated.");
      setAgreementEditKey(null);
      loadAgreements();
    } catch (error) {
      toast.error(`Failed to save: ${(error as Error).message}`);
    }
  };

  const deleteAgreement = async (a: LeaseRentAgreement) => {
    const key = `${a.techId}-${a.startDate}`;
    if (!window.confirm("Are you sure you want to delete this record?")) return;
    setDeletingKey(key);
    try {
      await leasingService.deleteLeaseRentAgreement({ TechID: a.techId, StartDate: a.startDate, EndDate: a.endDate });
      toast.success("Agreement deleted.");
      loadAgreements();
    } catch (error) {
      toast.error(`Delete failed: ${(error as Error).message}`);
    } finally {
      setDeletingKey(null);
    }
  };

  const submitNewAgreement = async () => {
    if (!techId || !newAgreement.startDate || !newAgreement.endDate) {
      toast.error("Start date and end date are required.");
      return;
    }
    try {
      await leasingService.insertLeaseRentAgreement({ techId, ...newAgreement });
      toast.success("Lease agreement has been successfully recorded.");
      setAddingAgreement(false);
      setNewAgreement({ monthlyRent: "", camCharges: "", otherCharges: "", startDate: "", endDate: "", comments: "" });
      loadAgreements();
    } catch (error) {
      toast.error(`Error occurred: ${(error as Error).message}`);
    }
  };

  const saveRemarks = async () => {
    if (!techId) return;
    setSavingRemarks(true);
    try {
      await leasingService.saveLeaseExpirationRemarks({ techId, remarks });
      toast.success("Remarks saved.");
    } catch (error) {
      toast.error(`Failed to save remarks: ${(error as Error).message}`);
    } finally {
      setSavingRemarks(false);
    }
  };

  if (pageLoading || !formData) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm">Loading lease details...</p>
      </div>
    );
  }

  if (!leaseData) {
    return (
      <div className="py-20 text-center text-muted-foreground">
        <p>No lease record found for {techId}.</p>
        <Button variant="outline" className="mt-3" onClick={() => navigate(-1)}>Go back</Button>
      </div>
    );
  }

  const f = isEditing ? formData : leaseData;

  return (
    <div className="w-full space-y-4 animate-fade-in pb-8">
      <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4" />
      </Button>

      {/* Hero */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold">{leaseData.storeName}</h1>
              {leaseData.tier && <Badge className="uppercase">{leaseData.tier}</Badge>}
              <span className="text-sm font-medium text-muted-foreground">{leaseData.techId}</span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {leaseData.marketName} &bull; {store?.address ?? "—"}
            </p>
            {daysLeft !== null && (
              <Badge variant="outline" className={`mt-2 ${yesNoTone(daysLeft < 0 ? "Not Allowed" : daysLeft <= 45 ? "" : "Allowed")}`}>
                Lease expiring in {daysLeft} days
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className={isEditing ? "text-destructive" : ""}
              onClick={() => {
                if (isEditing && leaseData) setFormData({ ...leaseData });
                setIsEditing((v) => !v);
              }}
            >
              {isEditing ? <X className="mr-1.5 h-4 w-4" /> : <Pencil className="mr-1.5 h-4 w-4" />}
              {isEditing ? "Cancel" : "Edit"}
            </Button>
            {isEditing && (
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Check className="mr-1.5 h-4 w-4" />}
                Save Changes
              </Button>
            )}
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* General Information */}
        <Card className="p-4 lg:col-span-2">
          <h2 className="mb-3 text-base font-bold">General Information</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <EditableField label="Lease Start Date" value={f.start_Date ?? ""} editing={isEditing} type="date" onChange={(v) => set("start_Date", v)} />
            <EditableField label="Lease Expiry Date" value={f.expiry_Due ?? ""} editing={isEditing} type="date" onChange={(v) => set("expiry_Due", v)} />
            <EditableField label="Assignment Date" value={f.assignmentDate ?? ""} editing={isEditing} type="date" onChange={(v) => set("assignmentDate", v)} />
            <EditableField label="Take Over Date" value={f.takeOverDate ?? ""} editing={isEditing} type="date" onChange={(v) => set("takeOverDate", v)} />
            <EditableField label="Rent Commencement Date" value={f.commencementDateRent ?? ""} editing={isEditing} type="date" onChange={(v) => set("commencementDateRent", v)} />
            <EditableField label="Lease Type" value={f.lease_Term ?? ""} editing={isEditing} type="select" options={LEASE_TYPE_OPTIONS} onChange={(v) => set("lease_Term", v)} />
            <EditableField label="Tenant / Entity Name" value={f.entityName ?? ""} editing={isEditing} type="select" options={ENTITY_OPTIONS} onChange={(v) => set("entityName", v)} />
            <EditableField label="Lease Signed By" value={f.leaseSignedBy ?? ""} editing={isEditing} onChange={(v) => set("leaseSignedBy", v)} />
            <EditableField label="Market Manager" value={f.marketManager ?? ""} editing={isEditing} onChange={(v) => set("marketManager", v)} />
            <EditableField label="Store Email" value={store?.email ?? ""} editing={false} />
            <EditableField label="Store Number" value={store?.phone ?? ""} editing={false} />
            <EditableField label="Store Full Address" value={store?.address ?? ""} editing={false} />
            <EditableField label="Tier" value={leaseData.tier ?? ""} editing={false} />
            <EditableField
              label="Lease Status"
              value={f.leaseStatus ?? ""}
              editing={isEditing}
              type="select"
              options={["Active", "InActive", "Door Closure"]}
              onChange={(v) => set("leaseStatus", v)}
              badgeTone={!isEditing ? statusTone(leaseData.leaseStatus) : undefined}
              displayValue={!isEditing ? (leaseData.leaseStatus || "Not Set") : undefined}
            />
          </div>
        </Card>

        {/* Remarks */}
        <Card className="p-4">
          <h2 className="mb-3 text-base font-bold">Lease Expiration Remarks</h2>
          <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={6} placeholder="Add remarks about this lease's expiration..." />
          <Button size="sm" className="mt-2" onClick={saveRemarks} disabled={savingRemarks}>
            {savingRemarks ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Remarks"}
          </Button>
        </Card>
      </div>

      {/* Landlord Information */}
      <Card className="p-4">
        <h2 className="mb-3 text-base font-bold">Landlord Information</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <EditableField label="Landlord Name" value={f.landLordName ?? ""} editing={isEditing} onChange={(v) => set("landLordName", v)} />
          <EditableField label="Point of Contact" value={f.landLordPointOfContact ?? ""} editing={isEditing} onChange={(v) => set("landLordPointOfContact", v)} />
          <EditableField label="Phone Number" value={f.landLordContactNumber ?? ""} editing={isEditing} onChange={(v) => set("landLordContactNumber", v)} />
          <EditableField label="Email" value={f.landLordEmail ?? ""} editing={isEditing} type="email" onChange={(v) => set("landLordEmail", v)} />
          <EditableField label="Address" value={f.landLordAddress ?? ""} editing={isEditing} type="textarea" onChange={(v) => set("landLordAddress", v)} />
        </div>
      </Card>

      {/* Property Management Information */}
      <Card className="p-4">
        <h2 className="mb-3 text-base font-bold">Property Management Information</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <EditableField label="Property Management Name" value={f.propertyMgtName ?? ""} editing={isEditing} onChange={(v) => set("propertyMgtName", v)} />
          <EditableField label="Point of Contact" value={f.propertyMgtPointOfContact ?? ""} editing={isEditing} onChange={(v) => set("propertyMgtPointOfContact", v)} />
          <EditableField label="Email" value={f.propertyMgtEmail ?? ""} editing={isEditing} type="email" onChange={(v) => set("propertyMgtEmail", v)} />
          <EditableField label="Phone Number" value={f.propertyMgtPhoneNumber ?? ""} editing={isEditing} onChange={(v) => set("propertyMgtPhoneNumber", v)} />
          <EditableField label="Address" value={f.propertyMgtAddress ?? ""} editing={isEditing} type="textarea" onChange={(v) => set("propertyMgtAddress", v)} />
        </div>
      </Card>

      {/* Landlord Billing Details */}
      <Card className="p-4">
        <h2 className="mb-3 text-base font-bold">Landlord Billing Details</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <EditableField label="Bank Name" value={f.ownerBankName ?? ""} editing={isEditing} onChange={(v) => set("ownerBankName", v)} />
          <EditableField label="Account Title" value={f.ownerAccountTitle ?? ""} editing={isEditing} onChange={(v) => set("ownerAccountTitle", v)} />
          <EditableField label="Routing Number" value={f.ownerRoutingNumber ?? ""} editing={isEditing} onChange={(v) => set("ownerRoutingNumber", v)} />
          <EditableField label="Account Number" value={f.ownerAccountNumber ?? ""} editing={isEditing} onChange={(v) => set("ownerAccountNumber", v)} />
          <EditableField label="Billing / Cheque Address" value={f.ownerCheckAddress ?? ""} editing={isEditing} type="textarea" onChange={(v) => set("ownerCheckAddress", v)} />
          <EditableField label="Payment Mode" value={f.ownerPaymentMode ?? ""} editing={isEditing} type="select" options={PAYMENT_MODE_OPTIONS} onChange={(v) => set("ownerPaymentMode", v)} />
          <EditableField label="Remarks" value={f.landLordRemarks ?? ""} editing={isEditing} type="textarea" colSpan="sm:col-span-2" onChange={(v) => set("landLordRemarks", v)} />
        </div>
      </Card>

      {/* Financial Details - Rent Agreements */}
      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold">Lease Agreement &mdash; Financial Details</h2>
          <Button size="sm" variant="outline" onClick={() => setAddingAgreement(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> Add Agreement
          </Button>
        </div>

        {addingAgreement && (
          <Card className="mb-3 grid grid-cols-2 gap-2 p-3 sm:grid-cols-3 lg:grid-cols-6">
            <EditableField label="Monthly Rent" value={newAgreement.monthlyRent} editing type="number" onChange={(v) => setNewAgreement((a) => ({ ...a, monthlyRent: v }))} />
            <EditableField label="CAM Charges" value={newAgreement.camCharges} editing type="number" onChange={(v) => setNewAgreement((a) => ({ ...a, camCharges: v }))} />
            <EditableField label="Other Charges" value={newAgreement.otherCharges} editing type="number" onChange={(v) => setNewAgreement((a) => ({ ...a, otherCharges: v }))} />
            <EditableField label="Start Date" value={newAgreement.startDate} editing type="date" onChange={(v) => setNewAgreement((a) => ({ ...a, startDate: v }))} />
            <EditableField label="End Date" value={newAgreement.endDate} editing type="date" onChange={(v) => setNewAgreement((a) => ({ ...a, endDate: v }))} />
            <EditableField label="Comments" value={newAgreement.comments} editing onChange={(v) => setNewAgreement((a) => ({ ...a, comments: v }))} />
            <div className="col-span-full flex gap-2">
              <Button size="sm" onClick={submitNewAgreement}>Save</Button>
              <Button size="sm" variant="outline" onClick={() => setAddingAgreement(false)}>Cancel</Button>
            </div>
          </Card>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                {["Monthly Rent", "CAM Charges", "Other Charges", "Total", "Start Date", "End Date", "Comments", ""].map((h) => (
                  <th key={h} className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {agreements.length === 0 ? (
                <tr><td colSpan={8} className="py-8 text-center text-sm text-muted-foreground">No records added yet.</td></tr>
              ) : (
                agreements.map((a) => {
                  const key = `${a.techId}-${a.startDate}`;
                  const editing = agreementEditKey === key;
                  return (
                    <tr key={key} className="hover:bg-muted/30">
                      {editing ? (
                        <>
                          <td className="px-3 py-1.5"><input type="number" className="h-8 w-24 rounded border border-input px-2 text-sm" value={agreementForm.monthlyRent ?? ""} onChange={(e) => setAgreementForm((p) => ({ ...p, monthlyRent: Number(e.target.value) }))} /></td>
                          <td className="px-3 py-1.5"><input type="number" className="h-8 w-24 rounded border border-input px-2 text-sm" value={agreementForm.camCharges ?? ""} onChange={(e) => setAgreementForm((p) => ({ ...p, camCharges: Number(e.target.value) }))} /></td>
                          <td className="px-3 py-1.5"><input type="number" className="h-8 w-24 rounded border border-input px-2 text-sm" value={agreementForm.otherCharges ?? ""} onChange={(e) => setAgreementForm((p) => ({ ...p, otherCharges: Number(e.target.value) }))} /></td>
                          <td className="px-3 py-1.5">{money(AGREEMENT_TOTAL(agreementForm))}</td>
                          <td className="px-3 py-1.5"><input type="date" className="h-8 w-36 rounded border border-input px-2 text-sm" value={agreementForm.startDate?.slice(0, 10) ?? ""} onChange={(e) => setAgreementForm((p) => ({ ...p, startDate: e.target.value }))} /></td>
                          <td className="px-3 py-1.5"><input type="date" className="h-8 w-36 rounded border border-input px-2 text-sm" value={agreementForm.endDate?.slice(0, 10) ?? ""} onChange={(e) => setAgreementForm((p) => ({ ...p, endDate: e.target.value }))} /></td>
                          <td className="px-3 py-1.5"><input className="h-8 w-full rounded border border-input px-2 text-sm" value={(agreementForm.comments as string) ?? ""} onChange={(e) => setAgreementForm((p) => ({ ...p, comments: e.target.value }))} /></td>
                          <td className="px-3 py-1.5">
                            <div className="flex gap-1">
                              <Button size="icon" variant="outline" className="h-7 w-7 text-emerald-600" onClick={saveAgreementEdit}><Check className="h-3.5 w-3.5" /></Button>
                              <Button size="icon" variant="outline" className="h-7 w-7 text-destructive" onClick={() => setAgreementEditKey(null)}><X className="h-3.5 w-3.5" /></Button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-3 py-2">{money(a.monthlyRent)}</td>
                          <td className="px-3 py-2">{money(a.camCharges)}</td>
                          <td className="px-3 py-2">{money(a.otherCharges)}</td>
                          <td className="px-3 py-2 font-medium">{money(AGREEMENT_TOTAL(a))}</td>
                          <td className="px-3 py-2">{a.startDate?.split("T")[0] || "—"}</td>
                          <td className="px-3 py-2">{a.endDate?.split("T")[0] || "—"}</td>
                          <td className="max-w-[20ch] whitespace-normal break-words px-3 py-2">{(a.comments as string) || "—"}</td>
                          <td className="px-3 py-2">
                            <div className="flex gap-1">
                              <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => startAgreementEdit(a)}><Pencil className="h-3.5 w-3.5" /></Button>
                              <Button size="icon" variant="outline" className="h-7 w-7 text-destructive" onClick={() => deleteAgreement(a)} disabled={deletingKey === key}>
                                {deletingKey === key ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                              </Button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Agreement Clauses */}
      <Card className="p-4">
        <h2 className="mb-3 text-base font-bold">Agreement Clauses</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <EditableField
            label="HVAC" value={f.hvac ?? ""} editing={isEditing} type="select"
            options={["Tenants Responsibility", "Landlord Responsibility", "Not Found"]}
            onChange={(v) => set("hvac", v)}
            badgeTone={!isEditing ? yesNoTone(leaseData.hvac) : undefined}
            displayValue={!isEditing ? (leaseData.hvac || "Not Found") : undefined}
          />
          <EditableField
            label="Exclusivity" value={f.exclusivity ?? ""} editing={isEditing} type="select" options={["Yes", "No", "Not Found"]}
            onChange={(v) => set("exclusivity", v)}
            badgeTone={!isEditing ? yesNoTone(leaseData.exclusivity) : undefined}
            displayValue={!isEditing ? (leaseData.exclusivity || "Not Found") : undefined}
          />
          <EditableField
            label="Termination" value={f.termination ?? ""} editing={isEditing} type="select" options={YES_NO_UNKNOWN}
            onChange={(v) => set("termination", v)}
            badgeTone={!isEditing ? yesNoTone(leaseData.termination) : undefined}
            displayValue={!isEditing ? (leaseData.termination || "Not Found") : undefined}
          />
          <EditableField label="Notice Period before Termination" value={f.noticePeriodBeforeTermination ?? ""} editing={isEditing} onChange={(v) => set("noticePeriodBeforeTermination", v)} />
          <EditableField
            label="Right to Sublease" value={f.rightToSublease ?? ""} editing={isEditing} type="select" options={YES_NO_UNKNOWN}
            onChange={(v) => set("rightToSublease", v)}
            badgeTone={!isEditing ? yesNoTone(leaseData.rightToSublease) : undefined}
          />
          <EditableField label="Sub Lease" value={f.subLease ?? ""} editing={isEditing} onChange={(v) => set("subLease", v)} />
          <EditableField
            label="Option Period" value={f.optionPeriod === true ? "Yes" : f.optionPeriod === false ? "No" : ""} editing={isEditing} type="select" options={["Yes", "No"]}
            onChange={(v) => set("optionPeriod", v === "Yes")}
          />
          <EditableField label="Option Period Duration" value={f.optionPeriodDuration ?? ""} editing={isEditing} onChange={(v) => set("optionPeriodDuration", v)} />
          <EditableField label="Option Notice Date" value={f.optionNoticeDate ?? ""} editing={isEditing} type="date" onChange={(v) => set("optionNoticeDate", v)} />
          <EditableField label="Guarantor" value={f.guarantor ?? ""} editing={isEditing} onChange={(v) => set("guarantor", v)} />
          <EditableField label="Guaranty Type" value={f.guarantyType ?? ""} editing={isEditing} type="select" options={GUARANTY_TYPE_OPTIONS} onChange={(v) => set("guarantyType", v)} />
          <EditableField
            label="Relocation" value={f.relocation ?? ""} editing={isEditing} type="select" options={YES_NO_UNKNOWN}
            onChange={(v) => set("relocation", v)}
            badgeTone={!isEditing ? yesNoTone(leaseData.relocation) : undefined}
            displayValue={!isEditing ? (leaseData.relocation || "Not Found") : undefined}
          />
          <EditableField label="Security Deposit" value={String(f.securityDeposit ?? "")} editing={isEditing} type="number" onChange={(v) => set("securityDeposit", Number(v))} />
        </div>
      </Card>

      {/* Deferred sub-features */}
      <Card className="p-4 text-sm text-muted-foreground">
        Monthly billing activity, document attachments, and the missing-documents checklist for this lease
        aren't migrated yet &mdash; each is a substantial subsystem (file upload/storage, activity log) in its
        own right. Flagging rather than faking them.
      </Card>
    </div>
  );
}
