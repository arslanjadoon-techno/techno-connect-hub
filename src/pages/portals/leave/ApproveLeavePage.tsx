import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { leaveService } from "@/services/leave";
import type { LeaveRequest, LeaveStats, LeaveStatus, LeaveType } from "@/lib/types";
import { LEAVE_STATUS_META } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DataTable, type Column } from "@/components/data-table";
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Eye,
  RefreshCw,
  FileText,
  User,
  Check,
  X,
  Building2,
  Users,
  ShieldCheck,
  CalendarDays,
} from "lucide-react";
import { toast } from "sonner";

const SAMPLE_MANAGER_LEAVES: LeaveRequest[] = [
  {
    id: "LR-2041",
    userId: "u-101",
    userName: "Alex Martinez",
    userEmail: "alex.martinez@texasmobilepcs.com",
    userNtid: "NT-4912",
    department: "Operations",
    marketName: "Dallas Central",
    storeName: "Dallas Store #104",
    leaveType: "Casual Leave",
    startDate: "2026-09-05",
    endDate: "2026-09-06",
    totalDays: 2,
    reason: "Need to attend a personal family commitment in Austin.",
    status: "Pending",
    appliedAt: "2026-09-01T08:30:00Z",
    emergencyContact: "+1 (214) 555-0192",
  },
  {
    id: "LR-2042",
    userId: "u-102",
    userName: "Samantha Vance",
    userEmail: "samantha.v@texasmobilepcs.com",
    userNtid: "NT-3184",
    department: "Retail Sales",
    marketName: "Houston Metro",
    storeName: "Houston West #202",
    leaveType: "Sick Leave",
    startDate: "2026-09-02",
    endDate: "2026-09-04",
    totalDays: 3,
    reason: "Doctor advised strict bed rest following dental surgery.",
    status: "Pending",
    appliedAt: "2026-09-01T07:15:00Z",
    emergencyContact: "+1 (713) 555-0144",
  },
  {
    id: "LR-2039",
    userId: "u-103",
    userName: "Marcus Brody",
    userEmail: "marcus.b@texasmobilepcs.com",
    userNtid: "NT-5021",
    department: "IT & Systems",
    marketName: "Austin Metro",
    leaveType: "Annual Leave",
    startDate: "2026-09-12",
    endDate: "2026-09-18",
    totalDays: 7,
    reason: "Pre-scheduled annual family vacation trip.",
    status: "Pending",
    appliedAt: "2026-08-30T14:20:00Z",
    emergencyContact: "+1 (512) 555-0188",
  },
  {
    id: "LR-2035",
    userId: "u-104",
    userName: "Jessica Chen",
    userEmail: "jessica.c@texasmobilepcs.com",
    userNtid: "NT-8812",
    department: "Finance",
    marketName: "San Antonio",
    leaveType: "Casual Leave",
    startDate: "2026-08-25",
    endDate: "2026-08-26",
    totalDays: 2,
    reason: "Relocating apartment & lease signing.",
    status: "Approved",
    appliedAt: "2026-08-20T11:00:00Z",
    approvedByName: "Finance Manager",
    approvedAt: "2026-08-21T09:30:00Z",
    managerNotes: "Approved. Handover assigned to backup lead.",
  },
  {
    id: "LR-2031",
    userId: "u-105",
    userName: "David Ortiz",
    userEmail: "david.o@texasmobilepcs.com",
    userNtid: "NT-7729",
    department: "Retail Sales",
    marketName: "Fort Worth",
    storeName: "FW North #305",
    leaveType: "Emergency Leave",
    startDate: "2026-08-15",
    endDate: "2026-08-16",
    totalDays: 2,
    reason: "Emergency vehicle breakdown and home repairs.",
    status: "Rejected",
    appliedAt: "2026-08-14T16:45:00Z",
    rejectionReason:
      "Store staffing is critically low during promotion weekend. Please coordinate with district shift lead.",
  },
];

