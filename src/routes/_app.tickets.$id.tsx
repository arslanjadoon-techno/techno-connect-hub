import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
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

export const Route = createFileRoute("/_app/tickets/$id")({
  head: () => ({ meta: [{ title: "Ticket — Techno Ticket Portal" }] }),
  component: TicketDetail,
});

function TicketDetail() {
  const { id } = Route.useParams();
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
        <Button asChild className="mt-4"><Link to="/tickets">Back to tickets</Link></Button>
      </div>
    );
  }

  const store = data.stores.find((s) => s.id === ticket.locationId);
  const house = data.houses.find((h) => h.id === ticket.locationId);
  const loc = store ?? house;
  const assignee = data.users.find((u) => u.id === ticket.assigneeId);
  const vendor = data.vendors.find((v) => v.id === ticket.externalVendorId);
  const createdBy = data.users.find((u) => u.id === ticket.createdById);

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
    <div className="mx-auto max-w-5xl space-y-5">
      <button onClick={() => navigate({ to: "/tickets" })} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to tickets
      </button>

      <Card className="overflow-hidden p-0">
        <div
          className="border-b p-6"
          style={{ backgroundImage: "linear-gradient(135deg, color-mix(in oklab, var(--primary) 8%, transparent), transparent)" }}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="font-mono text-xs text-muted-foreground">{ticket.id}</div>
              <h1 className="mt-1 font-display text-2xl font-semibold">{ticket.title}</h1>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{ticket.description}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className={PRIORITY_META[ticket.priority].tone}>{PRIORITY_META[ticket.priority].label}</Badge>
              <Badge variant="outline" className={STATUS_META[ticket.status].tone}>{STATUS_META[ticket.status].label}</Badge>
            </div>
          </div>
        </div>

        <div className="grid gap-6 p-6 md:grid-cols-3">
          <Field label="Department" value={ticket.department} />
          <Field label="Category" value={<span className="capitalize">{ticket.category}</span>} />
          <Field label="Location" value={loc?.name ?? "—"} />
          <Field label="Created by" value={createdBy ? `${createdBy.firstName} ${createdBy.lastName}` : "—"} />
          <Field
            label="Assigned to"
            value={
              ticket.assignType === "external"
                ? (vendor ? `${vendor.name} (External)` : "External")
                : (assignee ? `${assignee.firstName} ${assignee.lastName}` : "Unassigned")
            }
          />
          <Field label="Last updated" value={new Date(ticket.updatedAt).toLocaleString()} />
        </div>

        {canTransition && (
          <div className="flex flex-wrap items-center gap-2 border-t bg-muted/30 p-4">
            <span className="text-sm font-medium">Change status:</span>
            <Select value={ticket.status} onValueChange={(v) => updateStatus(v as TicketStatus)}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                {availableStatuses.map((s) => (
                  <SelectItem key={s} value={s}>{STATUS_META[s].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="mb-3 flex items-center gap-2 font-display font-semibold">
            <Clock className="h-4 w-4" /> Activity timeline
          </h3>
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
                    <div className="text-xs text-muted-foreground">{new Date(h.at).toLocaleString()}</div>
                  </div>
                </li>
              );
            })}
          </ol>
        </Card>

        <Card className="flex flex-col p-5">
          <h3 className="mb-3 flex items-center gap-2 font-display font-semibold">
            <MessageSquare className="h-4 w-4" /> Comments
          </h3>
          <div className="flex-1 space-y-3 overflow-y-auto pr-1" style={{ maxHeight: 280 }}>
            {ticket.comments.length === 0 && (
              <p className="text-sm text-muted-foreground">No comments yet.</p>
            )}
            {ticket.comments.map((c) => (
              <div key={c.id} className="rounded-lg border bg-card p-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium">{c.authorName}</span>
                  <span className="text-muted-foreground">{new Date(c.createdAt).toLocaleString()}</span>
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
            <Button onClick={addComment} disabled={!comment.trim()} size="sm">Post comment</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-medium">{value}</div>
    </div>
  );
}
