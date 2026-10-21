import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useData } from "@/lib/data-store";
import { canCreateTicket } from "@/lib/permissions";
import {
  ALL_DEPARTMENTS,
  PRIORITY_META,
  STATUS_META,
  type Department,
  type Ticket,
  type TicketCategory,
  type TicketPriority,
  type TicketStatus,
  type TicketAttachment,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DataTable, type Column } from "@/components/data-table";
import { FilterReset } from "@/components/filter-reset";
import {
  Plus,
  Calendar as CalendarIcon,
  X,
  Download,
  Paperclip,
  UploadCloud,
  FileText,
  Image as ImageIcon,
} from "lucide-react";
import type { DateRange } from "react-day-picker";
import { toast } from "sonner";
import { ticketingService } from "@/services/portals/ticketing/ticketing.service";

type StatusSearch = TicketStatus | "all";
const STATUS_KEYS: StatusSearch[] = [
  "all",
  "pending",
  "assigned",
  "completed",
  "hold",
  "closed",
  "reopen",
];

// Fallback options for store and house locations
const DEFAULT_STORES = [
  { id: "store-101", name: "Store #101 - Uptown Dallas", market: "Dallas North" },
  { id: "store-102", name: "Store #102 - Galleria Mall", market: "Dallas North" },
  { id: "store-103", name: "Store #103 - Downtown Houston", market: "Houston Central" },
  { id: "store-104", name: "Store #104 - The Woodlands", market: "Houston Central" },
  { id: "store-105", name: "Store #105 - Domain Austin", market: "Austin Metro" },
  { id: "store-106", name: "Store #106 - Riverwalk Center", market: "San Antonio" },
];

const DEFAULT_HOUSES = [
  { id: "house-201", name: "HQ Building A - Executive Suite", market: "Dallas North" },
  { id: "house-202", name: "Regional Dispatch Center #2", market: "Houston Central" },
  { id: "house-203", name: "Austin Logistics Hub", market: "Austin Metro" },
  { id: "house-204", name: "San Antonio Field Office", market: "San Antonio" },
];

const INTERNAL_MEMBERS = [
  { id: "usr-1", name: "Alex Rivera", role: "IT Systems" },
  { id: "usr-2", name: "David Kim", role: "Finance Operations" },
  { id: "usr-3", name: "Jessica Taylor", role: "HR People Team" },
  { id: "usr-4", name: "Sarah Jenkins", role: "Operations Supervisor" },
  { id: "usr-5", name: "Elena Rostova", role: "Senior Systems Engineer" },
  { id: "usr-6", name: "Marcus Vance", role: "Security & Facility" },
];

const EXTERNAL_SOLVERS = [
  { id: "ext-1", name: "CoolAir Mechanical Pro", specialty: "HVAC & Climate" },
  { id: "ext-2", name: "Apex Plumbing Solutions", specialty: "Plumbing & Drainage" },
  { id: "ext-3", name: "SafeShield Systems", specialty: "Security & Access Keypads" },
  { id: "ext-4", name: "MasterLock & Hardware Co.", specialty: "Locks & Entryways" },
  { id: "ext-5", name: "VoltCore Electricians", specialty: "Electrical & Power" },
  { id: "ext-6", name: "NextGen Telecom Networks", specialty: "Fiber & ISP" },
];

