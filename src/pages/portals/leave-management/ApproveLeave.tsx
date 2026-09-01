import React, { useState, useEffect, useMemo, ChangeEvent } from "react";
import {
  Search,
  FileText,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Calendar as CalendarIcon,
  Building2,
  CheckSquare,
  Square,
  Loader2,
  RefreshCw,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
  User,
  Clock,
} from "lucide-react";
import {
  getManagerLeaveRequests,
  decideLeaveDays,
  APILeaveRequest,
  APILeaveDay,
  DecideDayPayload,
} from "@/services/leave-management/approve-leave.service";
import { useAuth } from "@/lib/auth";

export type LeaveStatus = "Pending" | "Approved" | "Partially Approved" | "Rejected";

// Internal UI Interface mapped from API
export interface ManagerLeaveRequest {
  id: number;
  leaveType: string;
  selectedDates: { id: number; dateStr: string; status: number; managerComment?: string }[]; // Raw days mapping
  approvedDates: number[]; // Store day IDs
  market: string;
  ntid: string;
  employeeName: string;
  reason: string;
  status: LeaveStatus;
  createdAt: string;
  managerNote?: string;
  avatar: string;
  rawRequest: APILeaveRequest;
}

export default function ManagerLeaveManagement() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<ManagerLeaveRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // View & Filter States - "All" selected by default as in Image 1
  const [activeTab, setActiveTab] = useState<"Pending" | "Approved" | "Rejected" | "All">("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedRequest, setSelectedRequest] = useState<ManagerLeaveRequest | null>(null);

  // Detail View Action States (Stores day IDs)
  const [checkedDayIds, setCheckedDayIds] = useState<number[]>([]);
  const [managerNote, setManagerNote] = useState<string>("");

  // Reject Modal Open State
  const [isRejectModalOpen, setIsRejectModalOpen] = useState<boolean>(false);

  // State for View Switcher (List vs Calendar)
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");

  // Calendar Navigation & Selection States - Defaulting to current month
  const [currentCalendarDate, setCurrentCalendarDate] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedCalendarDateStr, setSelectedCalendarDateStr] = useState<string | null>(null);

  // Status mapping helper
  const mapStatusToText = (statusNum: number): LeaveStatus => {
    switch (statusNum) {
      case 1:
        return "Approved";
      case 2:
        return "Rejected";
      case 3:
        return "Partially Approved";
      case 0:
      default:
        return "Pending";
    }
  };

  // Helper: Days in Month generator for Calendar Grid
  const getDaysInMonthGrid = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();

    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    const days: (string | null)[] = [];

    // Empty padding slots for days before 1st of month
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    // Days of current month
    for (let d = 1; d <= totalDays; d++) {
      const dayStr = String(d).padStart(2, "0");
      const monthStr = String(month + 1).padStart(2, "0");
      days.push(`${year}-${monthStr}-${dayStr}`);
    }

    return days;
  };

  // Helper for Initials Avatar
  const getInitials = (name: string) => {
    if (!name) return "U";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  // Format Date ISO string to YYYY-MM-DD
  const formatDateStr = (isoDate: string) => {
    if (!isoDate) return "";
    return isoDate.split("T")[0];
  };

  // Map API Response to Local Interface
  const transformAPIResponse = (data: APILeaveRequest[]): ManagerLeaveRequest[] => {
    const mapped = data.map((item: APILeaveRequest) => {
      const empName =
        item.employeeName && item.employeeName.trim() !== "" ? item.employeeName : "Employee";

      const datesObj = (item.days || []).map((d: APILeaveDay) => ({
        id: d.id,
        dateStr: formatDateStr(d.leaveDate),
        status: d.status,
        managerComment: d.managerComment || undefined,
      }));

      const existingComment =
        item.days?.find((d: APILeaveDay) => d.managerComment)?.managerComment || "";
      const approvedIds = (item.days || [])
        .filter((d: APILeaveDay) => d.status === 1)
        .map((d: APILeaveDay) => d.id);

      return {
        id: item.id,
        leaveType: item.leaveTypeName || "Leave",
        selectedDates: datesObj,
        approvedDates: approvedIds,
        market: item.marketName || "—",
        ntid: item.managerNTID || "",
        employeeName: empName,
        reason: item.reason || "",
        status: mapStatusToText(item.status),
        createdAt: formatDateStr(item.createdAt),
        managerNote: existingComment,
        avatar: getInitials(empName),
        rawRequest: item,
      };
    });

    return mapped.sort((a, b) => b.id - a.id);
  };

  // Load Data on Mount
  const fetchRequests = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      let currentUserId = Number(localStorage.getItem("userId")) || 0;
      if (!currentUserId && user?.id) {
        currentUserId = Number(user.id) || 0;
      }
      if (!currentUserId) {
        try {
          const raw = localStorage.getItem("user");
          if (raw) {
            const parsed = JSON.parse(raw);
            currentUserId = Number(parsed?.id) || 0;
          }
        } catch {
          /* ignore */
        }
      }

      if (!currentUserId) {
        setRequests([]);
        return;
      }

      const response = await getManagerLeaveRequests(currentUserId);
      const transformed = transformAPIResponse(response);
      setRequests(transformed);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg("Failed to fetch leave requests");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  // Open Detail View
  const handleOpenDetail = (req: ManagerLeaveRequest) => {
    setSelectedRequest(req);
    setManagerNote(req.managerNote || "");

    // Default select all days if pending or approved days if available
    if (req.status === "Pending") {
      setCheckedDayIds(req.selectedDates.map((d) => d.id));
    } else {
      setCheckedDayIds(req.approvedDates);
    }
  };

  // Toggle Single Day Checkbox
  const handleToggleDate = (dayId: number) => {
    if (checkedDayIds.includes(dayId)) {
      setCheckedDayIds(checkedDayIds.filter((id) => id !== dayId));
    } else {
      setCheckedDayIds([...checkedDayIds, dayId]);
    }
  };

  // Toggle "Select All" Checkbox
  const handleToggleSelectAll = () => {
    if (!selectedRequest) return;
    if (checkedDayIds.length === selectedRequest.selectedDates.length) {
      setCheckedDayIds([]);
    } else {
      setCheckedDayIds(selectedRequest.selectedDates.map((d) => d.id));
    }
  };

  // Handle Approval Action (Calls DecideDays API)
  const handleApprove = async () => {
    if (!selectedRequest) return;

    setSubmitting(true);
    try {
      const payload: DecideDayPayload[] = selectedRequest.selectedDates.map((day) => {
        const isApproved = checkedDayIds.includes(day.id);
        return {
          dayId: day.id,
          status: isApproved ? 1 : 2, // Approved = 1, Rejected = 2
          managerComment: managerNote.trim(),
        };
      });

      await decideLeaveDays(payload);
      await fetchRequests(); // Refresh data after update
      setSelectedRequest(null);
    } catch (err: any) {
      alert(`Error updating request: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Complete Rejection (Calls DecideDays API)
  const handleReject = async () => {
    if (!selectedRequest) return;

    setSubmitting(true);
    try {
      const payload: DecideDayPayload[] = selectedRequest.selectedDates.map((day) => ({
        dayId: day.id,
        status: 2,
        managerComment: managerNote.trim(),
      }));

      await decideLeaveDays(payload);
      await fetchRequests();
      setIsRejectModalOpen(false); // Close Modal on success
      setSelectedRequest(null);
    } catch (err: any) {
      alert(`Error rejecting request: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Filter Logic
  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      const matchesTab =
        activeTab === "All"
          ? true
          : activeTab === "Approved"
            ? r.status === "Approved" || r.status === "Partially Approved"
            : r.status === activeTab;

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        r.employeeName.toLowerCase().includes(q) ||
        r.market.toLowerCase().includes(q) ||
        r.reason.toLowerCase().includes(q);

      return matchesTab && matchesSearch;
    });
  }, [requests, activeTab, searchQuery]);

  // Tab counts
  const pendingCount = requests.filter((r) => r.status === "Pending").length;
  const approvedCount = requests.filter(
    (r) => r.status === "Approved" || r.status === "Partially Approved",
  ).length;
  const rejectedCount = requests.filter((r) => r.status === "Rejected").length;
  const allCount = requests.length;

  // Calendar Day Leave Aggregator
  const getLeavesForDate = (dateStr: string) => {
    const leaves: {
      request: ManagerLeaveRequest;
      employeeName: string;
      market: string;
      avatar: string;
      status: number;
    }[] = [];

    requests.forEach((req) => {
      const q = searchQuery.toLowerCase().trim();
      if (
        q &&
        !req.employeeName.toLowerCase().includes(q) &&
        !req.market.toLowerCase().includes(q)
      ) {
        return;
      }

      req.selectedDates.forEach((d) => {
        if (d.dateStr === dateStr && (d.status === 1 || req.status === "Approved" || req.status === "Partially Approved")) {
          // Add approved employee day
          leaves.push({
            request: req,
            employeeName: req.employeeName,
            market: req.market,
            avatar: req.avatar,
            status: d.status,
          });
        }
      });
    });

    return leaves;
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-5 p-4 sm:p-6 min-h-[calc(100vh-100px)]">
      {/* Loading state indicator */}
      {loading ? (
        <div className="bg-white rounded-3xl border border-slate-100 p-16 text-center flex flex-col items-center justify-center space-y-3 shadow-sm">
          <Loader2 className="w-8 h-8 text-violet-600 animate-spin" />
          <p className="text-xs font-semibold text-slate-500">Loading leave requests...</p>
        </div>
      ) : errorMsg ? (
        <div className="bg-rose-50 border border-rose-100 rounded-3xl p-8 text-center space-y-3 shadow-sm">
          <p className="text-sm text-rose-600 font-bold">{errorMsg}</p>
          <button
            onClick={fetchRequests}
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-rose-600 text-white text-xs font-bold rounded-xl hover:bg-rose-700 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        </div>
      ) : selectedRequest ? (
        /* ======================== DETAIL VIEW CARD ======================== */
        <div className="bg-white rounded-3xl border border-slate-100 p-6 sm:p-8 shadow-sm space-y-6 max-w-2xl mx-auto animate-fade-in">
          {/* Back Button */}
          <button
            onClick={() => setSelectedRequest(null)}
            disabled={submitting}
            className="flex items-center space-x-2 text-xs font-bold text-slate-500 hover:text-violet-600 transition py-1 disabled:opacity-50"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Requests List</span>
          </button>

          {/* User Info Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-5 gap-4">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 rounded-2xl bg-violet-100 text-violet-700 font-bold text-base flex items-center justify-center shrink-0 shadow-inner">
                {selectedRequest.avatar}
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-bold text-slate-900 truncate">
                  {selectedRequest.employeeName}
                </h3>
                <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5 mt-0.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="font-semibold">{selectedRequest.market}</span>
                </div>
              </div>
            </div>

            <div className="self-start sm:self-center">
              <span
                className={`text-xs font-bold px-3.5 py-1.5 rounded-full border inline-block ${
                  selectedRequest.status === "Approved"
                    ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                    : selectedRequest.status === "Partially Approved"
                      ? "bg-blue-50 text-blue-600 border-blue-200"
                      : selectedRequest.status === "Rejected"
                        ? "bg-rose-50 text-rose-600 border-rose-200"
                        : "bg-amber-50 text-amber-600 border-amber-200"
                }`}
              >
                {selectedRequest.status}
              </span>
            </div>
          </div>

          {/* Request Meta Data Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                TOTAL REQUESTED DAYS
              </span>
              <p className="text-sm font-bold text-slate-800">
                {selectedRequest.selectedDates.length} Days
              </p>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                REQUESTED DATE RANGE
              </span>
              <p className="text-sm font-bold text-slate-800">
                {selectedRequest.selectedDates[0]?.dateStr} to{" "}
                {selectedRequest.selectedDates[selectedRequest.selectedDates.length - 1]?.dateStr}
              </p>
            </div>
          </div>

          {/* Reason Section */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              EMPLOYEE REASON
            </span>
            <p className="text-xs sm:text-sm font-medium text-slate-700 leading-relaxed">
              {selectedRequest.reason || "No reason provided."}
            </p>
          </div>

          {/* Date Selection Checkbox Section */}
          <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-3">
            <div className="flex flex-wrap items-center justify-between border-b border-slate-200 pb-2.5 gap-2">
              <span className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1.5">
                <CalendarIcon className="w-4 h-4 text-violet-600" /> Select Dates To Approve
              </span>

              {/* Select All Checkbox */}
              {selectedRequest.status === "Pending" && (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleToggleSelectAll}
                  className="flex items-center space-x-1.5 text-xs font-bold text-violet-600 hover:text-violet-800 transition py-0.5 disabled:opacity-50"
                >
                  {checkedDayIds.length === selectedRequest.selectedDates.length ? (
                    <CheckSquare className="w-4 h-4 text-violet-600" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-400" />
                  )}
                  <span>Select All ({selectedRequest.selectedDates.length})</span>
                </button>
              )}
            </div>

            {/* Dates List with Individual Checkboxes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {selectedRequest.selectedDates.map((item) => {
                const isChecked = checkedDayIds.includes(item.id);
                const isReadOnly = selectedRequest.status !== "Pending" || submitting;

                return (
                  <div
                    key={item.id}
                    onClick={() => !isReadOnly && handleToggleDate(item.id)}
                    className={`flex items-center justify-between p-3 rounded-xl border transition touch-manipulation ${
                      isReadOnly
                        ? "bg-slate-100/80 border-slate-200 cursor-default"
                        : isChecked
                          ? "bg-violet-50 border-violet-300 cursor-pointer ring-1 ring-violet-400/20"
                          : "bg-white border-slate-200 cursor-pointer hover:bg-slate-50"
                    }`}
                  >
                    <span className="text-xs font-bold text-slate-700">{item.dateStr}</span>
                    <div>
                      {isChecked ? (
                        <CheckSquare className="w-5 h-5 text-violet-600" />
                      ) : (
                        <Square className="w-5 h-5 text-slate-300" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Manager Note Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Manager Note / Feedback (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="Add a comment or note for the employee..."
              value={managerNote}
              onChange={(e) => setManagerNote(e.target.value)}
              disabled={selectedRequest.status !== "Pending" || submitting}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-600 resize-none font-medium disabled:opacity-75"
            />
          </div>

          {/* Action Buttons for Pending Requests */}
          {selectedRequest.status === "Pending" && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setIsRejectModalOpen(true)}
                className="w-full sm:flex-1 py-3 bg-rose-50 text-rose-600 font-bold rounded-xl text-xs hover:bg-rose-100 transition flex items-center justify-center space-x-1.5 active:scale-[0.99] disabled:opacity-50"
              >
                <XCircle className="w-4 h-4" />
                <span>Reject Entire Request</span>
              </button>

              <button
                type="button"
                disabled={submitting || checkedDayIds.length === 0}
                onClick={handleApprove}
                className="w-full sm:flex-1 py-3 bg-violet-600 text-white font-bold rounded-xl text-xs hover:bg-violet-700 shadow-md shadow-violet-600/20 transition flex items-center justify-center space-x-1.5 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      Approve Selected ({checkedDayIds.length}/
                      {selectedRequest.selectedDates.length})
                    </span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      ) : (
        /* ======================== MAIN VIEW LAYOUT ======================== */
        <div className="space-y-6">
          {/* Header & Search Bar (Matches Screenshot 1 & 2) */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Manager Leave Approvals
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 font-medium flex items-center space-x-1.5 mt-1">
                <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                <span>Select requests to approve individual or all requested dates</span>
              </p>
            </div>

            <div className="relative w-full sm:w-80">
              <input
                type="text"
                placeholder="Search employee or market..."
                value={searchQuery}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs sm:text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-600 shadow-sm"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          {/* Filter Bar: Left Filter Tabs (List view only) + Right List/Calendar Switcher */}
          <div className="flex items-center justify-between gap-3 pt-1">
            {viewMode === "list" ? (
              /* Filter Tabs (Pending, Approved, Rejected, All) */
              <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar py-1">
                <button
                  type="button"
                  onClick={() => setActiveTab("Pending")}
                  className={`px-4 py-2 rounded-full text-xs font-bold flex items-center space-x-2 transition ${
                    activeTab === "Pending"
                      ? "bg-slate-900 text-white shadow-sm"
                      : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <span>Pending</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      activeTab === "Pending"
                        ? "bg-slate-700 text-white"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {pendingCount}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("Approved")}
                  className={`px-4 py-2 rounded-full text-xs font-bold flex items-center space-x-2 transition ${
                    activeTab === "Approved"
                      ? "bg-slate-900 text-white shadow-sm"
                      : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <span>Approved</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      activeTab === "Approved"
                        ? "bg-slate-700 text-white"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {approvedCount}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("Rejected")}
                  className={`px-4 py-2 rounded-full text-xs font-bold flex items-center space-x-2 transition ${
                    activeTab === "Rejected"
                      ? "bg-slate-900 text-white shadow-sm"
                      : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <span>Rejected</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      activeTab === "Rejected"
                        ? "bg-slate-700 text-white"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {rejectedCount}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("All")}
                  className={`px-4 py-2 rounded-full text-xs font-bold flex items-center space-x-2 transition ${
                    activeTab === "All"
                      ? "bg-slate-900 text-white shadow-sm"
                      : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <span>All</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      activeTab === "All"
                        ? "bg-slate-700 text-white"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {allCount}
                  </span>
                </button>
              </div>
            ) : (
              <div />
            )}

            {/* List vs Calendar View Toggle Button (Matches Screenshots) */}
            <div className="bg-slate-100/90 p-1 rounded-2xl flex items-center shrink-0 ml-auto border border-slate-200/60 shadow-inner">
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                  viewMode === "list"
                    ? "bg-white text-violet-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>List</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode("calendar")}
                className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                  viewMode === "calendar"
                    ? "bg-white text-violet-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <CalendarIcon className="w-3.5 h-3.5" />
                <span>Calendar</span>
              </button>
            </div>
          </div>

          {/* ======================== 1. LIST VIEW ======================== */}
          {viewMode === "list" ? (
            <div className="space-y-3.5">
              {filteredRequests.length === 0 ? (
                <div className="bg-white rounded-3xl border border-slate-100 p-12 text-center text-xs sm:text-sm text-slate-400 font-medium shadow-sm">
                  No leave requests found for the selected filter.
                </div>
              ) : (
                filteredRequests.map((req) => (
                  <div
                    key={req.id}
                    onClick={() => handleOpenDetail(req)}
                    className="bg-white rounded-2xl sm:rounded-3xl border border-slate-100 p-4 sm:p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:border-violet-200 hover:shadow-md transition duration-200 flex flex-col sm:flex-row sm:items-center justify-between cursor-pointer gap-4 active:scale-[0.99]"
                  >
                    <div className="flex items-center space-x-4 min-w-0">
                      {/* Round Initials Avatar */}
                      <div className="w-12 h-12 rounded-2xl bg-violet-50 text-violet-700 font-bold text-sm flex items-center justify-center shrink-0 shadow-inner">
                        {req.avatar}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-extrabold text-slate-900 text-sm sm:text-base tracking-tight truncate">
                            {req.employeeName}
                          </h4>
                          <span className="text-slate-300 font-bold">•</span>
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wide truncate">
                            {req.market}
                          </span>
                        </div>

                        <div className="text-xs text-slate-400 font-medium mt-0.5">
                          <span>{req.selectedDates.length} Days requested</span>
                        </div>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center justify-between sm:justify-end border-t border-slate-50 pt-2 sm:pt-0 sm:border-0">
                      <span
                        className={`text-xs font-bold px-4 py-1.5 rounded-full border ${
                          req.status === "Approved"
                            ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                            : req.status === "Partially Approved"
                              ? "bg-blue-50 text-blue-600 border-blue-100"
                              : req.status === "Rejected"
                                ? "bg-rose-50 text-rose-600 border-rose-100"
                                : "bg-amber-50 text-amber-600 border-amber-100"
                        }`}
                      >
                        {req.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            /* ======================== 2. CALENDAR VIEW ======================== */
            <div className="space-y-4">
              <div className="bg-white rounded-3xl border border-slate-100 p-6 sm:p-8 shadow-sm space-y-6">
                {/* Month Navigator Header (Matches Screenshot 2) */}
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-slate-900 text-lg sm:text-xl tracking-tight">
                    {currentCalendarDate.toLocaleString("default", {
                      month: "long",
                      year: "numeric",
                    })}
                  </h3>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() =>
                        setCurrentCalendarDate(
                          new Date(
                            currentCalendarDate.getFullYear(),
                            currentCalendarDate.getMonth() - 1,
                            1,
                          ),
                        )
                      }
                      className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-50 transition"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentCalendarDate(new Date(2026, 7, 1))}
                      className="px-3.5 py-1 text-xs font-bold text-slate-700 border border-slate-200 rounded-full hover:bg-slate-50 transition"
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setCurrentCalendarDate(
                          new Date(
                            currentCalendarDate.getFullYear(),
                            currentCalendarDate.getMonth() + 1,
                            1,
                          ),
                        )
                      }
                      className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-50 transition"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Days of Week Header */}
                <div className="grid grid-cols-7 text-center font-bold text-slate-400 text-xs tracking-wider uppercase pb-2">
                  <span>SUN</span>
                  <span>MON</span>
                  <span>TUE</span>
                  <span>WED</span>
                  <span>THU</span>
                  <span>FRI</span>
                  <span>SAT</span>
                </div>

                {/* Calendar Grid Boxes */}
                <div className="grid grid-cols-7 gap-2 sm:gap-3">
                  {getDaysInMonthGrid(currentCalendarDate).map((dateStr, idx) => {
                    if (!dateStr) {
                      return (
                        <div
                          key={`empty-${idx}`}
                          className="h-20 sm:h-24 bg-slate-50/50 rounded-2xl"
                        />
                      );
                    }

                    const dayLeaves = getLeavesForDate(dateStr);
                    const dayNumber = parseInt(dateStr.split("-")[2], 10);
                    const isSelected = selectedCalendarDateStr === dateStr;

                    return (
                      <div
                        key={dateStr}
                        onClick={() => setSelectedCalendarDateStr(dateStr)}
                        className={`h-20 sm:h-24 p-2 sm:p-2.5 rounded-2xl border flex flex-col justify-between transition cursor-pointer ${
                          isSelected
                            ? "border-violet-500 bg-violet-50/40 ring-2 ring-violet-500/20 shadow-sm"
                            : dayLeaves.length > 0
                              ? "bg-white border-slate-100 hover:border-violet-200 shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
                              : "bg-white border-slate-100 hover:border-slate-200"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-xs sm:text-sm font-bold ${
                              isSelected ? "text-violet-700" : "text-slate-700"
                            }`}
                          >
                            {dayNumber}
                          </span>

                          {/* Purple count badge matching screenshot */}
                          {dayLeaves.length > 0 && (
                            <span className="bg-violet-600 text-white text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0">
                              {dayLeaves.length}
                            </span>
                          )}
                        </div>

                        {/* Approved Employee Chips */}
                        <div className="space-y-1 overflow-hidden">
                          {dayLeaves.slice(0, 2).map((leave, i) => (
                            <div
                              key={i}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenDetail(leave.request);
                              }}
                              className="text-[10px] bg-slate-100 hover:bg-violet-100 text-slate-700 hover:text-violet-900 px-1.5 py-0.5 rounded truncate font-semibold transition"
                            >
                              {leave.employeeName}
                            </div>
                          ))}
                          {dayLeaves.length > 2 && (
                            <div className="text-[9px] text-slate-400 font-bold px-1">
                              +{dayLeaves.length - 2} more
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Selected Calendar Date Leaves Drawer */}
              {selectedCalendarDateStr &&
                (() => {
                  const dateLeaves = getLeavesForDate(selectedCalendarDateStr);

                  return (
                    <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm space-y-4 animate-fade-in">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <h4 className="text-sm sm:text-base font-bold text-slate-800">
                          Leave Requests on{" "}
                          <span className="text-violet-600">{selectedCalendarDateStr}</span>
                        </h4>
                        <span className="text-xs font-bold text-slate-400">
                          Total: {dateLeaves.length}
                        </span>
                      </div>

                      {dateLeaves.length === 0 ? (
                        <p className="text-xs text-slate-400 font-medium py-2">
                          No approved leave records on this date.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {dateLeaves.map((item, idx) => (
                            <div
                              key={idx}
                              onClick={() => handleOpenDetail(item.request)}
                              className="flex items-center space-x-3.5 p-3.5 bg-slate-50 border border-slate-100 hover:border-violet-300 hover:bg-violet-50/30 rounded-2xl cursor-pointer transition active:scale-[0.99]"
                            >
                              <div className="w-10 h-10 rounded-2xl bg-violet-100 text-violet-700 font-bold text-xs flex items-center justify-center shrink-0">
                                {item.avatar}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold text-slate-800 truncate">
                                  {item.employeeName}
                                </p>
                                <p className="text-[11px] text-slate-400 font-medium truncate">
                                  {item.market}
                                </p>
                              </div>
                              <span
                                className={`text-[10px] font-bold px-2.5 py-1 rounded-full border shrink-0 ${
                                  item.request.status === "Approved"
                                    ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                    : item.request.status === "Partially Approved"
                                      ? "bg-blue-50 text-blue-600 border-blue-100"
                                      : item.request.status === "Rejected"
                                        ? "bg-rose-50 text-rose-600 border-rose-100"
                                        : "bg-amber-50 text-amber-600 border-amber-100"
                                }`}
                              >
                                {item.request.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}
            </div>
          )}
        </div>
      )}

      {/* Rejection Confirmation Modal */}
      {isRejectModalOpen && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-100 p-6 sm:p-8 shadow-xl max-w-sm w-full space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <XCircle className="w-7 h-7" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                Reject Leave Request?
              </h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Are you sure you want to reject all{" "}
                <span className="font-bold text-slate-800">
                  {selectedRequest.selectedDates.length} days
                </span>{" "}
                requested by{" "}
                <span className="font-bold text-slate-800">{selectedRequest.employeeName}</span>?
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setIsRejectModalOpen(false)}
                className="flex-1 py-2.5 bg-slate-100 text-slate-600 font-bold rounded-xl text-xs hover:bg-slate-200 transition disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={submitting}
                onClick={handleReject}
                className="flex-1 py-2.5 bg-rose-600 text-white font-bold rounded-xl text-xs hover:bg-rose-700 shadow-md shadow-rose-600/20 transition flex items-center justify-center space-x-1.5 disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <span>Yes, Reject All</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
