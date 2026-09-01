import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { leaveService } from "@/services/leave";
import type { LeaveBalance, LeaveRequest, LeaveStatus, LeaveType } from "@/lib/types";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DataTable, type Column } from "@/components/data-table";
import {
  Calendar as CalendarIcon,
  CalendarPlus,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Search,
  Eye,
  RefreshCw,
  FileText,
  User,
  Info,
  CalendarRange,
} from "lucide-react";
import { toast } from "sonner";

const LEAVE_TYPES: { type: LeaveType; desc: string; defaultTotal: number }[] = [
  { type: "Casual Leave", desc: "For personal reasons & short absences", defaultTotal: 12 },
  { type: "Sick Leave", desc: "For medical recovery or illness", defaultTotal: 10 },
  { type: "Annual Leave", desc: "Planned vacation / annual holiday", defaultTotal: 15 },
  { type: "Emergency Leave", desc: "Urgent unforeseen family / personal affairs", defaultTotal: 5 },
  { type: "Unpaid Leave", desc: "Absence without pay when quota exhausted", defaultTotal: 30 },
  { type: "Bereavement Leave", desc: "Compassionate leave for family loss", defaultTotal: 5 },
  { type: "Maternity Leave", desc: "Maternity benefit leave", defaultTotal: 90 },
  { type: "Paternity Leave", desc: "Paternity benefit leave", defaultTotal: 10 },
];