// 10 realistic dummy static records matching exact specs:
// - Category is strictly "Store" or "House"
// - Team Type is strictly "Internal" or "External"
const STATIC_DUMMY_TICKETS: Ticket[] = [
  {
    id: "TKT-1001",
    title: "POS Terminal network disconnection at checkout #3",
    description: "Cashier unable to process card transactions; LAN cable was verified but IP not assigned.",
    category: "store",
    locationId: "store-101",
    department: "IT",
    marketName: "Dallas North",
    priority: "high",
    status: "assigned",
    createdById: "u-1",
    creatorName: "John Doe",
    teamType: "Internal",
    solverName: "Alex Rivera",
    stateId: "tx",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
    updatedAt: new Date().toISOString(),
    history: [],
    comments: [],
  },
  {
    id: "TKT-1002",
    title: "Main HVAC cooling failure in showroom",
    description: "Thermostat throwing error code E-42, ambient temperature reached 84°F.",
    category: "store",
    locationId: "store-103",
    department: "Operations",
    marketName: "Houston Central",
    priority: "urgent",
    status: "pending",
    createdById: "u-2",
    creatorName: "Sarah Jenkins",
    teamType: "External",
    solverName: "CoolAir Mechanical Pro",
    stateId: "tx",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    updatedAt: new Date().toISOString(),
    history: [],
    comments: [],
  },
  {
    id: "TKT-1003",
    title: "Water leak in executive restroom",
    description: "Pipe fitting loose under the vanity cabinet causing pooling on flooring.",
    category: "house",
    locationId: "house-203",
    department: "Maintenance",
    marketName: "Austin Metro",
    priority: "medium",
    status: "assigned",
    createdById: "u-3",
    creatorName: "Robert Chen",
    teamType: "External",
    solverName: "Apex Plumbing Solutions",
    stateId: "tx",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    updatedAt: new Date().toISOString(),
    history: [],
    comments: [],
  },
  {
    id: "TKT-1004",
    title: "Discrepancy in monthly store expense ledger",
    description: "Petty cash receipts do not match register balance closing for week 41.",
    category: "store",
    locationId: "store-102",
    department: "Finance",
    marketName: "Dallas North",
    priority: "low",
    status: "completed",
    createdById: "u-4",
    creatorName: "Emily Watson",
    teamType: "Internal",
    solverName: "David Kim",
    stateId: "tx",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(),
    updatedAt: new Date().toISOString(),
    history: [],
    comments: [],
  },
  {
    id: "TKT-1005",
    title: "Security gate electronic keypad malfunction",
    description: "Entry gate code buzzer unresponsive after power surge yesterday evening.",
    category: "house",
    locationId: "house-204",
    department: "Security",
    marketName: "San Antonio",
    priority: "high",
    status: "pending",
    createdById: "u-5",
    creatorName: "Marcus Vance",
    teamType: "External",
    solverName: "SafeShield Systems",
    stateId: "tx",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    updatedAt: new Date().toISOString(),
    history: [],
    comments: [],
  },
  {
    id: "TKT-1006",
    title: "Inventory barcode handheld scanner firmware update",
    description: "Zebra scanners need batch patch for new warehouse SKU format compliance.",
    category: "store",
    locationId: "store-104",
    department: "IT",
    marketName: "Houston Central",
    priority: "medium",
    status: "completed",
    createdById: "u-6",
    creatorName: "Elena Rostova",
    teamType: "Internal",
    solverName: "Alex Rivera",
    stateId: "tx",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
    updatedAt: new Date().toISOString(),
    history: [],
    comments: [],
  },
  {
    id: "TKT-1007",
    title: "Onboarding badge and biometric registration for new hires",
    description: "Three incoming shift supervisors need biometric terminal clearance by Monday.",
    category: "house",
    locationId: "house-201",
    department: "HR",
    marketName: "Dallas North",
    priority: "low",
    status: "assigned",
    createdById: "u-7",
    creatorName: "Carlos Mendoza",
    teamType: "Internal",
    solverName: "Jessica Taylor",
    stateId: "tx",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 96).toISOString(),
    updatedAt: new Date().toISOString(),
    history: [],
    comments: [],
  },
  {
    id: "TKT-1008",
    title: "Glass display case lock mechanism stuck",
    description: "High-value accessory cabinet lock jammed, keys rotating without disengaging catch.",
    category: "store",
    locationId: "store-106",
    department: "Maintenance",
    marketName: "San Antonio",
    priority: "medium",
    status: "hold",
    createdById: "u-8",
    creatorName: "Zackary Bell",
    teamType: "External",
    solverName: "MasterLock & Hardware Co.",
    stateId: "tx",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 120).toISOString(),
    updatedAt: new Date().toISOString(),
    history: [],
    comments: [],
  },
  {
    id: "TKT-1009",
    title: "Fiber broadband backup failover testing",
    description: "Scheduled monthly failover validation to LTE cradlepoint secondary link.",
    category: "store",
    locationId: "store-105",
    department: "IT",
    marketName: "Austin Metro",
    priority: "low",
    status: "closed",
    createdById: "u-2",
    creatorName: "Sarah Jenkins",
    teamType: "Internal",
    solverName: "Alex Rivera",
    stateId: "tx",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 144).toISOString(),
    updatedAt: new Date().toISOString(),
    history: [],
    comments: [],
  },
  {
    id: "TKT-1010",
    title: "Main office emergency exit signage illumination failure",
    description: "Battery backup indicator blinking amber, regulatory compliance inspection in 3 days.",
    category: "house",
    locationId: "house-202",
    department: "Operations",
    marketName: "Houston Central",
    priority: "urgent",
    status: "reopen",
    createdById: "u-3",
    creatorName: "Robert Chen",
    teamType: "External",
    solverName: "VoltCore Electricians",
    stateId: "tx",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 168).toISOString(),
    updatedAt: new Date().toISOString(),
    history: [],
    comments: [],
  },
];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function TicketsPage() {
  const { user } = useAuth();
  const { data, set } = useData();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawStatus = searchParams.get("status") as StatusSearch | null;
  const search = {
    status: (rawStatus && STATUS_KEYS.includes(rawStatus) ? rawStatus : "all") as StatusSearch,
  };

  const [open, setOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusSearch>(search.status);
  const [deptFilter, setDeptFilter] = useState<Department | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [teamTypeFilter, setTeamTypeFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  // In-memory list initialized with the 10 static dummy tickets plus any user created tickets
  const [ticketsList, setTicketsList] = useState<Ticket[]>(() => {
    // If data.tickets already has items, merge them without duplicating dummy ids
    const existing = data.tickets || [];
    const dummyIds = new Set(STATIC_DUMMY_TICKETS.map((t) => t.id));
    const customOnly = existing.filter((t) => !dummyIds.has(t.id));
    return [...customOnly, ...STATIC_DUMMY_TICKETS];
  });

  // Sync URL -> state
  useEffect(() => {
    setStatusFilter(search.status);
  }, [search.status]);

  const setStatus = (s: StatusSearch) => {
    setStatusFilter(s);
    setSearchParams({ status: s }, { replace: true });
  };

  // Filtered rows
  const filtered = useMemo(() => {
    const from = dateRange?.from ? new Date(dateRange.from).setHours(0, 0, 0, 0) : null;
    const to = dateRange?.to
      ? new Date(dateRange.to).setHours(23, 59, 59, 999)
      : dateRange?.from
        ? new Date(dateRange.from).setHours(23, 59, 59, 999)
        : null;

    return ticketsList.filter((t) => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (deptFilter !== "all" && t.department !== deptFilter) return false;
      if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
      if (categoryFilter !== "all") {
        const cat = t.category?.toLowerCase();
        if (categoryFilter === "store" && cat !== "store") return false;
        if (categoryFilter === "house" && cat !== "house") return false;
      }
      if (teamTypeFilter !== "all") {
        const tt = t.teamType?.toLowerCase() || (t.assignType === "external" ? "external" : "internal");
        if (teamTypeFilter === "internal" && tt !== "internal") return false;
        if (teamTypeFilter === "external" && tt !== "external") return false;
      }
      const created = new Date(t.createdAt).getTime();
      if (from !== null && created < from) return false;
      if (to !== null && created > to) return false;
      return true;
    });
  }, [ticketsList, statusFilter, deptFilter, priorityFilter, categoryFilter, teamTypeFilter, dateRange]);

  // Handler for adding new ticket
  const handleCreate = (newTicket: Ticket) => {
    setTicketsList((prev) => [newTicket, ...prev]);
    set("tickets", [newTicket, ...data.tickets]);
    toast.success("Ticket created successfully!");
    setOpen(false);
  };

  // EXACT 9 COLUMNS REQUIRED BY USER:
  // T-ID, Title, Department, Market, Priority, Creator, Category, Team Type, Solver Name
  const columns: Column<Ticket>[] = [
    {
      key: "id",
      header: "T-ID",
      searchValue: (t) => t.id,
      accessor: (t) => (
        <span className="font-mono text-xs font-semibold text-primary">{t.id}</span>
      ),
    },
    {
      key: "title",
      header: "Title",
      searchValue: (t) => `${t.title} ${t.description || ""}`,
      accessor: (t) => (
        <div className="max-w-xs sm:max-w-sm">
          <div className="font-medium text-foreground">{t.title}</div>
          {t.description && (
            <div className="line-clamp-1 text-xs text-muted-foreground">{t.description}</div>
          )}
        </div>
      ),
    },
    {
      key: "department",
      header: "Department",
      searchValue: (t) => t.department,
      accessor: (t) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted text-foreground">
          {t.department}
        </span>
      ),
    },
    {
      key: "market",
      header: "Market",
      searchValue: (t) => t.marketName || "",
      accessor: (t) => (
        <span className="text-sm font-medium text-foreground">
          {t.marketName || "—"}
        </span>
      ),
    },
    {
      key: "priority",
      header: "Priority",
      searchValue: (t) => t.priority,
      accessor: (t) => (
        <Badge variant="outline" className={PRIORITY_META[t.priority]?.tone}>
          {PRIORITY_META[t.priority]?.label || t.priority}
        </Badge>
      ),
    },
    {
      key: "creator",
      header: "Creator",
      searchValue: (t) => t.creatorName || "",
      accessor: (t) => (
        <span className="text-sm font-medium text-foreground">
          {t.creatorName || "—"}
        </span>
      ),
    },
    {
      key: "category",
      header: "Category",
      searchValue: (t) => (t.category?.toLowerCase() === "store" ? "Store" : "House"),
      accessor: (t) => {
        const isStore = t.category?.toLowerCase() === "store";
        return (
          <Badge
            variant="outline"
            className={
              isStore
                ? "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-400"
                : "border-purple-300 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-950/40 dark:text-purple-400"
            }
          >
            {isStore ? "Store" : "House"}
          </Badge>
        );
      },
    },
    {
      key: "teamType",
      header: "Team Type",
      searchValue: (t) => {
        const isExternal =
          t.teamType?.toLowerCase() === "external" || t.assignType === "external";
        return isExternal ? "External" : "Internal";
      },
      accessor: (t) => {
        const isExternal =
          t.teamType?.toLowerCase() === "external" || t.assignType === "external";
        return (
          <Badge
            variant="outline"
            className={
              isExternal
                ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-400"
                : "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400"
            }
          >
            {isExternal ? "External" : "Internal"}
          </Badge>
        );
      },
    },
    {
      key: "solverName",
      header: "Solver Name",
      searchValue: (t) => t.solverName || "",
      accessor: (t) => (
        <span className="text-sm font-medium text-foreground">
          {t.solverName || "—"}
        </span>
      ),
    },
  ];

  if (!user) return null;

  const hasActiveFilters =
    statusFilter !== "all" ||
    deptFilter !== "all" ||
    priorityFilter !== "all" ||
    categoryFilter !== "all" ||
    teamTypeFilter !== "all" ||
    !!dateRange;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Tickets</h1>
          <p className="text-sm text-muted-foreground">
            {filtered.length} ticket{filtered.length === 1 ? "" : "s"} visible to you.
          </p>
        </div>

        {/* Action buttons: Export button placed right before New Ticket */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // Export handler placeholder for upcoming backend API integration
              toast.info("Export functionality will be enabled with the backend API integration.");
            }}
            className="h-9 gap-1.5"
          >
            <Download className="h-4 w-4 text-muted-foreground" />
            Export
          </Button>

          {canCreateTicket(user) && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-9 gap-1.5">
                  <Plus className="h-4 w-4" /> New Ticket
                </Button>
              </DialogTrigger>
              <CreateTicketDialog onCreate={handleCreate} />
            </Dialog>
          )}
        </div>
      </div>

      {/* Status filter chips */}
      <div className="flex flex-wrap gap-2">
        <FilterChip label="All" active={statusFilter === "all"} onClick={() => setStatus("all")} />
        {(Object.keys(STATUS_META) as TicketStatus[]).map((s) => (
          <FilterChip
            key={s}
            label={s === "pending" ? "Created" : STATUS_META[s].label}
            active={statusFilter === s}
            onClick={() => setStatus(s)}
          />
        ))}
      </div>

      {/* Filter toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <DateRangePicker value={dateRange} onChange={setDateRange} />
        <FilterSelect
          value={deptFilter}
          onChange={(v) => setDeptFilter(v as typeof deptFilter)}
          placeholder="Department"
          options={[
            { value: "all", label: "All departments" },
            ...ALL_DEPARTMENTS.map((d) => ({ value: d, label: d })),
          ]}
        />
        <FilterSelect
          value={categoryFilter}
          onChange={setCategoryFilter}
          placeholder="Category"
          options={[
            { value: "all", label: "All categories" },
            { value: "store", label: "Store" },
            { value: "house", label: "House / Office" },
          ]}
        />
        <FilterSelect
          value={teamTypeFilter}
          onChange={setTeamTypeFilter}
          placeholder="Team Type"
          options={[
            { value: "all", label: "All team types" },
            { value: "internal", label: "Internal" },
            { value: "external", label: "External" },
          ]}
        />
        <FilterSelect
          value={priorityFilter}
          onChange={(v) => setPriorityFilter(v as typeof priorityFilter)}
          placeholder="Priority"
          options={[
            { value: "all", label: "All priorities" },
            ...(Object.keys(PRIORITY_META) as TicketPriority[]).map((p) => ({
              value: p,
              label: PRIORITY_META[p].label,
            })),
          ]}
        />
        <FilterReset
          active={hasActiveFilters}
          onReset={() => {
            setStatus("all");
            setDeptFilter("all");
            setPriorityFilter("all");
            setCategoryFilter("all");
            setTeamTypeFilter("all");
            setDateRange(undefined);
          }}
        />
      </div>

      <DataTable
        rows={filtered}
        columns={columns}
        rowKey={(t) => t.id}
        searchPlaceholder="Search tickets by ID, title, market, department, solver..."
        onRowClick={(t) => navigate(`/ticketing/tickets/${t.id}`)}
      />
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9 w-[170px]">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function DateRangePicker({
  value,
  onChange,
}: {
  value: DateRange | undefined;
  onChange: (v: DateRange | undefined) => void;
}) {
  const fmt = (d: Date) =>
    d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  const label = value?.from
    ? value.to && value.to.getTime() !== value.from.getTime()
      ? `${fmt(value.from)} — ${fmt(value.to)}`
      : fmt(value.from)
    : "All time";
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 justify-start gap-2 px-3 font-normal">
          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          <span className="truncate">{label}</span>
          {value?.from && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onChange(undefined);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.stopPropagation();
                  onChange(undefined);
                }
              }}
              className="ml-1 -mr-1 inline-flex h-4 w-4 items-center justify-center rounded hover:bg-muted"
              aria-label="Clear date range"
            >
              <X className="h-3 w-3" />
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          numberOfMonths={2}
          selected={value}
          onSelect={onChange}
          initialFocus
          className="pointer-events-auto"
        />
      </PopoverContent>
    </Popover>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card hover:bg-accent"
      }`}
    >
      {label}
    </button>
  );
}

/**
 * Add Ticket Modal Component
 * Features:
 * - Title * & Description
 * - Category * (Store or House)
 * - Location * (Store / House selector)
 * - Department *
 * - Priority
 * - Team Type (renamed from Assignment): "Leave unassigned" (default), "Internal", "External"
 * - Assignee dropdown: ALWAYS visible!
 *     - If "Leave unassigned": disabled / not required.
 *     - If "Internal": required with internal team members list.
 *     - If "External": required with external vendors list.
 * - Attachments: users can attach images and PDF files with removal capability.
 */
function CreateTicketDialog({ onCreate }: { onCreate: (t: Ticket) => void }) {
  const { user } = useAuth();
  const { data } = useData();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [department, setDepartment] = useState(ALL_DEPARTMENTS[0]);
  const [priority, setPriority] = useState<TicketPriority>("medium");
  const [category, setCategory] = useState<TicketCategory>("store");
  const [locationId, setLocationId] = useState("");
  const [teamType, setTeamType] = useState<"none" | "internal" | "external">("none");
  const [assignee, setAssignee] = useState<string>("");
  const [attachments, setAttachments] = useState<TicketAttachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!user) return null;

  // Location options combining backend data if available, with robust defaults
  const locOptions = useMemo(() => {
    if (category === "store") {
      return data.stores && data.stores.length > 0
        ? data.stores.map((s) => ({
            id: s.id,
            name: s.name,
            market: data.markets.find((m) => String(m.id) === String(s.marketId))?.name || "Dallas North",
          }))
        : DEFAULT_STORES;
    }
    return data.houses && data.houses.length > 0
      ? data.houses.map((h) => ({
          id: h.id,
          name: h.name,
          market: data.markets.find((m) => String(m.id) === String(h.marketId))?.name || "Dallas North",
        }))
      : DEFAULT_HOUSES;
  }, [category, data.stores, data.houses, data.markets]);

  // Internal team members list
  const internalOptions = useMemo(() => {
    if (data.users && data.users.length > 0) {
      return data.users.map((u) => ({
        id: u.id,
        name: `${u.firstName} ${u.lastName}`.trim(),
        role: u.department || "Operations",
      }));
    }
    return INTERNAL_MEMBERS;
  }, [data.users]);

  // External solvers / vendors list
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newAttachments: TicketAttachment[] = Array.from(files).map((f) => ({
      id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: f.name,
      size: f.size,
      type: f.type,
    }));

    setAttachments((prev) => [...prev, ...newAttachments]);
    // Reset file input value to allow selecting same file again if desired
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    const newAttachments: TicketAttachment[] = Array.from(files).map((f) => ({
      id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: f.name,
      size: f.size,
      type: f.type,
    }));

    setAttachments((prev) => [...prev, ...newAttachments]);
  };

  const submit = async () => {
    // Form validations
    if (!title.trim()) {
      toast.error("Please enter a ticket title.");
      return;
    }
    if (!locationId) {
      toast.error(`Please select a ${category === "store" ? "Store" : "House / Office"}.`);
      return;
    }
    if (teamType === "internal" && !assignee.trim()) {
      toast.error("Please select an internal team member as Assignee.");
      return;
    }
    if (teamType === "external" && !assignee.trim()) {
      toast.error("Please select an external solver as Assignee.");
      return;
    }

    const selectedLoc = locOptions.find((l) => l.id === locationId);
    const marketName = selectedLoc?.market || "Dallas North";
    const resolvedSolver = teamType === "none" ? "Unassigned" : assignee;
    const resolvedTeamType: "Internal" | "External" =
      teamType === "external" ? "External" : "Internal";
    const id = `TKT-${Math.floor(1011 + Math.random() * 900)}`;

    const newTicket: Ticket = {
      id,
      title: title.trim(),
      description: description.trim(),
      category,
      locationId,
      department,
      priority,
      status: teamType !== "none" ? "assigned" : "pending",
      createdById: user.id,
      creatorName: `${user.firstName} ${user.lastName}`.trim() || "Admin User",
      marketName,
      teamType: resolvedTeamType,
      solverName: resolvedSolver,
      assignType: teamType === "none" ? undefined : teamType,
      stateId: user.stateId || "tx",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      attachments: attachments.length > 0 ? attachments : undefined,
      history: [
        { status: "pending", at: new Date().toISOString(), by: user.id },
        ...(teamType !== "none"
          ? [{ status: "assigned" as TicketStatus, at: new Date().toISOString(), by: user.id }]
          : []),
      ],
      comments: [],
    };

    // Forward through standard service class pattern
    try {
      // Prepared for backend API endpoint
      // await ticketingService.createTicket({ ... });
    } catch {
      // In-memory fallback
    }

    onCreate(newTicket);
  };

  return (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Create New Ticket</DialogTitle>
        <DialogDescription>
          Fill in ticket details, specify location, assign team solver, and attach any relevant documents.
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 sm:grid-cols-2 pt-2">
        {/* Title */}
        <div className="sm:col-span-2 space-y-1.5">
          <Label className="font-medium">
            Title <span className="text-destructive">*</span>
          </Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. POS terminal network connection issue..."
          />
        </div>

        {/* Description */}
        <div className="sm:col-span-2 space-y-1.5">
          <Label className="font-medium">Description</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Provide context, symptom details, error codes..."
            rows={3}
          />
        </div>

        {/* Category: Store or House */}
        <div className="space-y-1.5">
          <Label className="font-medium">
            Category <span className="text-destructive">*</span>
          </Label>
          <Select
            value={category}
            onValueChange={(v) => {
              setCategory(v as TicketCategory);
              setLocationId("");
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="store">Store</SelectItem>
              <SelectItem value="house">House</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Location selector */}
        <div className="space-y-1.5">
          <Label className="font-medium">
            {category === "store" ? "Store" : "House / Office"}{" "}
            <span className="text-destructive">*</span>
          </Label>
          <Select value={locationId} onValueChange={setLocationId}>
            <SelectTrigger>
              <SelectValue
                placeholder={`Select a ${category === "store" ? "Store" : "House"}`}
              />
            </SelectTrigger>
            <SelectContent>
              {locOptions.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Department */}
        <div className="space-y-1.5">
          <Label className="font-medium">
            Department <span className="text-destructive">*</span>
          </Label>
          <Select value={department} onValueChange={(v) => setDepartment(v as typeof department)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ALL_DEPARTMENTS.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Priority */}
        <div className="space-y-1.5">
          <Label className="font-medium">Priority</Label>
          <Select value={priority} onValueChange={(v) => setPriority(v as TicketPriority)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Team Type: Renamed from Assignment */}
        <div className="space-y-1.5">
          <Label className="font-medium">Team Type</Label>
          <Select
            value={teamType}
            onValueChange={(v: "none" | "internal" | "external") => {
              setTeamType(v);
              setAssignee("");
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Leave unassigned</SelectItem>
              <SelectItem value="internal">Internal</SelectItem>
              <SelectItem value="external">External</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Assignee / Solver: ALWAYS VISIBLE */}
        <div className="space-y-1.5">
          <Label className="font-medium">
            Assignee {teamType !== "none" && <span className="text-destructive">*</span>}
          </Label>
          {teamType === "none" ? (
            <Select disabled value="none">
              <SelectTrigger className="bg-muted/50 cursor-not-allowed text-muted-foreground opacity-70">
                <SelectValue placeholder="Unassigned (Optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unassigned</SelectItem>
              </SelectContent>
            </Select>
          ) : teamType === "internal" ? (
            <Select value={assignee} onValueChange={setAssignee}>
              <SelectTrigger>
                <SelectValue placeholder="Select internal member *" />
              </SelectTrigger>
              <SelectContent>
                {internalOptions.map((opt) => (
                  <SelectItem key={opt.id} value={opt.name}>
                    {opt.name} ({opt.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Select value={assignee} onValueChange={setAssignee}>
              <SelectTrigger>
                <SelectValue placeholder="Select external vendor *" />
              </SelectTrigger>
              <SelectContent>
                {externalOptions.map((opt) => (
                  <SelectItem key={opt.id} value={opt.name}>
                    {opt.name} — {opt.specialty}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Attachments Section */}
        <div className="sm:col-span-2 space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-1.5 font-medium">
              <Paperclip className="h-4 w-4 text-muted-foreground" />
              Attachments
            </Label>
            <span className="text-xs text-muted-foreground">
              Images, PDFs (optional)
            </span>
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
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="border-2 border-dashed border-border rounded-lg p-3 text-center cursor-pointer hover:bg-muted/40 hover:border-primary/50 transition-colors"
          >
            <UploadCloud className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
            <p className="text-xs font-medium text-foreground">
              Click to browse or drag and drop files
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Supports PNG, JPG, PDF up to 10MB
            </p>
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
                    <span className="text-muted-foreground text-[10px] shrink-0">
                      ({formatFileSize(file.size)})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setAttachments((prev) => prev.filter((_, i) => i !== idx));
                    }}
                    className="p-1 text-muted-foreground hover:text-destructive rounded transition-colors"
                    title="Remove attachment"
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
        <Button variant="outline" onClick={() => setAttachments([])} type="button">
          Cancel
        </Button>
        <Button onClick={submit}>Create Ticket</Button>
      </DialogFooter>
    </DialogContent>
  );
}
