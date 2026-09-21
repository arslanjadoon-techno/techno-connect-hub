import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Bookmark, Trash2, FolderOpen, ChevronRight, ChevronLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { leasingService, type ReportTemplate } from "@/services/portals/leasing";
import { exportToExcel } from "@/lib/excel-export";

interface Field {
  key: string;
  label: string;
  group: string;
}

const ALL_FIELDS: Field[] = [
  { key: "techId", label: "Tech ID", group: "General" },
  { key: "storeName", label: "Store Name", group: "General" },
  { key: "marketName", label: "Market", group: "General" },
  { key: "tier", label: "Tier", group: "General" },
  { key: "lease_Term", label: "Lease Term", group: "General" },
  { key: "start_Date", label: "Start Date", group: "General" },
  { key: "expiry_Due", label: "Expiry Date", group: "General" },
  { key: "assignmentDate", label: "Assignment Date", group: "General" },
  { key: "takeOverDate", label: "Take Over Date", group: "General" },
  { key: "commencementDateRent", label: "Commencement Date Rent", group: "General" },
  { key: "marketManager", label: "Market Manager", group: "General" },
  { key: "leaseSignedBy", label: "Lease Signed By", group: "General" },
  { key: "entityName", label: "Entity Name", group: "General" },
  { key: "storeEmail", label: "Store Email", group: "General" },
  { key: "storePhoneNumber", label: "Store Phone Number", group: "General" },
  { key: "storeAddress", label: "Store Address", group: "General" },
  { key: "leaseStatus", label: "Lease Status", group: "General" },
  { key: "securityDeposit", label: "Security Deposit", group: "Agreement" },
  { key: "hvac", label: "HVAC", group: "Agreement" },
  { key: "exclusivity", label: "Exclusivity", group: "Agreement" },
  { key: "termination", label: "Termination", group: "Agreement" },
  { key: "relocation", label: "Relocation", group: "Agreement" },
  { key: "rightToSublease", label: "Right to Sublease", group: "Agreement" },
  { key: "optionPeriodDuration", label: "Option Period Duration", group: "Agreement" },
  { key: "noticePeriodBeforeTermination", label: "Notice Period before Termination", group: "Agreement" },
  { key: "optionNoticeDate", label: "Option Notice Date", group: "Agreement" },
  { key: "subLease", label: "Sub Lease", group: "Agreement" },
  { key: "guarantor", label: "Guarantor", group: "Agreement" },
  { key: "guarantyType", label: "Guaranty Type", group: "Agreement" },
  { key: "rightToTermination", label: "Right to Termination", group: "Agreement" },
  { key: "landLordName", label: "Landlord Name", group: "Landlord" },
  { key: "landLordPointOfContact", label: "Point of Contact", group: "Landlord" },
  { key: "landLordContactNumber", label: "Phone Number", group: "Landlord" },
  { key: "landLordEmail", label: "Landlord Email", group: "Landlord" },
  { key: "landLordAddress", label: "Landlord Address", group: "Landlord" },
  { key: "landLordIndividualOrCompany", label: "Landlord Individual/Company", group: "Landlord" },
  { key: "ownerAccountNumber", label: "Account Number", group: "Owner Account" },
  { key: "ownerRoutingNumber", label: "Routing Number", group: "Owner Account" },
  { key: "ownerAccountTitle", label: "Account Title", group: "Owner Account" },
  { key: "ownerPaymentMode", label: "Payment Mode", group: "Owner Account" },
  { key: "ownerBankName", label: "Owner Bank Name", group: "Owner Account" },
  { key: "ownerCheckAddress", label: "Check Address", group: "Owner Account" },
  { key: "landLordRemarks", label: "Remarks", group: "Owner Account" },
  { key: "propertyMgtName", label: "Property Management Name", group: "Property Management" },
  { key: "propertyMgtPointOfContact", label: "Point of Contact", group: "Property Management" },
  { key: "propertyMgtEmail", label: "Property Mgt Email", group: "Property Management" },
  { key: "propertyMgtPhoneNumber", label: "Property Mgt Phone", group: "Property Management" },
  { key: "propertyMgtAddress", label: "Property Mgt Address", group: "Property Management" },
];

const LABEL_MAP = Object.fromEntries(ALL_FIELDS.map((f) => [f.key, f.label]));
const GROUPS = [...new Set(ALL_FIELDS.map((f) => f.group))];

