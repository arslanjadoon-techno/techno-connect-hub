import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useData } from "@/lib/data-store";
import { canCreateTicket, visibleTickets } from "@/lib/permissions";
import {
  ALL_DEPARTMENTS, PRIORITY_META, STATUS_META,
  type Ticket, type TicketCategory, type TicketPriority, type TicketStatus,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader,
  DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { DataTable, type Column } from "@/components/data-table";
import { Plus, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/tickets")({
  head: () => ({ meta: [{ title: "Tickets — Techno Ticket Portal" }] }),
  component: TicketsPage,
});

function TicketsPage() {
  const { user } = useAuth();
  const { data, set } = useData();
  const [open, setOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "all">("all");
  if (!user) return null;

  const myTickets = useMemo(() => visibleTickets(user, data.tickets), [user, data.tickets]);
  const filtered = useMemo(
    () => statusFilter === "all" ? myTickets : myTickets.filter((t) => t.status === statusFilter),
    [myTickets, statusFilter],
  );

  const locationName = (t: Ticket) => {
    if (t.category === "store") {
      return data.stores.find((s) => s.id === t.locationId)?.name ?? "—";
    }
    return data.houses.find((h) => h.id === t.locationId)?.name ?? "—";
  };

  const assigneeName = (t: Ticket) => {
    if (t.assignType === "external" && t.externalVendorId) {
      const v = data.vendors.find((x) => x.id === t.externalVendorId);
      return v ? `${v.name} (External)` : "External";
    }
    if (t.assigneeId) {
      const u = data.users.find((x) => x.id === t.assigneeId);
      return u ? `${u.firstName} ${u.lastName}` : "—";
    }
    return "Unassigned";
  };

  const columns: Column<Ticket>[] = [
    {
      key: "id", header: "ID", searchValue: (t) => t.id,
      accessor: (t) => (
        <Link to="/tickets/$id" params={{ id: t.id }} className="font-mono text-xs font-medium text-primary hover:underline">
          {t.id}
        </Link>
      ),
    },
    {
      key: "title", header: "Title",
      searchValue: (t) => `${t.title} ${t.description}`,
      accessor: (t) => (
        <div>
          <div className="font-medium">{t.title}</div>
          <div className="line-clamp-1 text-xs text-muted-foreground">{t.description}</div>
        </div>
      ),
    },
    {
      key: "dept", header: "Department",
      searchValue: (t) => t.department,
      accessor: (t) => <span className="text-sm">{t.department}</span>,
    },
    {
      key: "loc", header: "Location",
      searchValue: (t) => locationName(t),
      accessor: (t) => (
        <div className="text-sm">
          <div>{locationName(t)}</div>
          <div className="text-xs text-muted-foreground capitalize">{t.category}</div>
        </div>
      ),
    },
    {
      key: "assignee", header: "Assignee",
      searchValue: (t) => assigneeName(t),
      accessor: (t) => <span className="text-sm">{assigneeName(t)}</span>,
    },
    {
      key: "priority", header: "Priority",
      searchValue: (t) => t.priority,
      accessor: (t) => <Badge variant="outline" className={PRIORITY_META[t.priority].tone}>{PRIORITY_META[t.priority].label}</Badge>,
    },
    {
      key: "status", header: "Status",
      searchValue: (t) => t.status,
      accessor: (t) => <Badge variant="outline" className={STATUS_META[t.status].tone}>{STATUS_META[t.status].label}</Badge>,
    },
    {
      key: "action", header: "", className: "w-12",
      accessor: (t) => (
        <Link to="/tickets/$id" params={{ id: t.id }} className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted">
          <ExternalLink className="h-4 w-4" />
        </Link>
      ),
    },
  ];

  const handleCreate = (t: Ticket) => {
    set("tickets", [t, ...data.tickets]);
    toast.success(`Ticket ${t.id} created`);
    setOpen(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Tickets</h1>
          <p className="text-sm text-muted-foreground">
            {filtered.length} ticket{filtered.length === 1 ? "" : "s"} visible to you.
          </p>
        </div>
        {canCreateTicket(user) && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-1 h-4 w-4" /> New Ticket</Button>
            </DialogTrigger>
            <CreateTicketDialog onCreate={handleCreate} />
          </Dialog>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <FilterChip label="All" active={statusFilter === "all"} onClick={() => setStatusFilter("all")} />
        {(Object.keys(STATUS_META) as TicketStatus[]).map((s) => (
          <FilterChip key={s} label={STATUS_META[s].label} active={statusFilter === s} onClick={() => setStatusFilter(s)} />
        ))}
      </div>

      <DataTable
        rows={filtered}
        columns={columns}
        rowKey={(t) => t.id}
        searchPlaceholder="Search tickets, location, assignee..."
      />
    </div>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
        active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-accent"
      }`}
    >
      {label}
    </button>
  );
}

function CreateTicketDialog({ onCreate }: { onCreate: (t: Ticket) => void }) {
  const { user } = useAuth();
  const { data } = useData();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [department, setDepartment] = useState(ALL_DEPARTMENTS[0]);
  const [priority, setPriority] = useState<TicketPriority>("medium");
  const [category, setCategory] = useState<TicketCategory>("store");
  const [locationId, setLocationId] = useState("");
  const [assignType, setAssignType] = useState<"internal" | "external" | "none">("none");
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [externalVendorId, setExternalVendorId] = useState<string>("");

  if (!user) return null;
  const locOptions = category === "store" ? data.stores : data.houses;
  const internalUsers = data.users.filter((u) => u.department === department);

  const submit = () => {
    if (!title.trim() || !locationId) {
      toast.error("Please fill in title and location");
      return;
    }
    const id = `TKT-${1000 + data.tickets.length + 1}`;
    const loc = locOptions.find((l) => l.id === locationId);
    const status: TicketStatus = assignType !== "none" && (assigneeId || externalVendorId) ? "assigned" : "pending";

    const stateId =
      category === "store"
        ? (loc as typeof data.stores[number] | undefined)?.stateId ?? user.stateId ?? data.states[0].id
        : (loc as typeof data.houses[number] | undefined)?.stateId ?? user.stateId ?? data.states[0].id;

    const store = category === "store" ? data.stores.find((s) => s.id === locationId) : undefined;

    const ticket: Ticket = {
      id, title, description,
      category, locationId,
      department, priority, status,
      createdById: user.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      assignType: assignType === "none" ? undefined : assignType,
      assigneeId: assignType === "internal" ? assigneeId || undefined : undefined,
      externalVendorId: assignType === "external" ? externalVendorId || undefined : undefined,
      stateId,
      marketId: store?.marketId,
      districtId: store?.districtId,
      history: [
        { status: "pending", at: new Date().toISOString(), by: user.id },
        ...(status === "assigned" ? [{ status: "assigned" as TicketStatus, at: new Date().toISOString(), by: user.id }] : []),
      ],
      comments: [],
    };
    onCreate(ticket);
  };

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>Create new ticket</DialogTitle>
        <DialogDescription>Describe the issue and assign it to the right team.</DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2 space-y-1.5">
          <Label>Title *</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Short summary..." />
        </div>
        <div className="sm:col-span-2 space-y-1.5">
          <Label>Description</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
        </div>

        <div className="space-y-1.5">
          <Label>Category *</Label>
          <Select value={category} onValueChange={(v) => { setCategory(v as TicketCategory); setLocationId(""); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="store">Store</SelectItem>
              <SelectItem value="house">House / Office</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>{category === "store" ? "Store *" : "House *"}</Label>
          <Select value={locationId} onValueChange={setLocationId}>
            <SelectTrigger><SelectValue placeholder={`Select a ${category}`} /></SelectTrigger>
            <SelectContent>
              {locOptions.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Department *</Label>
          <Select value={department} onValueChange={(v) => setDepartment(v as typeof department)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {ALL_DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Priority</Label>
          <Select value={priority} onValueChange={(v) => setPriority(v as TicketPriority)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Assignment</Label>
          <Select value={assignType} onValueChange={(v) => setAssignType(v as typeof assignType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Leave unassigned</SelectItem>
              <SelectItem value="internal">Internal team member</SelectItem>
              <SelectItem value="external">External vendor</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {assignType === "internal" && (
          <div className="space-y-1.5">
            <Label>Assignee</Label>
            <Select value={assigneeId} onValueChange={setAssigneeId}>
              <SelectTrigger><SelectValue placeholder="Select team member" /></SelectTrigger>
              <SelectContent>
                {internalUsers.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.firstName} {u.lastName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {assignType === "external" && (
          <div className="space-y-1.5">
            <Label>External Vendor</Label>
            <Select value={externalVendorId} onValueChange={setExternalVendorId}>
              <SelectTrigger><SelectValue placeholder="Select vendor" /></SelectTrigger>
              <SelectContent>
                {data.vendors.map((v) => (
                  <SelectItem key={v.id} value={v.id}>{v.name} — {v.natureOfWork}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <DialogFooter>
        <Button onClick={submit}>Create ticket</Button>
      </DialogFooter>
    </DialogContent>
  );
}