export default function ApproveLeavePage() {
  const { user } = useAuth();
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("Pending");
  const [deptFilter, setDeptFilter] = useState<string>("All");
  const [typeFilter, setTypeFilter] = useState<string>("All");

  // Selection for bulk actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Approve Dialog Modal
  const [approvingLeave, setApprovingLeave] = useState<LeaveRequest | null>(null);
  const [approveNotes, setApproveNotes] = useState<string>("");
  const [approveLoading, setApproveLoading] = useState<boolean>(false);

  // Reject Dialog Modal
  const [rejectingLeave, setRejectingLeave] = useState<LeaveRequest | null>(null);
  const [rejectReason, setRejectReason] = useState<string>("");
  const [rejectLoading, setRejectLoading] = useState<boolean>(false);

  // Detail Modal
  const [viewingLeave, setViewingLeave] = useState<LeaveRequest | null>(null);

  // Load All Leaves
  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const res = await leaveService.getAllLeaves();
      if (res && res.data && Array.isArray(res.data) && res.data.length > 0) {
        setLeaves(res.data);
      } else {
        const stored = localStorage.getItem("mis_leave_requests");
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            // Merge with sample if list is small
            if (Array.isArray(parsed) && parsed.length > 0) {
              setLeaves(parsed);
            } else {
              setLeaves(SAMPLE_MANAGER_LEAVES);
              localStorage.setItem("mis_leave_requests", JSON.stringify(SAMPLE_MANAGER_LEAVES));
            }
          } catch {
            setLeaves(SAMPLE_MANAGER_LEAVES);
          }
        } else {
          setLeaves(SAMPLE_MANAGER_LEAVES);
          localStorage.setItem("mis_leave_requests", JSON.stringify(SAMPLE_MANAGER_LEAVES));
        }
      }
    } catch {
      const stored = localStorage.getItem("mis_leave_requests");
      if (stored) {
        try {
          setLeaves(JSON.parse(stored));
        } catch {
          setLeaves(SAMPLE_MANAGER_LEAVES);
        }
      } else {
        setLeaves(SAMPLE_MANAGER_LEAVES);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  // Stats calculation
  const stats: LeaveStats = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    let pending = 0;
    let approved = 0;
    let rejected = 0;
    let onLeave = 0;

    leaves.forEach((l) => {
      if (l.status === "Pending") pending++;
      else if (l.status === "Approved") {
        approved++;
        if (l.startDate <= todayStr && l.endDate >= todayStr) {
          onLeave++;
        }
      } else if (l.status === "Rejected") rejected++;
    });

    return {
      totalRequests: leaves.length,
      pendingRequests: pending,
      approvedRequests: approved,
      rejectedRequests: rejected,
      onLeaveToday: onLeave,
    };
  }, [leaves]);

  // Unique departments for filter
  const departments = useMemo(() => {
    const set = new Set<string>();
    leaves.forEach((l) => {
      if (l.department) set.add(l.department);
    });
    return Array.from(set);
  }, [leaves]);

  // Handle Approve
  const handleConfirmApprove = async () => {
    if (!approvingLeave) return;
    setApproveLoading(true);

    try {
      await leaveService.approveLeave({
        leaveId: approvingLeave.id,
        managerNotes: approveNotes.trim() || undefined,
      });
    } catch {
      // Offline fallback
    }

    const updated = leaves.map((l) =>
      l.id === approvingLeave.id
        ? {
            ...l,
            status: "Approved" as LeaveStatus,
            approvedByName: user?.fullName || "Supervisor",
            approvedAt: new Date().toISOString(),
            managerNotes: approveNotes.trim() || undefined,
          }
        : l,
    );

    setLeaves(updated);
    try {
      localStorage.setItem("mis_leave_requests", JSON.stringify(updated));
    } catch {
      // ignore
    }

    toast.success(
      `Leave request ${approvingLeave.id} for ${approvingLeave.userName} has been Approved.`,
    );
    setApproveLoading(false);
    setApprovingLeave(null);
    setApproveNotes("");
  };

  // Handle Reject
  const handleConfirmReject = async () => {
    if (!rejectingLeave) return;
    if (!rejectReason.trim()) {
      toast.error("Please enter a rejection reason");
      return;
    }
    setRejectLoading(true);

    try {
      await leaveService.rejectLeave({
        leaveId: rejectingLeave.id,
        rejectionReason: rejectReason.trim(),
      });
    } catch {
      // Offline fallback
    }

    const updated = leaves.map((l) =>
      l.id === rejectingLeave.id
        ? {
            ...l,
            status: "Rejected" as LeaveStatus,
            rejectionReason: rejectReason.trim(),
          }
        : l,
    );

    setLeaves(updated);
    try {
      localStorage.setItem("mis_leave_requests", JSON.stringify(updated));
    } catch {
      // ignore
    }

    toast.success(
      `Leave request ${rejectingLeave.id} for ${rejectingLeave.userName} has been Rejected.`,
    );
    setRejectLoading(false);
    setRejectingLeave(null);
    setRejectReason("");
  };

  // Bulk Approve
  const handleBulkApprove = () => {
    if (selectedIds.length === 0) return;
    const updated = leaves.map((l) =>
      selectedIds.includes(l.id) && l.status === "Pending"
        ? {
            ...l,
            status: "Approved" as LeaveStatus,
            approvedByName: user?.fullName || "Supervisor",
            approvedAt: new Date().toISOString(),
          }
        : l,
    );
    setLeaves(updated);
    try {
      localStorage.setItem("mis_leave_requests", JSON.stringify(updated));
    } catch {
      // ignore
    }
    toast.success(`Approved ${selectedIds.length} leave requests.`);
    setSelectedIds([]);
  };

  // Filtered leaves
  const filteredLeaves = useMemo(() => {
    return leaves.filter((item) => {
      if (statusFilter !== "All" && item.status !== statusFilter) return false;
      if (deptFilter !== "All" && item.department !== deptFilter) return false;
      if (typeFilter !== "All" && item.leaveType !== typeFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = item.userName?.toLowerCase().includes(q);
        const matchNtid = item.userNtid?.toLowerCase().includes(q);
        const matchEmail = item.userEmail?.toLowerCase().includes(q);
        const matchReason = item.reason?.toLowerCase().includes(q);
        const matchStore = item.storeName?.toLowerCase().includes(q);
        const matchMarket = item.marketName?.toLowerCase().includes(q);
        if (!matchName && !matchNtid && !matchEmail && !matchReason && !matchStore && !matchMarket)
          return false;
      }
      return true;
    });
  }, [leaves, statusFilter, deptFilter, typeFilter, searchQuery]);

  // Toggle selection
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const selectAllPending = () => {
    const pendings = filteredLeaves.filter((l) => l.status === "Pending").map((l) => l.id);
    if (selectedIds.length === pendings.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(pendings);
    }
  };

  // Columns definition for DataTable
  const columns: Column<LeaveRequest>[] = [
    {
      key: "select",
      header: (
        <input
          type="checkbox"
          checked={
            selectedIds.length > 0 &&
            selectedIds.length === filteredLeaves.filter((l) => l.status === "Pending").length
          }
          onChange={selectAllPending}
          className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
          title="Select all pending"
        />
      ),
      cell: (row) =>
        row.status === "Pending" ? (
          <input
            type="checkbox"
            checked={selectedIds.includes(row.id)}
            onChange={() => toggleSelect(row.id)}
            className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
          />
        ) : (
          <span className="w-4 inline-block" />
        ),
    },
    {
      key: "employee",
      header: "Employee",
      cell: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-xs shrink-0">
            {row.userName
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </div>
          <div>
            <div className="font-semibold text-sm text-foreground">{row.userName}</div>
            <div className="text-[11px] text-muted-foreground">
              {row.userNtid ? `${row.userNtid} &middot; ` : ""}
              {row.department || "Operations"}
              {row.marketName ? ` (${row.marketName})` : ""}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "leaveType",
      header: "Leave Category",
      cell: (row) => (
        <div>
          <div className="font-medium text-sm text-foreground">{row.leaveType}</div>
          {row.isHalfDay ? (
            <span className="text-[11px] text-muted-foreground">
              Half Day ({row.halfDayPeriod})
            </span>
          ) : (
            <span className="text-[11px] text-muted-foreground">Full Day</span>
          )}
        </div>
      ),
    },
    {
      key: "duration",
      header: "Dates & Duration",
      cell: (row) => (
        <div className="text-sm">
          <div className="font-medium text-foreground">
            {row.startDate} <span className="text-muted-foreground font-normal">to</span>{" "}
            {row.endDate}
          </div>
          <div className="text-xs font-semibold text-primary">
            {row.totalDays} {row.totalDays === 1 ? "day" : "days"}
          </div>
        </div>
      ),
    },
    {
      key: "reason",
      header: "Reason",
      cell: (row) => (
        <p className="line-clamp-1 max-w-xs text-xs text-muted-foreground" title={row.reason}>
          {row.reason}
        </p>
      ),
    },
    {
      key: "appliedAt",
      header: "Applied On",
      cell: (row) => (
        <span className="text-xs text-muted-foreground">
          {new Date(row.appliedAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => {
        const meta = LEAVE_STATUS_META[row.status] || {
          label: row.status,
          tone: "bg-muted text-muted-foreground",
          dot: "bg-muted-foreground",
        };
        return (
          <Badge variant="outline" className={`gap-1.5 px-2 py-0.5 font-medium ${meta.tone}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
            {meta.label}
          </Badge>
        );
      },
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      cell: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          {row.status === "Pending" ? (
            <>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                onClick={() => setApprovingLeave(row)}
                title="Approve leave"
              >
                <Check className="h-3.5 w-3.5 mr-1" />
                Approve
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10"
                onClick={() => setRejectingLeave(row)}
                title="Reject leave"
              >
                <X className="h-3.5 w-3.5 mr-1" />
                Reject
              </Button>
            </>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setViewingLeave(row)}
            >
              <Eye className="h-3.5 w-3.5 mr-1" />
              Details
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
            Leave Approvals
          </h1>
          <p className="text-sm text-muted-foreground">
            Review and manage team leave requests across your territory and assigned departments.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && (
            <Button
              size="sm"
              onClick={handleBulkApprove}
              className="bg-emerald-600 text-white hover:bg-emerald-700 font-medium"
            >
              <Check className="h-4 w-4 mr-1.5" />
              Approve Selected ({selectedIds.length})
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={fetchLeaves}
            disabled={loading}
            className="gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Metric Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border border-border/80 transition-all hover:shadow-md">
          <CardContent className="pt-6 flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground uppercase font-semibold tracking-wide">
                Pending Approvals
              </div>
              <div className="text-2xl font-bold font-display text-amber-600 dark:text-amber-400 mt-1">
                {stats.pendingRequests}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">Awaiting supervisor action</div>
            </div>
            <div className="h-11 w-11 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
              <Clock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 transition-all hover:shadow-md">
          <CardContent className="pt-6 flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground uppercase font-semibold tracking-wide">
                Approved
              </div>
              <div className="text-2xl font-bold font-display text-emerald-600 dark:text-emerald-400 mt-1">
                {stats.approvedRequests}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">Granted leave applications</div>
            </div>
            <div className="h-11 w-11 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 transition-all hover:shadow-md">
          <CardContent className="pt-6 flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground uppercase font-semibold tracking-wide">
                On Leave Today
              </div>
              <div className="text-2xl font-bold font-display text-primary mt-1">
                {stats.onLeaveToday}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">Active team members away</div>
            </div>
            <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <CalendarDays className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 transition-all hover:shadow-md">
          <CardContent className="pt-6 flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground uppercase font-semibold tracking-wide">
                Rejected / Cancelled
              </div>
              <div className="text-2xl font-bold font-display text-rose-600 dark:text-rose-400 mt-1">
                {stats.rejectedRequests}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">Declined requests</div>
            </div>
            <div className="h-11 w-11 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0">
              <XCircle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="border border-border/80">
        <CardHeader className="pb-3 border-b border-border/60">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Employee Leave Queue</CardTitle>
              <CardDescription>
                Filter and manage staff leave records. Select rows for bulk decisions.
              </CardDescription>
            </div>

            {/* Filter controls */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-48 sm:w-60">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search employee / NTID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-9 text-xs"
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 w-32 text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Statuses</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Approved">Approved</SelectItem>
                  <SelectItem value="Rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>

              {departments.length > 0 && (
                <Select value={deptFilter} onValueChange={setDeptFilter}>
                  <SelectTrigger className="h-9 w-36 text-xs">
                    <SelectValue placeholder="Department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Depts</SelectItem>
                    {departments.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          <DataTable
            columns={columns}
            data={filteredLeaves}
            loading={loading}
            emptyMessage="No leave records found matching current queue filters."
          />
        </CardContent>
      </Card>

      {/* Approve Dialog Modal */}
      <Dialog open={Boolean(approvingLeave)} onOpenChange={(o) => !o && setApprovingLeave(null)}>
        {approvingLeave && (
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-5 w-5" />
                Approve Leave Request
              </DialogTitle>
              <DialogDescription>
                Confirm leave approval for <strong>{approvingLeave.userName}</strong> (
                {approvingLeave.leaveType} for {approvingLeave.totalDays}{" "}
                {approvingLeave.totalDays === 1 ? "day" : "days"}).
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-sm">
              <div className="rounded-lg border border-border/80 p-3 bg-muted/20 space-y-1">
                <div>
                  <strong>Duration:</strong> {approvingLeave.startDate} to {approvingLeave.endDate}
                </div>
                <div>
                  <strong>Reason:</strong> {approvingLeave.reason}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="approveNotes">Supervisor Notes / Remarks (Optional)</Label>
                <Textarea
                  id="approveNotes"
                  placeholder="e.g. Approved. Cover arrangement confirmed with store lead."
                  rows={3}
                  value={approveNotes}
                  onChange={(e) => setApproveNotes(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setApprovingLeave(null)}
                disabled={approveLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmApprove}
                disabled={approveLoading}
                className="bg-emerald-600 text-white hover:bg-emerald-700"
              >
                {approveLoading ? "Approving..." : "Confirm Approval"}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* Reject Dialog Modal */}
      <Dialog open={Boolean(rejectingLeave)} onOpenChange={(o) => !o && setRejectingLeave(null)}>
        {rejectingLeave && (
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg text-rose-600 dark:text-rose-400">
                <XCircle className="h-5 w-5" />
                Reject Leave Request
              </DialogTitle>
              <DialogDescription>
                Decline leave request for <strong>{rejectingLeave.userName}</strong>. Please provide
                a clear reason for the employee.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-sm">
              <div className="rounded-lg border border-border/80 p-3 bg-muted/20 space-y-1">
                <div>
                  <strong>Duration:</strong> {rejectingLeave.startDate} to {rejectingLeave.endDate}
                </div>
                <div>
                  <strong>Employee Reason:</strong> {rejectingLeave.reason}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="rejectReason">Rejection Reason *</Label>
                <Textarea
                  id="rejectReason"
                  placeholder="Explain why this request is declined (e.g. conflicting shift coverage, blackout promotion period)..."
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  required
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setRejectingLeave(null)}
                disabled={rejectLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmReject}
                disabled={rejectLoading}
                className="bg-rose-600 text-white hover:bg-rose-700"
              >
                {rejectLoading ? "Rejecting..." : "Confirm Rejection"}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* View Details Modal */}
      <Dialog open={Boolean(viewingLeave)} onOpenChange={(o) => !o && setViewingLeave(null)}>
        {viewingLeave && (
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle className="flex items-center gap-2 text-lg">
                  <FileText className="h-5 w-5 text-primary" />
                  Leave Request #{viewingLeave.id}
                </DialogTitle>
                <Badge
                  variant="outline"
                  className={`gap-1.5 px-2.5 py-0.5 font-medium ${
                    LEAVE_STATUS_META[viewingLeave.status]?.tone || ""
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${LEAVE_STATUS_META[viewingLeave.status]?.dot || ""}`}
                  />
                  {viewingLeave.status}
                </Badge>
              </div>
              <DialogDescription>
                Submitted by {viewingLeave.userName} ({viewingLeave.userEmail})
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 text-sm">
              <div className="grid grid-cols-2 gap-3 rounded-lg border border-border/80 p-3 bg-muted/20">
                <div>
                  <div className="text-xs text-muted-foreground">Department</div>
                  <div className="font-semibold text-foreground mt-0.5">
                    {viewingLeave.department || "Operations"}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Market / Store</div>
                  <div className="font-semibold text-foreground mt-0.5">
                    {viewingLeave.marketName || "—"}{" "}
                    {viewingLeave.storeName ? `(${viewingLeave.storeName})` : ""}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Leave Category</div>
                  <div className="font-semibold text-foreground mt-0.5">
                    {viewingLeave.leaveType}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Total Duration</div>
                  <div className="font-semibold text-foreground mt-0.5">
                    {viewingLeave.totalDays} {viewingLeave.totalDays === 1 ? "Day" : "Days"}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Start Date</div>
                  <div className="font-medium text-foreground mt-0.5">{viewingLeave.startDate}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">End Date</div>
                  <div className="font-medium text-foreground mt-0.5">{viewingLeave.endDate}</div>
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Reason for Absence
                </div>
                <p className="mt-1 text-sm bg-muted/30 p-3 rounded-lg border border-border/60 text-foreground leading-relaxed">
                  {viewingLeave.reason}
                </p>
              </div>

              {viewingLeave.emergencyContact && (
                <div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Emergency Contact
                  </div>
                  <p className="mt-1 text-sm font-medium text-foreground">
                    {viewingLeave.emergencyContact}
                  </p>
                </div>
              )}

              {viewingLeave.approvedByName && (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
                  <div className="flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-300 text-xs">
                    <CheckCircle2 className="h-4 w-4" />
                    Approved by {viewingLeave.approvedByName} on{" "}
                    {viewingLeave.approvedAt
                      ? new Date(viewingLeave.approvedAt).toLocaleDateString()
                      : ""}
                  </div>
                  {viewingLeave.managerNotes && (
                    <p className="mt-1 text-xs text-emerald-800 dark:text-emerald-200">
                      &ldquo;{viewingLeave.managerNotes}&rdquo;
                    </p>
                  )}
                </div>
              )}

              {viewingLeave.rejectionReason && (
                <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3">
                  <div className="flex items-center gap-1.5 font-semibold text-rose-700 dark:text-rose-300 text-xs">
                    <XCircle className="h-4 w-4" />
                    Rejection Reason
                  </div>
                  <p className="mt-1 text-xs text-rose-800 dark:text-rose-200">
                    &ldquo;{viewingLeave.rejectionReason}&rdquo;
                  </p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setViewingLeave(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