const DEFAULT_BALANCES: LeaveBalance[] = [
  { leaveType: "Casual Leave", totalAllowed: 12, used: 3, pending: 1, remaining: 8, color: "text-blue-600 bg-blue-500/10 border-blue-500/20" },
  { leaveType: "Sick Leave", totalAllowed: 10, used: 2, pending: 0, remaining: 8, color: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20" },
  { leaveType: "Annual Leave", totalAllowed: 15, used: 5, pending: 0, remaining: 10, color: "text-purple-600 bg-purple-500/10 border-purple-500/20" },
  { leaveType: "Emergency Leave", totalAllowed: 5, used: 1, pending: 0, remaining: 4, color: "text-amber-600 bg-amber-500/10 border-amber-500/20" },
];

export default function RequestLeavePage() {
  const { user } = useAuth();
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [balances, setBalances] = useState<LeaveBalance[]>(DEFAULT_BALANCES);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [typeFilter, setTypeFilter] = useState<string>("All");

  // New Leave Form State
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [leaveType, setLeaveType] = useState<LeaveType>("Casual Leave");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [isHalfDay, setIsHalfDay] = useState<boolean>(false);
  const [halfDayPeriod, setHalfDayPeriod] = useState<"First Half" | "Second Half">("First Half");
  const [reason, setReason] = useState<string>("");
  const [emergencyContact, setEmergencyContact] = useState<string>(user?.phone || "");

  // Detail Modal State
  const [viewingLeave, setViewingLeave] = useState<LeaveRequest | null>(null);

  // Cancel Alert State
  const [cancellingLeave, setCancellingLeave] = useState<LeaveRequest | null>(null);
  const [cancelLoading, setCancelLoading] = useState<boolean>(false);

  // Calculate Days Difference
  const calculatedDays = useMemo(() => {
    if (!startDate || !endDate) return 0;
    if (isHalfDay) return 0.5;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) return 0;
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }, [startDate, endDate, isHalfDay]);

  // Load My Leaves
  const fetchMyLeaves = async () => {
    setLoading(true);
    try {
      const res = await leaveService.getMyLeaves();
      if (res && res.data && Array.isArray(res.data) && res.data.length > 0) {
        setLeaves(res.data);
      } else {
        // Fallback local storage state
        const stored = localStorage.getItem("mis_leave_requests");
        if (stored) {
          try {
            const parsed = JSON.parse(stored) as LeaveRequest[];
            const myLeaves = parsed.filter(
              (l) => l.userId === user?.id || l.userEmail === user?.email,
            );
            setLeaves(myLeaves.length > 0 ? myLeaves : parsed);
          } catch {
            setLeaves([]);
          }
        } else {
          // Initialize sample request for the user
          const sample: LeaveRequest[] = [
            {
              id: "LR-1001",
              userId: user?.id || "u-1",
              userName: user?.fullName || `${user?.firstName || "Current"} ${user?.lastName || "User"}`,
              userEmail: user?.email || "user@texasmobilepcs.com",
              userNtid: "NT-9082",
              department: user?.departmentName || user?.department || "Operations",
              marketName: user?.marketName || "Dallas",
              leaveType: "Casual Leave",
              startDate: new Date(Date.now() + 86400000 * 3).toISOString().split("T")[0],
              endDate: new Date(Date.now() + 86400000 * 4).toISOString().split("T")[0],
              totalDays: 2,
              reason: "Family gathering and personal commitments.",
              status: "Pending",
              appliedAt: new Date().toISOString(),
            },
            {
              id: "LR-1002",
              userId: user?.id || "u-1",
              userName: user?.fullName || `${user?.firstName || "Current"} ${user?.lastName || "User"}`,
              userEmail: user?.email || "user@texasmobilepcs.com",
              userNtid: "NT-9082",
              department: user?.departmentName || user?.department || "Operations",
              marketName: user?.marketName || "Dallas",
              leaveType: "Sick Leave",
              startDate: "2026-08-10",
              endDate: "2026-08-11",
              totalDays: 2,
              reason: "Severe viral flu and medical rest prescribed by physician.",
              status: "Approved",
              appliedAt: "2026-08-09T10:30:00Z",
              approvedByName: "Operations Lead",
              approvedAt: "2026-08-09T14:15:00Z",
              managerNotes: "Approved. Take proper rest and provide doctor note upon return.",
            },
          ];
          setLeaves(sample);
          localStorage.setItem("mis_leave_requests", JSON.stringify(sample));
        }
      }
    } catch {
      // Fallback
      const stored = localStorage.getItem("mis_leave_requests");
      if (stored) {
        try {
          setLeaves(JSON.parse(stored));
        } catch {
          // ignore
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyLeaves();
  }, [user]);

  // Handle Form Submit
  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate) {
      toast.error("Please select both start and end dates");
      return;
    }
    if (new Date(endDate) < new Date(startDate)) {
      toast.error("End date cannot be earlier than start date");
      return;
    }
    if (!reason.trim()) {
      toast.error("Please provide a reason for the leave request");
      return;
    }

    setSubmitting(true);
    const newRequest: LeaveRequest = {
      id: `LR-${Math.floor(1000 + Math.random() * 9000)}`,
      userId: user?.id || "u-1",
      userName: user?.fullName || `${user?.firstName || "Employee"} ${user?.lastName || ""}`.trim(),
      userEmail: user?.email || "employee@texasmobilepcs.com",
      userNtid: "NT-" + Math.floor(1000 + Math.random() * 9000),
      department: user?.departmentName || user?.department || "Operations",
      marketName: user?.marketName || "Houston",
      storeName: user?.storeName || undefined,
      leaveType,
      startDate,
      endDate,
      totalDays: calculatedDays,
      isHalfDay,
      halfDayPeriod: isHalfDay ? halfDayPeriod : undefined,
      reason: reason.trim(),
      emergencyContact: emergencyContact.trim() || undefined,
      status: "Pending",
      appliedAt: new Date().toISOString(),
    };

    try {
      await leaveService.requestLeave({
        leaveType,
        startDate,
        endDate,
        isHalfDay,
        halfDayPeriod,
        reason,
        emergencyContact,
      });
    } catch {
      // Offline fallback handling
    }

    // Update local state and storage
    const updated = [newRequest, ...leaves];
    setLeaves(updated);
    try {
      const allStored = localStorage.getItem("mis_leave_requests");
      const parsedAll: LeaveRequest[] = allStored ? JSON.parse(allStored) : [];
      localStorage.setItem("mis_leave_requests", JSON.stringify([newRequest, ...parsedAll]));
    } catch {
      // ignore
    }

    // Deduct pending balance visually
    setBalances((prev) =>
      prev.map((b) =>
        b.leaveType === leaveType
          ? { ...b, pending: b.pending + calculatedDays, remaining: Math.max(0, b.remaining - calculatedDays) }
          : b,
      ),
    );

    toast.success("Leave request submitted successfully for manager approval!");
    setSubmitting(false);
    setIsDialogOpen(false);

    // Reset form
    setStartDate("");
    setEndDate("");
    setReason("");
    setIsHalfDay(false);
  };

  // Handle Cancel Leave
  const handleConfirmCancel = async () => {
    if (!cancellingLeave) return;
    setCancelLoading(true);

    try {
      await leaveService.cancelLeave({ leaveId: cancellingLeave.id });
    } catch {
      // Offline fallback
    }

    const updated = leaves.map((l) =>
      l.id === cancellingLeave.id ? { ...l, status: "Cancelled" as LeaveStatus } : l,
    );
    setLeaves(updated);

    try {
      const allStored = localStorage.getItem("mis_leave_requests");
      if (allStored) {
        const parsed: LeaveRequest[] = JSON.parse(allStored);
        const next = parsed.map((l) =>
          l.id === cancellingLeave.id ? { ...l, status: "Cancelled" as LeaveStatus } : l,
        );
        localStorage.setItem("mis_leave_requests", JSON.stringify(next));
      }
    } catch {
      // ignore
    }

    toast.success(`Leave request ${cancellingLeave.id} has been cancelled.`);
    setCancelLoading(false);
    setCancellingLeave(null);
  };

  // Filtered leaves
  const filteredLeaves = useMemo(() => {
    return leaves.filter((item) => {
      if (statusFilter !== "All" && item.status !== statusFilter) return false;
      if (typeFilter !== "All" && item.leaveType !== typeFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchReason = item.reason?.toLowerCase().includes(q);
        const matchType = item.leaveType?.toLowerCase().includes(q);
        const matchId = item.id?.toLowerCase().includes(q);
        if (!matchReason && !matchType && !matchId) return false;
      }
      return true;
    });
  }, [leaves, statusFilter, typeFilter, searchQuery]);

  // Columns definition for DataTable
  const columns: Column<LeaveRequest>[] = [
    {
      key: "id",
      header: "Request ID",
      cell: (row) => (
        <span className="font-mono text-xs font-medium text-foreground">{row.id}</span>
      ),
    },
    {
      key: "leaveType",
      header: "Leave Type",
      cell: (row) => (
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <CalendarIcon className="h-3.5 w-3.5" />
          </div>
          <div>
            <div className="font-medium text-sm text-foreground">{row.leaveType}</div>
            {row.isHalfDay && (
              <span className="text-[11px] text-muted-foreground">Half Day ({row.halfDayPeriod})</span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "dates",
      header: "Duration",
      cell: (row) => (
        <div className="text-sm">
          <div className="font-medium text-foreground">
            {row.startDate} <span className="text-muted-foreground font-normal">to</span> {row.endDate}
          </div>
          <div className="text-xs text-muted-foreground">
            {row.totalDays} {row.totalDays === 1 ? "day" : "days"}
          </div>
        </div>
      ),
    },
    {
      key: "reason",
      header: "Reason",
      cell: (row) => (
        <p className="line-clamp-1 max-w-xs text-sm text-muted-foreground" title={row.reason}>
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
            year: "numeric",
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
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs"
            onClick={() => setViewingLeave(row)}
          >
            <Eye className="h-3.5 w-3.5 mr-1" />
            Details
          </Button>

          {row.status === "Pending" && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setCancellingLeave(row)}
            >
              Cancel
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
            Request Leave
          </h1>
          <p className="text-sm text-muted-foreground">
            Submit leave applications, track real-time approval status, and manage your leave balances.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchMyLeaves}
            disabled={loading}
            className="gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5 font-medium shadow-sm">
                <CalendarPlus className="h-4 w-4" />
                Apply for Leave
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <form onSubmit={handleApplyLeave}>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-lg">
                    <CalendarPlus className="h-5 w-5 text-primary" />
                    New Leave Application
                  </DialogTitle>
                  <DialogDescription>
                    Fill in your leave dates and details. Your reporting manager will be notified for review.
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="leaveType">Leave Type *</Label>
                    <Select
                      value={leaveType}
                      onValueChange={(val) => setLeaveType(val as LeaveType)}
                    >
                      <SelectTrigger id="leaveType">
                        <SelectValue placeholder="Select leave category" />
                      </SelectTrigger>
                      <SelectContent>
                        {LEAVE_TYPES.map((lt) => (
                          <SelectItem key={lt.type} value={lt.type}>
                            <div className="flex flex-col text-left">
                              <span className="font-medium">{lt.type}</span>
                              <span className="text-xs text-muted-foreground">{lt.desc}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="startDate">Start Date *</Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={startDate}
                        onChange={(e) => {
                          setStartDate(e.target.value);
                          if (!endDate) setEndDate(e.target.value);
                        }}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="endDate">End Date *</Label>
                      <Input
                        id="endDate"
                        type="date"
                        min={startDate}
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  {/* Half Day Option */}
                  <div className="rounded-lg border border-border/80 p-3 bg-muted/30 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="isHalfDay"
                        checked={isHalfDay}
                        onChange={(e) => setIsHalfDay(e.target.checked)}
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                      />
                      <label htmlFor="isHalfDay" className="text-sm font-medium cursor-pointer">
                        Half Day Leave
                      </label>
                    </div>
                    {isHalfDay && (
                      <Select
                        value={halfDayPeriod}
                        onValueChange={(val) => setHalfDayPeriod(val as "First Half" | "Second Half")}
                      >
                        <SelectTrigger className="w-36 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="First Half">First Half</SelectItem>
                          <SelectItem value="Second Half">Second Half</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  {/* Day Count indicator */}
                  {calculatedDays > 0 && (
                    <div className="flex items-center gap-2 text-xs text-primary bg-primary/10 px-3 py-2 rounded-md font-medium">
                      <CalendarRange className="h-4 w-4 shrink-0" />
                      <span>Total Requested Duration: <strong>{calculatedDays} {calculatedDays === 1 ? "Day" : "Days"}</strong></span>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label htmlFor="emergencyContact">Emergency Contact / Phone</Label>
                    <Input
                      id="emergencyContact"
                      placeholder="e.g. +1 (555) 000-0000"
                      value={emergencyContact}
                      onChange={(e) => setEmergencyContact(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="reason">Reason / Purpose of Leave *</Label>
                    <Textarea
                      id="reason"
                      placeholder="Please specify the reason for taking leave..."
                      rows={3}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "Submitting..." : "Submit Application"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Leave Balances Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {balances.map((b) => (
          <Card key={b.leaveType} className="border border-border/80 transition-all hover:shadow-md">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-semibold">{b.leaveType}</CardTitle>
              <span className="text-xs text-muted-foreground font-mono">
                {b.totalAllowed} Allowed
              </span>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline justify-between">
                <div className="text-2xl font-bold font-display text-foreground">
                  {b.remaining}
                  <span className="text-xs font-normal text-muted-foreground ml-1">days left</span>
                </div>
                {b.pending > 0 && (
                  <Badge variant="outline" className="text-[11px] bg-amber-500/10 text-amber-600 border-amber-500/20">
                    {b.pending} Pending
                  </Badge>
                )}
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground border-t border-border/50 pt-2">
                <span>Used: <strong>{b.used} days</strong></span>
                <span>Quota: <strong>{b.totalAllowed} days</strong></span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Leave Requests Table Container */}
      <Card className="border border-border/80">
        <CardHeader className="pb-3 border-b border-border/60">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base font-semibold">My Leave Applications</CardTitle>
              <CardDescription>
                History of all your submitted leave requests and supervisor decisions.
              </CardDescription>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-48 sm:w-60">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search reason / ID..."
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
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-9 w-36 text-xs">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Types</SelectItem>
                  {LEAVE_TYPES.map((lt) => (
                    <SelectItem key={lt.type} value={lt.type}>
                      {lt.type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          <DataTable
            columns={columns}
            data={filteredLeaves}
            loading={loading}
            emptyMessage="No leave requests found matching your filters."
          />
        </CardContent>
      </Card>

      {/* View Detail Modal */}
      <Dialog open={Boolean(viewingLeave)} onOpenChange={(open) => !open && setViewingLeave(null)}>
        {viewingLeave && (
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle className="flex items-center gap-2 text-lg">
                  <FileText className="h-5 w-5 text-primary" />
                  Leave Request Details
                </DialogTitle>
                <Badge
                  variant="outline"
                  className={`gap-1.5 px-2.5 py-0.5 font-medium ${
                    LEAVE_STATUS_META[viewingLeave.status]?.tone || ""
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${LEAVE_STATUS_META[viewingLeave.status]?.dot || ""}`} />
                  {viewingLeave.status}
                </Badge>
              </div>
              <DialogDescription>
                Request #{viewingLeave.id} &middot; Applied on{" "}
                {new Date(viewingLeave.appliedAt).toLocaleDateString("en-US", {
                  dateStyle: "medium",
                })}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 text-sm">
              <div className="grid grid-cols-2 gap-3 rounded-lg border border-border/80 p-3 bg-muted/20">
                <div>
                  <div className="text-xs text-muted-foreground">Leave Type</div>
                  <div className="font-semibold text-foreground mt-0.5">{viewingLeave.leaveType}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Total Duration</div>
                  <div className="font-semibold text-foreground mt-0.5">
                    {viewingLeave.totalDays} {viewingLeave.totalDays === 1 ? "Day" : "Days"}
                    {viewingLeave.isHalfDay && ` (${viewingLeave.halfDayPeriod})`}
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

              {/* Approval or Rejection Notes */}
              {viewingLeave.approvedByName && (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
                  <div className="flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-300 text-xs">
                    <CheckCircle2 className="h-4 w-4" />
                    Approved by {viewingLeave.approvedByName}
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

      {/* Cancel Confirmation Alert */}
      <AlertDialog open={Boolean(cancellingLeave)} onOpenChange={(o) => !o && setCancellingLeave(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Cancel Leave Request?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this pending {cancellingLeave?.leaveType} request for{" "}
              {cancellingLeave?.startDate} to {cancellingLeave?.endDate}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelLoading}>Keep Request</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmCancel}
              disabled={cancelLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelLoading ? "Cancelling..." : "Yes, Cancel Request"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
