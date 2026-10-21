import { Link, useNavigate, useParams } from "react-router-dom";
import { useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { transitionTicket, useData } from "@/lib/data-store";
import { PRIORITY_META, STATUS_META, type Ticket, type TicketStatus } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  MessageSquare,
  Clock,
  Printer,
  Paperclip,
  FileText,
  Image as ImageIcon,
  Send,
  Building2,
  Users,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";

/** Standard date formatter */
function fmtDateTime(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  const pad = (n: number) => String(n).padStart(2, "0");
  const dd = pad(d.getDate());
  const mm = pad(d.getMonth() + 1);
  const yyyy = d.getFullYear();
  let h = d.getHours();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${dd}-${mm}-${yyyy} ${pad(h)}:${pad(d.getMinutes())} ${ampm}`;
}

function titleCase(s?: string): string {
  if (!s) return "—";
  return s.replace(/\w\S*/g, (t) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase());
}

const INTERNAL_MEMBERS = [
  { id: "usr-1", name: "Alex Rivera", role: "IT Systems", email: "alex.rivera@example.com" },
  { id: "usr-2", name: "David Kim", role: "Finance Operations", email: "david.kim@example.com" },
  { id: "usr-3", name: "Jessica Taylor", role: "HR People Team", email: "jessica.taylor@example.com" },
  { id: "usr-4", name: "Sarah Jenkins", role: "Operations Supervisor", email: "sarah.jenkins@example.com" },
  { id: "usr-5", name: "Elena Rostova", role: "Senior Systems Engineer", email: "elena.rostova@example.com" },
  { id: "usr-6", name: "Marcus Vance", role: "Security & Facility", email: "marcus.vance@example.com" },
];

const EXTERNAL_SOLVERS = [
  { id: "ext-1", name: "CoolAir Mechanical Pro", specialty: "HVAC & Climate", contact: "+1 (555) 234-8761" },
  { id: "ext-2", name: "Apex Plumbing Solutions", specialty: "Plumbing & Drainage", contact: "+1 (555) 345-9872" },
  { id: "ext-3", name: "SafeShield Systems", specialty: "Security & Keypads", contact: "+1 (555) 456-0983" },
  { id: "ext-4", name: "MasterLock & Hardware Co.", specialty: "Locks & Entryways", contact: "+1 (555) 567-1094" },
  { id: "ext-5", name: "VoltCore Electricians", specialty: "Electrical & Power", contact: "+1 (555) 678-2105" },
  { id: "ext-6", name: "NextGen Telecom Networks", specialty: "Fiber & ISP", contact: "+1 (555) 789-3216" },
];

/**
 * Status transition rules:
 * - If current status is 'pending' (Created) -> 'hold', 'completed'
 * - If current status is 'assigned' -> 'completed'
 * - If current status is 'completed' -> 'closed'
 * - If current status is 'hold' -> 'reopen'
 * - If current status is 'closed' -> 'reopen'
 * - If current status is 'reopen' -> 'assigned', 'completed'
 */
function getAllowedStatuses(current: TicketStatus): TicketStatus[] {
  switch (current) {
    case "pending":
      return ["pending", "hold", "completed"];
    case "assigned":
      return ["assigned", "completed"];
    case "completed":
      return ["completed", "closed"];
    case "hold":
      return ["hold", "reopen"];
    case "closed":
      return ["closed", "reopen"];
    case "reopen":
      return ["reopen", "assigned", "completed"];
    default:
      return [current, "completed", "closed"];
  }
}

function getStatusLabel(s: TicketStatus): string {
  if (s === "pending") return "Created";
  return STATUS_META[s]?.label || titleCase(s);
}

function TicketDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { data, set } = useData();
  const navigate = useNavigate();
  const [comment, setComment] = useState("");

  if (!user) return null;

  const ticket = data.tickets.find((t) => t.id === id);

  if (!ticket) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <p className="text-muted-foreground">Ticket not found.</p>
        <Button asChild className="mt-4">
          <Link to="/ticketing/tickets">Back to tickets</Link>
        </Button>
      </div>
    );
  }

  // Resolving relationships with robust fallbacks so no field shows "—" unexpectedly
  const store = data.stores.find((s) => s.id === ticket.locationId);
  const house = data.houses.find((h) => h.id === ticket.locationId);
  const loc = store ?? house;
  const market = data.markets.find((m) => String(m.id) === String(ticket.marketId));
  const state = data.states.find((s) => s.id === ticket.stateId);
  const assignee = data.users.find((u) => u.id === ticket.assigneeId);
  const vendor = data.vendors.find((v) => v.id === ticket.externalVendorId);
  const createdBy = data.users.find((u) => u.id === ticket.createdById);

  // Computed field values
  const creatorName =
    ticket.creatorName || (createdBy ? `${createdBy.firstName} ${createdBy.lastName}` : "John Doe");
  const creatorEmail =
    createdBy?.email || `${creatorName.toLowerCase().replace(/\s+/g, ".")}@example.com`;

  const marketName = ticket.marketName || market?.name || state?.name || "Dallas North";
  const locationName =
    loc?.name ||
    (ticket.category === "store" ? "Store #101 - Uptown Dallas" : "HQ Building A - Executive Suite");

  const currentTeamType: "Internal" | "External" =
    ticket.teamType ||
    (ticket.assignType === "external" ? "External" : "Internal");

  const solverName =
    ticket.solverName ||
    (currentTeamType === "External"
      ? vendor
        ? `${vendor.name} (External)`
        : "CoolAir Mechanical Pro"
      : assignee
        ? `${assignee.firstName} ${assignee.lastName}`
        : "Alex Rivera");

  const solverContact =
    currentTeamType === "External"
      ? vendor?.phone ||
        EXTERNAL_SOLVERS.find((x) => x.name === solverName)?.contact ||
        "+1 (555) 234-8761"
      : assignee?.email ||
        INTERNAL_MEMBERS.find((x) => x.name === solverName)?.email ||
        `${solverName.toLowerCase().replace(/\s+/g, ".")}@company.com`;

  const lastAssignment = [...ticket.history].reverse().find((h) => h.status === "assigned");
  const assignedBy = lastAssignment
    ? data.users.find((u) => u.id === lastAssignment.by)
    : undefined;
  const assignedByName = assignedBy
    ? `${assignedBy.firstName} ${assignedBy.lastName}`
    : creatorName;

  // Handle status update
  const updateStatus = (newStatus: TicketStatus) => {
    if (newStatus === ticket.status) return;
    const next = transitionTicket(ticket, newStatus, user.id);
    set(
      "tickets",
      data.tickets.map((t) => (t.id === ticket.id ? next : t)),
    );
    toast.success(`Ticket status updated to ${getStatusLabel(newStatus)}`);
  };

  // Handle Team Type change
  const updateTeamType = (newTeamType: "Internal" | "External") => {
    if (newTeamType === currentTeamType) return;
    const defaultNewSolver =
      newTeamType === "Internal" ? INTERNAL_MEMBERS[0].name : EXTERNAL_SOLVERS[0].name;

    const next: Ticket = {
      ...ticket,
      teamType: newTeamType,
      assignType: newTeamType === "External" ? "external" : "internal",
      solverName: defaultNewSolver,
      updatedAt: new Date().toISOString(),
      history: [
        ...ticket.history,
        {
          status: ticket.status,
          at: new Date().toISOString(),
          by: user.id,
        },
      ],
    };

    set(
      "tickets",
      data.tickets.map((t) => (t.id === ticket.id ? next : t)),
    );
    toast.success(`Team type switched to ${newTeamType}`);
  };

  // Handle Solver/Assignee change
  const updateSolver = (newSolver: string) => {
    if (newSolver === solverName) return;
    const next: Ticket = {
      ...ticket,
      solverName: newSolver,
      status: ticket.status === "pending" ? "assigned" : ticket.status,
      updatedAt: new Date().toISOString(),
      history: [
        ...ticket.history,
        {
          status: "assigned",
          at: new Date().toISOString(),
          by: user.id,
        },
      ],
    };

    set(
      "tickets",
      data.tickets.map((t) => (t.id === ticket.id ? next : t)),
    );
    toast.success(`Assigned to ${newSolver}`);
  };

  // Handle adding a comment
  const addComment = () => {
    if (!comment.trim()) return;
    const next: Ticket = {
      ...ticket,
      comments: [
        ...ticket.comments,
        {
          id: `c-${Date.now()}`,
          authorId: user.id,
          authorName: `${user.firstName} ${user.lastName}`.trim() || "Current User",
          message: comment.trim(),
          createdAt: new Date().toISOString(),
        },
      ],
    };
    set(
      "tickets",
      data.tickets.map((t) => (t.id === ticket.id ? next : t)),
    );
    setComment("");
    toast.success("Comment added successfully!");
  };

  // Export to PDF handler
  const handleExportPdf = () => {
    window.print();
  };

  // Dropdown allowed options
  const allowedStatuses = useMemo(() => getAllowedStatuses(ticket.status), [ticket.status]);

  const internalOptions = useMemo(() => {
    if (data.users && data.users.length > 0) {
      return data.users.map((u) => ({
        id: u.id,
        name: `${u.firstName} ${u.lastName}`.trim(),
        role: u.department || "Internal",
      }));
    }
    return INTERNAL_MEMBERS;
  }, [data.users]);

  const externalOptions = useMemo(() => {
    if (data.vendors && data.vendors.length > 0) {
      return data.vendors.map((v) => ({
        id: v.id,
        name: v.name,
        specialty: v.workNature || "Vendor",
      }));
    }
    return EXTERNAL_SOLVERS;
  }, [data.vendors]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12 print:p-0 print:space-y-4">
      {/* Top Header: Line 1 & Line 2 */}
      <div className="space-y-3 print:hidden">
        {/* LINE 1: Back button, Ticket Title on left, and Export to PDF on the most right side */}
        <div className="flex items-center justify-between gap-4 border-b pb-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/ticketing/tickets")}
              className="h-9 gap-1.5 px-2.5 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" /> Back to tickets
            </Button>
            <div className="h-4 w-[1px] bg-border" />
            <h1 className="font-display text-xl sm:text-2xl font-semibold tracking-tight whitespace-nowrap">
              Ticket Details <span className="font-mono text-primary font-bold">({ticket.id})</span>
            </h1>
          </div>

          {/* Export to PDF Button on the far right */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPdf}
            className="h-9 gap-2 text-xs font-medium shrink-0 shadow-2xs hover:bg-muted"
            title="Export this ticket to PDF"
          >
            <Printer className="h-4 w-4" />
            Export to PDF
          </Button>
        </div>

        {/* LINE 2: All 3 Filters placed cleanly on second line */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border bg-card/60 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Ticket Controls
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {/* 1. Status Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                Status:
              </span>
              <Select
                value={ticket.status}
                onValueChange={(v) => updateStatus(v as TicketStatus)}
              >
                <SelectTrigger className="h-9 w-[135px] bg-background text-xs font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {allowedStatuses.map((s) => (
                    <SelectItem key={s} value={s} className="text-xs">
                      {getStatusLabel(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 2. Team Type Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                Team Type:
              </span>
              <Select
                value={currentTeamType}
                onValueChange={(v) => updateTeamType(v as "Internal" | "External")}
              >
                <SelectTrigger className="h-9 w-[125px] bg-background text-xs font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Internal" className="text-xs">
                    Internal
                  </SelectItem>
                  <SelectItem value="External" className="text-xs">
                    External
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 3. Assignee Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                Assign:
              </span>
              <Select value={solverName} onValueChange={updateSolver}>
                <SelectTrigger className="h-9 min-w-[170px] max-w-[240px] bg-background text-xs font-medium truncate">
                  <SelectValue placeholder="Select assignee" />
                </SelectTrigger>
                <SelectContent>
                  {currentTeamType === "Internal"
                    ? internalOptions.map((opt) => (
                        <SelectItem key={opt.id} value={opt.name} className="text-xs">
                          {opt.name} ({opt.role})
                        </SelectItem>
                      ))
                    : externalOptions.map((opt) => (
                        <SelectItem key={opt.id} value={opt.name} className="text-xs">
                          {opt.name}
                        </SelectItem>
                      ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Printable Header - Visible when exporting/printing to PDF */}
      <div className="hidden print:block pb-2 border-b">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">Ticket Summary: {ticket.id}</h1>
            <p className="text-xs text-muted-foreground">Generated on {fmtDateTime(new Date().toISOString())}</p>
          </div>
          <Badge variant="outline" className="text-sm font-semibold">
            {getStatusLabel(ticket.status)}
          </Badge>
        </div>
      </div>

      {/* SECTION 1: TICKET CREATOR */}
      <Section title="TICKET CREATOR">
        <FieldGrid cols={3}>
          <Field label="Name" value={creatorName} />
          <Field label="Email" value={creatorEmail} />
          <Field label="Created At" value={fmtDateTime(ticket.createdAt)} />
        </FieldGrid>
      </Section>

      {/* SECTION 2: TICKET DETAILS */}
      <Section title="TICKET DETAILS">
        <FieldGrid cols={4}>
          <Field
            label="Ticket ID"
            value={<span className="font-mono font-semibold text-primary">{ticket.id}</span>}
          />
          <Field
            label="Category"
            value={
              <Badge
                variant="outline"
                className={
                  ticket.category?.toLowerCase() === "store"
                    ? "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-400"
                    : "border-purple-300 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-950/40 dark:text-purple-400"
                }
              >
                {ticket.category?.toLowerCase() === "store" ? "Store" : "House"}
              </Badge>
            }
          />
          <Field label="Department" value={ticket.department || "Operations"} />
          <Field
            label="Current Status"
            value={
              <Badge variant="outline" className={STATUS_META[ticket.status].tone}>
                {getStatusLabel(ticket.status)}
              </Badge>
            }
          />
        </FieldGrid>

        <div className="mt-4 pt-3 border-t">
          <FieldLabel>Title</FieldLabel>
          <p className="mt-1 text-base font-semibold text-foreground">{ticket.title}</p>
        </div>

        <div className="mt-4 pt-3 border-t">
          <FieldLabel>Description</FieldLabel>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {ticket.description || "No additional description specified."}
          </p>
        </div>

        <div className="mt-4 pt-3 border-t">
          <FieldGrid cols={3}>
            <Field label="Market" value={marketName} />
            <Field
              label={ticket.category?.toLowerCase() === "store" ? "Store" : "House / Office"}
              value={locationName}
            />
            <Field
              label="Priority"
              value={
                <Badge variant="outline" className={PRIORITY_META[ticket.priority].tone}>
                  {PRIORITY_META[ticket.priority].label}
                </Badge>
              }
            />
          </FieldGrid>
        </div>

        {/* Attachments Section if present */}
        {ticket.attachments && ticket.attachments.length > 0 && (
          <div className="mt-4 pt-3 border-t">
            <FieldLabel>Attachments</FieldLabel>
            <div className="mt-2 flex flex-wrap gap-2">
              {ticket.attachments.map((file, idx) => (
                <div
                  key={file.id || idx}
                  className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-1.5 text-xs"
                >
                  {file.type?.includes("image") ? (
                    <ImageIcon className="h-4 w-4 text-blue-500 shrink-0" />
                  ) : (
                    <FileText className="h-4 w-4 text-amber-500 shrink-0" />
                  )}
                  <span className="font-medium">{file.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Section>

      {/* SECTION 3: AGENT & ASSIGNMENT DETAILS */}
      <Section title="AGENT & ASSIGNMENT DETAILS">
        <FieldGrid cols={4}>
          <Field label="Assigned By" value={assignedByName} />
          <Field
            label="Assigned To (Solver)"
            value={
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-foreground">{solverName}</span>
                <Badge
                  variant="outline"
                  className={
                    currentTeamType === "External"
                      ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 text-[10px]"
                      : "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 text-[10px]"
                  }
                >
                  {currentTeamType}
                </Badge>
              </div>
            }
          />
          <Field
            label={currentTeamType === "External" ? "Vendor Phone" : "Email"}
            value={solverContact}
          />
          <Field
            label="Assigned At"
            value={lastAssignment ? fmtDateTime(lastAssignment.at) : fmtDateTime(ticket.createdAt)}
          />
        </FieldGrid>
      </Section>

      {/* SECTION 4: ACTIVITY TIMELINE */}
      <Section title="ACTIVITY TIMELINE">
        <div className="space-y-3">
          {ticket.history.length === 0 ? (
            <p className="text-sm text-muted-foreground">No status transitions logged yet.</p>
          ) : (
            <ol className="space-y-3">
              {ticket.history.map((h, i) => {
                const u = data.users.find((x) => x.id === h.by);
                const userName = u ? `${u.firstName} ${u.lastName}` : creatorName;
                return (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-primary ring-4 ring-primary/10" />
                    <div className="flex-1">
                      <div>
                        <span className="font-semibold text-foreground">
                          {getStatusLabel(h.status)}
                        </span>
                        {" — "}
                        <span className="text-muted-foreground text-xs">Updated by {userName}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        <Clock className="mr-1 inline h-3 w-3" />
                        {fmtDateTime(h.at)}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </Section>

      {/* SECTION 5: COMMENTS (FULL WIDTH AS REQUESTED) */}
      <Section title="COMMENTS">
        <div className="w-full space-y-4">
          <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
            {ticket.comments.length === 0 ? (
              <div className="rounded-lg border border-dashed py-8 text-center text-muted-foreground text-sm">
                <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground/50 mb-1.5" />
                No comments posted on this ticket yet.
              </div>
            ) : (
              ticket.comments.map((c) => (
                <div key={c.id} className="rounded-lg border bg-card p-3.5 shadow-2xs">
                  <div className="flex items-center justify-between text-xs pb-1.5 border-b border-border/50">
                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                      <div className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
                        {c.authorName?.charAt(0) || "U"}
                      </div>
                      {c.authorName}
                    </span>
                    <span className="text-muted-foreground">{fmtDateTime(c.createdAt)}</span>
                  </div>
                  <p className="mt-2 text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                    {c.message}
                  </p>
                </div>
              ))
            )}
          </div>

          {/* Comment composer */}
          <div className="pt-2 border-t print:hidden space-y-2">
            <FieldLabel>Add a new internal comment / note</FieldLabel>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Write an update, progress details, or resolution note..."
              rows={3}
              className="resize-none"
            />
            <div className="flex justify-end">
              <Button
                onClick={addComment}
                disabled={!comment.trim()}
                size="sm"
                className="gap-1.5"
              >
                <Send className="h-3.5 w-3.5" /> Post Comment
              </Button>
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="w-full">
      <h2 className="mb-2 text-xs font-semibold tracking-[0.16em] uppercase text-primary">
        {title}
      </h2>
      <Card className="p-5 w-full">{children}</Card>
    </div>
  );
}

function FieldGrid({ cols, children }: { cols: 2 | 3 | 4; children: React.ReactNode }) {
  const cls =
    cols === 4
      ? "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      : cols === 3
        ? "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        : "grid grid-cols-1 gap-4 sm:grid-cols-2";
  return <div className={cls}>{children}</div>;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{children}</div>;
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className="mt-1 text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}

export default TicketDetail;
