import { Link, useNavigate, useParams } from "react-router-dom";import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { transitionTicket, useData } from "@/lib/data-store";
import { canAssignTicket } from "@/lib/permissions";
import {
  PRIORITY_META, STATUS_META, type TicketStatus,
} from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, MessageSquare, Clock } from "lucide-react";
import { toast } from "sonner";

/** "28-05-2026 02:33 Pm" style — matches reference screenshot. */
function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  const dd = pad(d.getDate());
  const mm = pad(d.getMonth() + 1);
  const yyyy = d.getFullYear();
  let h = d.getHours();
  const ampm = h >= 12 ? "Pm" : "Am";
  h = h % 12 || 12;
  return `${dd}-${mm}-${yyyy} ${pad(h)}:${pad(d.getMinutes())} ${ampm}`;
}

function titleCase(s: string): string {
  return s.replace(/\w\S*/g, (t) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase());
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
        <Button asChild className="mt-4"><Link to="/ticketing/tickets">Back to tickets</Link></Button>
      </div>
    );
  }

  const store = data.stores.find((s) => s.id === ticket.locationId);
  const house = data.houses.find((h) => h.id === ticket.locationId);
  const loc = store ?? house;
  const market = data.markets.find((m) => String(m.id) === String(ticket.marketId));
  const state = data.states.find((s) => s.id === ticket.stateId);
  const assignee = data.users.find((u) => u.id === ticket.assigneeId);
  const vendor = data.vendors.find((v) => v.id === ticket.externalVendorId);
  const createdBy = data.users.find((u) => u.id === ticket.createdById);

  const lastAssignment = [...ticket.history].reverse().find((h) => h.status === "assigned");
  const assignedBy = lastAssignment ? data.users.find((u) => u.id === lastAssignment.by) : undefined;

  const updateStatus = (status: TicketStatus) => {
    const next = transitionTicket(ticket, status, user.id);
    set("tickets", data.tickets.map((t) => t.id === ticket.id ? next : t));
    toast.success(`Status updated to ${STATUS_META[status].label}`);
  };

  const addComment = () => {
    if (!comment.trim()) return;
    const next = {
      ...ticket,
      comments: [
        ...ticket.comments,
        {
          id: `c-${Date.now()}`,
          authorId: user.id,
          authorName: `${user.firstName} ${user.lastName}`,
          message: comment.trim(),
          createdAt: new Date().toISOString(),
        },
      ],
    };
    set("tickets", data.tickets.map((t) => t.id === ticket.id ? next : t));
    setComment("");
  };

  const canTransition = canAssignTicket(user) || ticket.assigneeId === user.id;
  const availableStatuses: TicketStatus[] = ["pending", "assigned", "completed", "hold", "closed", "reopen"];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => navigate("/ticketing/tickets")}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Ticket Details</h1>
        <div className="w-12" />
      </div>

      {/* TICKET CREATOR */}
      <Section title="TICKET CREATOR">
        <FieldGrid cols={3}>
          <Field label="Name" value={createdBy ? titleCase(`${createdBy.firstName} ${createdBy.lastName}`) : "—"} />
          <Field label="Email" value={createdBy ? titleCase(createdBy.email) : "—"} />
          <Field label="Created At" value={fmtDateTime(ticket.createdAt)} />
        </FieldGrid>
      </Section>

      {/* TICKET DETAILS */}
      <Section title="TICKET DETAILS">
        <FieldGrid cols={4}>
          <Field label="Ticket Id" value={`Ticket#${ticket.id.replace(/\D/g, "") || ticket.id}`} />
          <Field label="Category" value={titleCase(ticket.category)} />
          <Field label="Department Name" value={ticket.department} />
          <Field
            label="Status"
            value={
              <Badge variant="outline" className={STATUS_META[ticket.status].tone}>
                {STATUS_META[ticket.status].label}
              </Badge>
            }
          />
        </FieldGrid>
        <div className="mt-5">
          <FieldLabel>Description</FieldLabel>
          <p className="mt-1 text-sm">{ticket.description || "—"}</p>
        </div>
        <div className="mt-5">
          <FieldGrid cols={3}>
            <Field label="Market" value={market?.name ?? state?.name ?? "—"} />
            <Field label={ticket.category === "store" ? "Store" : "House"} value={loc?.name ?? "—"} />
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
        <div className="mt-5">
          <FieldLabel>Title</FieldLabel>
          <p className="mt-1 text-sm font-medium">{ticket.title}</p>
        </div>
      </Section>

      {/* AGENT DETAILS */}
      <Section title="AGENT DETAILS">
        <FieldGrid cols={4}>
          <Field
            label="Assigned By"
            value={assignedBy ? titleCase(`${assignedBy.firstName} ${assignedBy.lastName}`) : "—"}
          />
          <Field
            label="Assigned To"
            value={
              ticket.assignType === "external"
                ? (vendor ? `${vendor.name} (External)` : "—")
                : (assignee ? titleCase(`${assignee.firstName} ${assignee.lastName}`) : "—")
            }
          />
          <Field
            label="Email"
            value={
              ticket.assignType === "external"
                ? (vendor?.phone ?? "N/A")
                : (assignee?.email ?? "N/A")
            }
          />
          <Field
            label="Assigned At"
            value={lastAssignment ? fmtDateTime(lastAssignment.at) : "N/A"}
          />
        </FieldGrid>
      </Section>

      {/* Status changer */}
      {canTransition && (
        <Section title="UPDATE STATUS">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-muted-foreground">Change current status:</span>
            <Select value={ticket.status} onValueChange={(v) => updateStatus(v as TicketStatus)}>
              <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                {availableStatuses.map((s) => (
                  <SelectItem key={s} value={s}>{STATUS_META[s].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Section>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <Section title="ACTIVITY TIMELINE">
          <ol className="space-y-3">
            {ticket.history.map((h, i) => {
              const u = data.users.find((x) => x.id === h.by);
              return (
                <li key={i} className="flex gap-3 text-sm">
                  <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  <div>
                    <div>
                      <span className="font-medium">{STATUS_META[h.status].label}</span>
                      {" — "}
                      <span className="text-muted-foreground">{u ? `${u.firstName} ${u.lastName}` : h.by}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      <Clock className="mr-1 inline h-3 w-3" />{fmtDateTime(h.at)}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </Section>

        <Section title="COMMENTS">
          <div className="space-y-3 overflow-y-auto pr-1" style={{ maxHeight: 280 }}>
            {ticket.comments.length === 0 && (
              <p className="text-sm text-muted-foreground">No comments yet.</p>
            )}
            {ticket.comments.map((c) => (
              <div key={c.id} className="rounded-lg border bg-card p-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium">{c.authorName}</span>
                  <span className="text-muted-foreground">{fmtDateTime(c.createdAt)}</span>
                </div>
                <p className="mt-1 text-sm">{c.message}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 space-y-2">
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Write a comment..."
              rows={2}
            />
            <Button onClick={addComment} disabled={!comment.trim()} size="sm">
              <MessageSquare className="mr-1.5 h-4 w-4" /> Post comment
            </Button>
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-2 text-xs font-semibold tracking-[0.18em] text-primary">{title}</h2>
      <Card className="p-5">{children}</Card>
    </div>
  );
}

function FieldGrid({ cols, children }: { cols: 2 | 3 | 4; children: React.ReactNode }) {
  const cls = cols === 4
    ? "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
    : cols === 3
    ? "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
    : "grid grid-cols-1 gap-4 sm:grid-cols-2";
  return <div className={cls}>{children}</div>;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-xs font-medium text-muted-foreground">{children}</div>;
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className="mt-1 text-sm font-medium">{value}</div>
    </div>
  );
}