function formatTermination(v: unknown): string {
  if (v === true || v === "true") return "Allowed";
  if (v === false || v === "false") return "Not Allowed";
  return (v as string) || "";
}

export default function ReportsPage() {
  const [available, setAvailable] = useState<Field[]>(ALL_FIELDS);
  const [selected, setSelected] = useState<Field[]>([]);
  const [hlLeft, setHlLeft] = useState<Set<string>>(new Set());
  const [hlRight, setHlRight] = useState<Set<string>>(new Set());
  const [filterGroup, setFilterGroup] = useState("All");
  const [fieldSearch, setFieldSearch] = useState("");
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [templateName, setTemplateName] = useState("");
  const [downloadingId, setDownloadingId] = useState<string | number | null>(null);
  const [saving, setSaving] = useState(false);
  const [templatesLoading, setTemplatesLoading] = useState(true);

  useEffect(() => {
    leasingService
      .getReportTemplates()
      .then(setTemplates)
      .catch(() => setTemplates([]))
      .finally(() => setTemplatesLoading(false));
  }, []);

  const toggleHl = (key: string, side: "left" | "right") => {
    const setter = side === "left" ? setHlLeft : setHlRight;
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const moveRight = () => {
    if (!hlLeft.size) return;
    const moving = available.filter((f) => hlLeft.has(f.key));
    setAvailable((a) => a.filter((f) => !hlLeft.has(f.key)));
    setSelected((s) => [...s, ...moving]);
    setHlLeft(new Set());
  };

  const moveLeft = () => {
    if (!hlRight.size) return;
    const returning = selected.filter((f) => hlRight.has(f.key));
    setSelected((s) => s.filter((f) => !hlRight.has(f.key)));
    setAvailable((a) => [...a, ...returning]);
    setHlRight(new Set());
  };

  const runDownload = async (fieldKeys: string[], fileName: string, dlId: string | number) => {
    if (!fieldKeys.length) {
      toast.error("Select at least one field.");
      return;
    }
    setDownloadingId(dlId);
    try {
      const rows = await leasingService.getAllLeasing();
      const data = rows.map((row) => ({ ...row, termination: formatTermination(row.termination) }));
      exportToExcel(data as unknown as Record<string, unknown>[], fieldKeys, LABEL_MAP, {
        sheetName: "Leasing Report",
        fileName,
      });
    } catch (e) {
      toast.error(`Download failed: ${(e as Error).message}`);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleSave = async () => {
    const name = templateName.trim();
    if (!name) {
      toast.error("Enter a template name.");
      return;
    }
    if (!selected.length) {
      toast.error("Select at least one field first.");
      return;
    }
    setSaving(true);
    try {
      await leasingService.saveReportTemplate(name, selected.map((f) => f.key));
      toast.success("Template saved.");
      setTemplateName("");
      const refreshed = await leasingService.getReportTemplates();
      setTemplates(refreshed);
    } catch (e) {
      toast.error(`Save failed: ${(e as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleLoadTemplate = (tpl: ReportTemplate) => {
    const keySet = new Set(tpl.fields);
    const ordered = tpl.fields.map((k) => ALL_FIELDS.find((f) => f.key === k)).filter((f): f is Field => Boolean(f));
    setSelected(ordered);
    setAvailable(ALL_FIELDS.filter((f) => !keySet.has(f.key)));
    setHlLeft(new Set());
    setHlRight(new Set());
  };

  const handleDelete = async (id?: number) => {
    if (id == null) return;
    try {
      await leasingService.deleteReportTemplate(id);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      toast.success("Template deleted.");
    } catch (e) {
      toast.error(`Delete failed: ${(e as Error).message}`);
    }
  };

  const visibleAvailable = useMemo(
    () =>
      available
        .filter((f) => filterGroup === "All" || f.group === filterGroup)
        .filter((f) => !fieldSearch.trim() || f.label.toLowerCase().includes(fieldSearch.trim().toLowerCase())),
    [available, filterGroup, fieldSearch],
  );

  return (
    <div className="w-full space-y-4 animate-fade-in pb-8">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <FileText className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-display text-xl font-semibold">Custom Report Builder</h1>
          <p className="text-sm text-muted-foreground">
            Choose the fields you want to include, then download or save as a reusable template.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {["All", ...GROUPS].map((g) => (
          <button
            key={g}
            onClick={() => setFilterGroup(g)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
              filterGroup === g ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-muted"
            }`}
          >
            {g}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-3">
        <Card className="flex flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b px-3 py-2 text-sm font-semibold">
            Available Fields <Badge variant="outline">{visibleAvailable.length}</Badge>
          </div>
          <div className="p-2">
            <Input value={fieldSearch} onChange={(e) => setFieldSearch(e.target.value)} placeholder="Search fields..." className="h-8" />
          </div>
          <div className="max-h-80 overflow-y-auto px-2 pb-2">
            {visibleAvailable.length === 0 ? (
              <p className="p-3 text-xs italic text-muted-foreground">All fields in this group are selected.</p>
            ) : (
              visibleAvailable.map((f) => (
                <div
                  key={f.key}
                  onClick={() => toggleHl(f.key, "left")}
                  className={`flex cursor-pointer items-center justify-between rounded-md px-2 py-1.5 text-sm ${
                    hlLeft.has(f.key) ? "bg-primary/10 text-primary" : "hover:bg-muted"
                  }`}
                >
                  <span>{f.label}</span>
                  <span className="text-[10px] text-muted-foreground">{f.group}</span>
                </div>
              ))
            )}
          </div>
        </Card>

        <div className="flex flex-col items-center justify-center gap-2">
          <Button size="icon" variant="outline" onClick={moveRight} disabled={!hlLeft.size} title="Add to report">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="outline" onClick={moveLeft} disabled={!hlRight.size} title="Remove from report">
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>

        <Card className="flex flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b px-3 py-2 text-sm font-semibold">
            Report Fields <Badge variant={selected.length ? "default" : "outline"}>{selected.length}</Badge>
          </div>
          <div className="max-h-80 overflow-y-auto p-2">
            {selected.length === 0 ? (
              <p className="p-3 text-xs italic text-muted-foreground">Highlight fields on the left and press the arrow to add them.</p>
            ) : (
              selected.map((f) => (
                <div
                  key={f.key}
                  onClick={() => toggleHl(f.key, "right")}
                  className={`flex cursor-pointer items-center justify-between rounded-md px-2 py-1.5 text-sm ${
                    hlRight.has(f.key) ? "bg-primary/10 text-primary" : "hover:bg-muted"
                  }`}
                >
                  <span>{f.label}</span>
                  <span className="text-[10px] text-muted-foreground">{f.group}</span>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <Card className="flex flex-wrap items-center justify-between gap-3 p-3">
        <div className="flex gap-2">
          <Input
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            placeholder="Template name..."
            className="h-9 w-56"
          />
          <Button variant="outline" size="sm" onClick={handleSave} disabled={saving}>
            <Bookmark className="mr-1.5 h-4 w-4" /> {saving ? "Saving..." : "Save Template"}
          </Button>
        </div>
        <Button
          size="sm"
          disabled={downloadingId !== null || !selected.length}
          onClick={() => runDownload(selected.map((f) => f.key), "Custom_Report", "current")}
        >
          {downloadingId === "current" ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Download className="mr-1.5 h-4 w-4" />}
          {downloadingId === "current" ? "Downloading..." : "Download Report"}
        </Button>
      </Card>

      <Card className="p-3">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
          Saved Templates
          {templatesLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
        </div>
        {!templatesLoading && templates.length === 0 && (
          <p className="text-sm text-muted-foreground">No saved templates yet. Build a report above and click Save Template.</p>
        )}
        {templates.length > 0 && (
          <div className="divide-y">
            {templates.map((t) => (
              <div key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <div className="flex items-center gap-3">
                  <span className="font-medium">{t.name}</span>
                  <Badge variant="outline">{t.fields.length} fields</Badge>
                </div>
                <div className="flex gap-1.5">
                  <Button size="sm" variant="ghost" onClick={() => handleLoadTemplate(t)}>
                    <FolderOpen className="mr-1 h-3.5 w-3.5" /> Load
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={downloadingId !== null}
                    onClick={() => runDownload(t.fields, t.name, t.id ?? t.name)}
                  >
                    {downloadingId === (t.id ?? t.name) ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="mr-1 h-3.5 w-3.5" />}
                    Download
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(t.id)}>
                    <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
