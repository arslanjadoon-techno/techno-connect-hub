import { useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { DataTable, type Column } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Eye,
  Video,
  Store as StoreIcon,
  Clock,
  Printer,
  FileText,
  Paperclip,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Image as ImageIcon,
  DollarSign,
  User as UserIcon,
  UploadCloud,
  X,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import {
  INITIAL_SURVEILLANCE_REQUESTS,
  INITIAL_SURVEILLANCE_REPORTS,
} from "./surveillance-data";
import {
  getSurveillanceRole,
  type SurveillanceReport,
  type SurveillanceRequest,
  type SurveillanceAttachment,
  type SurveillanceRole,
} from "@/services/portals/surveillance/types";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function SurveillanceReportsPage() {
  const { user } = useAuth();
  const detectedRole = useMemo(() => getSurveillanceRole(user), [user]);

  // Role simulation state (allows testing both as User who submits and Managers who review)
  const [activeRole, setActiveRole] = useState<SurveillanceRole>(detectedRole);

  const [requests] = useState<SurveillanceRequest[]>(INITIAL_SURVEILLANCE_REQUESTS);
  const [reports, setReports] = useState<SurveillanceReport[]>(INITIAL_SURVEILLANCE_REPORTS);

  // Filter states
  const [confirmedFilter, setConfirmedFilter] = useState<string>("all");
  const [qualityFilter, setQualityFilter] = useState<string>("all");

  // Create Report Modal state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string>("");
  const [reviewDate, setReviewDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [hoursReviewed, setHoursReviewed] = useState("16:00 - 20:30 (4.5 hrs)");
  const [footageQuality, setFootageQuality] = useState<SurveillanceReport["footageQuality"]>("Clear");
  const [incidentConfirmed, setIncidentConfirmed] = useState<SurveillanceReport["incidentConfirmed"]>("Yes");
  const [discrepancyAmount, setDiscrepancyAmount] = useState("$340.00");
  const [personsInvolved, setPersonsInvolved] = useState("");
  const [findings, setFindings] = useState("");
  const [recommendation, setRecommendation] = useState("");
  const [attachments, setAttachments] = useState<SurveillanceAttachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Detail Modal state
  const [detailTarget, setDetailTarget] = useState<SurveillanceReport | null>(null);

  // Approved requests available for report creation
  const eligibleRequests = useMemo(() => {
    return requests.filter(
      (r) => r.status === "approved" || r.status === "in_progress",
    );
  }, [requests]);

  const selectedRequest = useMemo(() => {
    return requests.find((r) => r.id === selectedRequestId);
  }, [requests, selectedRequestId]);

  const handleOpenCreate = () => {
    if (eligibleRequests.length > 0) {
      setSelectedRequestId(eligibleRequests[0].id);
    } else {
      setSelectedRequestId(requests[0]?.id || "");
    }
    setReviewDate(new Date().toISOString().split("T")[0]);
    setHoursReviewed("14:00 - 18:30 (4.5 hrs)");
    setFootageQuality("Clear");
    setIncidentConfirmed("Yes");
    setDiscrepancyAmount("");
    setPersonsInvolved("");
    setFindings("");
    setRecommendation("");
    setAttachments([]);
    setCreateModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const newAtts: SurveillanceAttachment[] = Array.from(files).map((f) => ({
      id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: f.name,
      size: f.size,
      type: f.type,
    }));
    setAttachments((prev) => [...prev, ...newAtts]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmitReport = () => {
    if (!selectedRequestId) {
      toast.error("Please select an approved request to conduct surveillance against.");
      return;
    }
    if (!findings.trim()) {
      toast.error("Please provide investigation findings and observations.");
      return;
    }
    if (!recommendation.trim()) {
      toast.error("Please provide a concluding recommendation.");
      return;
    }

    const req = requests.find((r) => r.id === selectedRequestId);
    const newReportId = `SRV-REP-${Math.floor(202 + reports.length)}`;

    const newReport: SurveillanceReport = {
      id: newReportId,
      requestId: selectedRequestId,
      storeName: req?.storeName || "Store Location",
      storeNumber: req?.storeNumber,
      marketName: req?.marketName || "Market",
      incidentDate: req?.incidentDate || reviewDate,
      investigatorName: user?.fullName || "Alex Rivera",
      investigatorId: user?.id || "u-1",
      investigatorEmail: user?.email,
      reviewDate,
      hoursReviewed,
      camerasReviewed: req?.areasToReview || ["POS 1 Register", "Customer Entrance"],
      footageQuality,
      incidentConfirmed,
      discrepancyAmount: discrepancyAmount.trim() || undefined,
      personsInvolved: personsInvolved.trim() || undefined,
      findings: findings.trim(),
      recommendation: recommendation.trim(),
      attachments: attachments.length > 0 ? attachments : undefined,
      submittedAt: new Date().toISOString(),
      status: "submitted",
    };

    setReports((prev) => [newReport, ...prev]);

    // Also update request status locally
    if (req) {
      req.status = "report_submitted";
      req.linkedReportId = newReportId;
    }

    toast.success("Surveillance report submitted successfully!");
    setCreateModalOpen(false);
  };

  // Filtered reports
  const filteredReports = useMemo(() => {
    return reports.filter((rep) => {
      if (confirmedFilter !== "all" && rep.incidentConfirmed !== confirmedFilter) return false;
      if (qualityFilter !== "all" && rep.footageQuality !== qualityFilter) return false;
      return true;
    });
  }, [reports, confirmedFilter, qualityFilter]);

  // Columns definition
  const columns: Column<SurveillanceReport>[] = useMemo(
    () => [
      {
        key: "id",
        header: "Report ID",
        searchValue: (r) => r.id,
        accessor: (r) => (
          <span className="font-mono text-xs font-semibold text-primary">{r.id}</span>
        ),
      },
      {
        key: "request",
        header: "Request & Store",
        searchValue: (r) => `${r.requestId} ${r.storeName} ${r.marketName}`,
        accessor: (r) => (
          <div>
            <div className="font-medium text-foreground text-sm flex items-center gap-1.5">
              <StoreIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              {r.storeName}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Ref: <span className="font-mono font-medium text-primary">{r.requestId}</span> • {r.marketName}
            </div>
          </div>
        ),
      },
      {
        key: "confirmed",
        header: "Incident Confirmed?",
        searchValue: (r) => r.incidentConfirmed,
        accessor: (r) => {
          if (r.incidentConfirmed === "Yes") {
            return (
              <Badge className="bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 gap-1 text-xs font-semibold">
                <CheckCircle2 className="h-3 w-3" /> Yes
              </Badge>
            );
          }
          if (r.incidentConfirmed === "No") {
            return (
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 gap-1 text-xs font-semibold">
                <XCircle className="h-3 w-3" /> No Violation
              </Badge>
            );
          }
          return (
            <Badge className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 gap-1 text-xs font-semibold">
              <HelpCircle className="h-3 w-3" /> Inconclusive
            </Badge>
          );
        },
      },
      {
        key: "findings",
        header: "Key Findings",
        searchValue: (r) => r.findings,
        accessor: (r) => (
          <div className="max-w-xs sm:max-w-md">
            <p className="line-clamp-2 text-xs text-foreground leading-relaxed">{r.findings}</p>
            {r.discrepancyAmount && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 mt-1">
                <DollarSign className="h-3 w-3" /> Discrepancy: {r.discrepancyAmount}
              </span>
            )}
          </div>
        ),
      },
      {
        key: "investigator",
        header: "Auditor / User",
        searchValue: (r) => r.investigatorName,
        accessor: (r) => (
          <div className="text-xs">
            <div className="font-medium text-foreground">{r.investigatorName}</div>
            <div className="text-muted-foreground">{new Date(r.submittedAt).toLocaleDateString()}</div>
          </div>
        ),
      },
      {
        key: "footageQuality",
        header: "Footage Quality",
        searchValue: (r) => r.footageQuality,
        accessor: (r) => (
          <Badge variant="outline" className="text-xs font-normal">
            <Video className="h-3 w-3 mr-1 text-primary inline" />
            {r.footageQuality}
          </Badge>
        ),
      },
      {
        key: "actions",
        header: <span className="text-right block w-full pr-2">Actions</span>,
        accessor: (r) => (
          <div className="flex items-center justify-end pr-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setDetailTarget(r);
              }}
              className="h-8 gap-1.5 px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              <Eye className="h-3.5 w-3.5" />
              View Report
            </Button>
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-display text-2xl font-semibold tracking-tight">
              Surveillance Reports
            </h1>
            <Badge variant="outline" className="border-indigo-300 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
              Audits & Submissions
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Compile and submit detailed video reviews against authorized requests, document violations, and attach evidence.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Role switcher for easy UI demonstration */}
          <div className="flex items-center gap-2 rounded-lg border bg-card/60 p-1 px-2 text-xs">
            <span className="text-muted-foreground font-medium">Preview As:</span>
            <Select
              value={activeRole}
              onValueChange={(v) => {
                setActiveRole(v as SurveillanceRole);
                toast.info(`Switched view to ${v.replace(/_/g, " ").toUpperCase()}`);
              }}
            >
              <SelectTrigger className="h-7 w-[145px] text-xs font-semibold border-0 bg-transparent shadow-none focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User / Investigator</SelectItem>
                <SelectItem value="district_manager">District Manager</SelectItem>
                <SelectItem value="market_manager">Market Manager</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* User role submission action */}
          <Button onClick={handleOpenCreate} className="gap-2 shadow-xs">
            <Plus className="h-4 w-4" />
            Submit Surveillance Report
          </Button>
        </div>
      </div>

      {/* Toolbar filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={confirmedFilter} onValueChange={setConfirmedFilter}>
          <SelectTrigger className="h-9 w-[180px]">
            <SelectValue placeholder="Incident Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Incident Statuses</SelectItem>
            <SelectItem value="Yes">Confirmed Violation (Yes)</SelectItem>
            <SelectItem value="No">No Violation (No)</SelectItem>
            <SelectItem value="Inconclusive">Inconclusive</SelectItem>
          </SelectContent>
        </Select>

        <Select value={qualityFilter} onValueChange={setQualityFilter}>
          <SelectTrigger className="h-9 w-[170px]">
            <SelectValue placeholder="Footage Quality" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Footage Qualities</SelectItem>
            <SelectItem value="Clear">Clear</SelectItem>
            <SelectItem value="Partially Obstructed">Partially Obstructed</SelectItem>
            <SelectItem value="Poor / Glitchy">Poor / Glitchy</SelectItem>
            <SelectItem value="No Coverage">No Coverage</SelectItem>
          </SelectContent>
        </Select>

        {(confirmedFilter !== "all" || qualityFilter !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setConfirmedFilter("all");
              setQualityFilter("all");
            }}
            className="h-9 px-2 text-xs text-muted-foreground hover:text-foreground gap-1 border border-dashed"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset Filters
          </Button>
        )}
      </div>

      {/* Table */}
      <DataTable
        rows={filteredReports}
        columns={columns}
        rowKey={(r) => r.id}
        searchPlaceholder="Search by Report ID, Request ID, Store, or Findings..."
        onRowClick={(r) => setDetailTarget(r)}
      />

      {/* CREATE / SUBMIT SURVEILLANCE REPORT DIALOG */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Submit Surveillance Report</DialogTitle>
            <DialogDescription>
              Submit video investigation findings against an authorized store surveillance request.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2 pt-2 text-xs">
            {/* Linked Request Selection */}
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-xs font-semibold">
                Select Approved Request <span className="text-destructive">*</span>
              </Label>
              <Select value={selectedRequestId} onValueChange={setSelectedRequestId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an approved request" />
                </SelectTrigger>
                <SelectContent>
                  {requests.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.id}: {r.storeName} — {r.title} ({r.incidentDate})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Request Summary Preview */}
            {selectedRequest && (
              <div className="sm:col-span-2 p-3 rounded-lg border bg-muted/40 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Store:</span>
                  <div className="font-semibold text-foreground">{selectedRequest.storeName}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Target Date:</span>
                  <div className="font-semibold text-foreground">{selectedRequest.incidentDate} ({selectedRequest.shift})</div>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">Camera Targets:</span>
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {selectedRequest.areasToReview.map((a) => (
                      <Badge key={a} variant="outline" className="text-[10px] bg-background">
                        {a}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Review Date */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Audit Conducted Date <span className="text-destructive">*</span>
              </Label>
              <Input
                type="date"
                value={reviewDate}
                onChange={(e) => setReviewDate(e.target.value)}
              />
            </div>

            {/* Hours Reviewed */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Video Hours Inspected <span className="text-destructive">*</span>
              </Label>
              <Input
                value={hoursReviewed}
                onChange={(e) => setHoursReviewed(e.target.value)}
                placeholder="e.g. 14:00 - 18:30 (4.5 hrs)"
              />
            </div>

            {/* Footage Quality */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Footage Quality / Clarity</Label>
              <Select
                value={footageQuality}
                onValueChange={(v) => setFootageQuality(v as SurveillanceReport["footageQuality"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Clear">Clear</SelectItem>
                  <SelectItem value="Partially Obstructed">Partially Obstructed</SelectItem>
                  <SelectItem value="Poor / Glitchy">Poor / Glitchy</SelectItem>
                  <SelectItem value="No Coverage">No Coverage</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Incident Confirmed */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Incident / Violation Confirmed? <span className="text-destructive">*</span>
              </Label>
              <Select
                value={incidentConfirmed}
                onValueChange={(v) => setIncidentConfirmed(v as SurveillanceReport["incidentConfirmed"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Yes">Yes — Violation Observed</SelectItem>
                  <SelectItem value="No">No — No Misconduct Detected</SelectItem>
                  <SelectItem value="Inconclusive">Inconclusive — Blindspot / Insufficient Evidence</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Discrepancy Amount */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Financial Discrepancy Amount (Optional)</Label>
              <Input
                value={discrepancyAmount}
                onChange={(e) => setDiscrepancyAmount(e.target.value)}
                placeholder="e.g. $340.00"
              />
            </div>

            {/* Persons Involved */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Persons Identified / Involved</Label>
              <Input
                value={personsInvolved}
                onChange={(e) => setPersonsInvolved(e.target.value)}
                placeholder="e.g. Cashier on shift, customer in black jacket..."
              />
            </div>

            {/* Findings */}
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-xs font-semibold">
                Detailed Investigation Findings & Chronology <span className="text-destructive">*</span>
              </Label>
              <Textarea
                value={findings}
                onChange={(e) => setFindings(e.target.value)}
                placeholder="Document timestamp observations, camera angles, actions observed, and physical evidence seen on video..."
                rows={4}
              />
            </div>

            {/* Recommendations */}
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-xs font-semibold">
                Concluding Action Recommendation <span className="text-destructive">*</span>
              </Label>
              <Textarea
                value={recommendation}
                onChange={(e) => setRecommendation(e.target.value)}
                placeholder="e.g. Recommend manager interview with employee, drawer re-audit, or security camera angle adjustment..."
                rows={2}
              />
            </div>

            {/* Attachments Section */}
            <div className="sm:col-span-2 space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  <Paperclip className="h-4 w-4 text-muted-foreground" />
                  Video Stills & Evidence Attachments
                </Label>
                <span className="text-[11px] text-muted-foreground">Images, PDFs up to 10MB</span>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx"
                className="hidden"
                onChange={handleFileChange}
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border rounded-lg p-3 text-center cursor-pointer hover:bg-muted/40 transition-colors"
              >
                <UploadCloud className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                <p className="text-xs font-medium text-foreground">Click to upload footage stills or audit files</p>
              </div>

              {attachments.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  {attachments.map((file, idx) => (
                    <div
                      key={file.id || idx}
                      className="flex items-center justify-between gap-2 p-2 rounded-md bg-muted/60 border text-xs"
                    >
                      <div className="flex items-center gap-2 truncate">
                        {file.type?.includes("image") ? (
                          <ImageIcon className="h-4 w-4 text-blue-500 shrink-0" />
                        ) : (
                          <FileText className="h-4 w-4 text-amber-500 shrink-0" />
                        )}
                        <span className="truncate font-medium">{file.name}</span>
                        <span className="text-muted-foreground text-[10px]">
                          ({formatFileSize(file.size)})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}
                        className="p-1 text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitReport}>Submit Surveillance Report</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* FULL REPORT DETAIL MODAL */}
      <Dialog open={Boolean(detailTarget)} onOpenChange={(open) => !open && setDetailTarget(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {detailTarget && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between pr-6">
                  <DialogTitle className="flex items-center gap-2 font-display text-lg">
                    <span>Surveillance Report</span>
                    <Badge variant="outline" className="font-mono text-xs">
                      {detailTarget.id}
                    </Badge>
                  </DialogTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.print()}
                    className="h-8 gap-1.5 text-xs"
                  >
                    <Printer className="h-3.5 w-3.5" /> Print / Export
                  </Button>
                </div>
                <DialogDescription>
                  Official video review findings for {detailTarget.storeName} (Request Ref: {detailTarget.requestId}).
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2 text-xs">
                {/* Highlights Card */}
                <Card className="p-3.5 bg-muted/30">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div>
                      <div className="text-muted-foreground uppercase text-[10px] font-bold">Store Location</div>
                      <div className="font-semibold text-foreground text-sm mt-0.5">{detailTarget.storeName}</div>
                      <div className="text-[11px] text-muted-foreground">{detailTarget.marketName}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground uppercase text-[10px] font-bold">Violation Confirmed?</div>
                      <div className="mt-1">
                        {detailTarget.incidentConfirmed === "Yes" ? (
                          <Badge className="bg-rose-100 text-rose-800 border-rose-300 text-xs font-bold">
                            Yes — Violation
                          </Badge>
                        ) : detailTarget.incidentConfirmed === "No" ? (
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-xs font-bold">
                            No Violation
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-xs font-bold">
                            Inconclusive
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground uppercase text-[10px] font-bold">Auditor</div>
                      <div className="font-semibold text-foreground mt-0.5">{detailTarget.investigatorName}</div>
                      <div className="text-[11px] text-muted-foreground">{new Date(detailTarget.submittedAt).toLocaleDateString()}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground uppercase text-[10px] font-bold">Footage Clarity</div>
                      <div className="font-semibold text-foreground mt-0.5">{detailTarget.footageQuality}</div>
                      <div className="text-[11px] text-muted-foreground">{detailTarget.hoursReviewed}</div>
                    </div>
                  </div>
                </Card>

                {/* Financial note if present */}
                {detailTarget.discrepancyAmount && (
                  <div className="flex items-center gap-2 p-2.5 rounded-lg border border-rose-200 bg-rose-50/60 dark:bg-rose-950/20 text-rose-800 dark:text-rose-300">
                    <DollarSign className="h-4 w-4 shrink-0" />
                    <span>
                      <strong>Verified Financial / Cash Discrepancy:</strong> {detailTarget.discrepancyAmount}
                    </span>
                  </div>
                )}

                {/* Persons observed */}
                {detailTarget.personsInvolved && (
                  <div>
                    <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">
                      Identified Persons
                    </div>
                    <div className="p-2.5 rounded-lg border bg-card text-foreground">
                      {detailTarget.personsInvolved}
                    </div>
                  </div>
                )}

                {/* Chronology & Findings */}
                <div>
                  <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">
                    Chronology & Video Findings
                  </div>
                  <div className="p-3.5 rounded-lg border bg-card text-foreground leading-relaxed whitespace-pre-wrap text-xs">
                    {detailTarget.findings}
                  </div>
                </div>

                {/* Recommendation */}
                <div>
                  <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">
                    Investigative Recommendation
                  </div>
                  <div className="p-3 rounded-lg border bg-primary/5 text-foreground leading-relaxed text-xs">
                    {detailTarget.recommendation}
                  </div>
                </div>

                {/* Attachments */}
                {detailTarget.attachments && detailTarget.attachments.length > 0 && (
                  <div>
                    <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1.5">
                      Evidence Attachments
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {detailTarget.attachments.map((file) => (
                        <div
                          key={file.id}
                          className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-1.5 text-xs font-medium"
                        >
                          {file.type.includes("image") ? (
                            <ImageIcon className="h-4 w-4 text-blue-500" />
                          ) : (
                            <FileText className="h-4 w-4 text-amber-500" />
                          )}
                          <span>{file.name}</span>
                          <span className="text-[10px] text-muted-foreground">({formatFileSize(file.size)})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter className="border-t pt-3">
                <Button variant="outline" onClick={() => setDetailTarget(null)}>
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
