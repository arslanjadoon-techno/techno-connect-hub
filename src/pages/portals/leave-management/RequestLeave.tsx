import React, { useState, useEffect, useMemo, ChangeEvent } from "react";
import {
  Building2,
  User,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Loader2,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import {
  getMarkets,
  getManagersByMarket,
  getMyLeaveRequests,
  submitLeaveRequest,
  Market,
  Manager,
  LeaveResponse,
} from "@/services/leave-management/request-leave.service";
import { useAuth } from "@/lib/auth";

export default function RequestLeavePage() {
  const { user } = useAuth();

  // Pure API States - No Default / Fallback Records
  const [markets, setMarkets] = useState<Market[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [historyRequests, setHistoryRequests] = useState<LeaveResponse[]>([]);
  const [loadingMarkets, setLoadingMarkets] = useState<boolean>(true);
  const [loadingManagers, setLoadingManagers] = useState<boolean>(false);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form Fields - No Hardcoded Values
  const [selectedMarketId, setSelectedMarketId] = useState<number>(0);
  const [selectedManagerId, setSelectedManagerId] = useState<number>(0);
  const [ntidEmail, setNtidEmail] = useState<string>(
    user?.email || user?.name || "",
  );
  const [reason, setReason] = useState<string>("");

  // Selected Dates (Array of "YYYY-MM-DD" strings)
  const [selectedDates, setSelectedDates] = useState<string[]>([]);

  // Calendar View Month State (Defaults to current month)
  const [calendarDate, setCalendarDate] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  // Current Employee ID from Auth / Storage
  const employeeId = useMemo(() => {
    let id = Number(localStorage.getItem("userId")) || 0;
    if (!id && user?.id) id = Number(user.id) || 0;
    if (!id) {
      try {
        const raw = localStorage.getItem("user");
        if (raw) {
          const parsed = JSON.parse(raw);
          id = Number(parsed?.id) || 0;
        }
      } catch {
        /* ignore */
      }
    }
    return id;
  }, [user]);

  // Load Markets and Leave History on Mount
  useEffect(() => {
    async function init() {
      setLoadingMarkets(true);
      setLoadingHistory(true);
      try {
        const [marketsData, historyData] = await Promise.all([
          getMarkets(),
          employeeId > 0 ? getMyLeaveRequests(employeeId) : Promise.resolve([]),
        ]);

        if (Array.isArray(marketsData)) {
          setMarkets(marketsData);
          if (marketsData.length > 0) {
            setSelectedMarketId(marketsData[0].id);
          }
        }

        if (Array.isArray(historyData)) {
          setHistoryRequests(historyData);
        }
      } catch (err: unknown) {
        console.error("Init error in leave request page:", err);
      } finally {
        setLoadingMarkets(false);
        setLoadingHistory(false);
      }
    }
    init();
  }, [employeeId]);

  // Fetch Managers when selected market changes
  useEffect(() => {
    if (!selectedMarketId) {
      setManagers([]);
      setSelectedManagerId(0);
      return;
    }

    async function loadManagers() {
      setLoadingManagers(true);
      try {
        const mgrs = await getManagersByMarket(selectedMarketId);
        if (Array.isArray(mgrs)) {
          setManagers(mgrs);
          if (mgrs.length > 0) {
            setSelectedManagerId(mgrs[0].id);
          } else {
            setSelectedManagerId(0);
          }
        } else {
          setManagers([]);
          setSelectedManagerId(0);
        }
      } catch (err: unknown) {
        console.error("Error fetching managers:", err);
        setManagers([]);
        setSelectedManagerId(0);
      } finally {
        setLoadingManagers(false);
      }
    }
    loadManagers();
  }, [selectedMarketId]);

  // Today's date string in YYYY-MM-DD
  const todayStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, []);

  // Map of date statuses calculated from direct leave history
  const dateStatusMap = useMemo(() => {
    const approvedDates = new Set<string>();
    const pendingDates = new Set<string>();

    historyRequests.forEach((req) => {
      if (req.days && req.days.length > 0) {
        req.days.forEach((day) => {
          if (!day.leaveDate) return;
          const dStr = day.leaveDate.split("T")[0];
          if (day.status === 1) {
            approvedDates.add(dStr);
          } else if (day.status === 0 || (req.status === 0 && day.status !== 2)) {
            pendingDates.add(dStr);
          }
        });
      } else if (req.fromDate && req.toDate) {
        const start = new Date(req.fromDate);
        const end = new Date(req.toDate);
        const cur = new Date(start);
        while (cur <= end) {
          const dStr = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}-${String(cur.getDate()).padStart(2, "0")}`;
          if (req.status === 1) {
            approvedDates.add(dStr);
          } else if (req.status === 0) {
            pendingDates.add(dStr);
          }
          cur.setDate(cur.getDate() + 1);
        }
      }
    });

    return { approvedDates, pendingDates };
  }, [historyRequests]);

  // Helper to determine status and tooltip for a specific date
  const getDateInfo = (dateStr: string) => {
    if (dateStr < todayStr) {
      return {
        disabled: true,
        type: "passed" as const,
        tooltip: "This date has passed and cannot be selected",
      };
    }
    if (dateStatusMap.approvedDates.has(dateStr)) {
      return {
        disabled: true,
        type: "approved" as const,
        tooltip: "A leave is already approved for this day",
      };
    }
    if (dateStatusMap.pendingDates.has(dateStr)) {
      return {
        disabled: true,
        type: "pending" as const,
        tooltip: "A leave for this day is currently pending approval",
      };
    }
    return {
      disabled: false,
      type: "available" as const,
      tooltip: "",
    };
  };

  // Generate Days for the Calendar Month Grid
  const calendarGrid = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    const days: (string | null)[] = [];

    // Empty offset slots
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }

    // Days in current month
    for (let d = 1; d <= totalDays; d++) {
      const dStr = String(d).padStart(2, "0");
      const mStr = String(month + 1).padStart(2, "0");
      days.push(`${year}-${mStr}-${dStr}`);
    }

    return days;
  }, [calendarDate]);

  // Toggle Date Selection
  const handleToggleDate = (dateStr: string) => {
    const info = getDateInfo(dateStr);
    if (info.disabled) return;

    if (selectedDates.includes(dateStr)) {
      setSelectedDates(selectedDates.filter((d) => d !== dateStr));
    } else {
      setSelectedDates([...selectedDates, dateStr].sort());
    }
  };

  // Month navigation handlers
  const handlePrevMonth = () => {
    setCalendarDate(
      new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1),
    );
  };

  const handleNextMonth = () => {
    setCalendarDate(
      new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1),
    );
  };

  // Submit Leave Request
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!selectedMarketId) {
      setErrorMsg("Please select a market.");
      return;
    }

    if (!selectedManagerId) {
      setErrorMsg("Please select a manager.");
      return;
    }

    if (selectedDates.length === 0) {
      setErrorMsg("Please select at least one date for your leave request.");
      return;
    }

    if (!reason.trim()) {
      setErrorMsg("Please provide a reason for the leave request.");
      return;
    }

    setSubmitting(true);
    try {
      const sorted = [...selectedDates].sort();
      const fromDate = `${sorted[0]}T00:00:00.000Z`;
      const toDate = `${sorted[sorted.length - 1]}T00:00:00.000Z`;

      await submitLeaveRequest({
        employeeId: employeeId || 0,
        marketId: selectedMarketId,
        managerId: selectedManagerId,
        fromDate,
        toDate,
        reason: reason.trim(),
      });

      setSuccessMsg("Leave request submitted successfully!");
      setReason("");
      setSelectedDates([]);

      // Refresh History with live API
      if (employeeId > 0) {
        const updated = await getMyLeaveRequests(employeeId);
        setHistoryRequests(updated);
      }

      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg("Failed to submit leave request");
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Helper for Status Badge & Dot Styling
  const getStatusBadge = (status: number) => {
    switch (status) {
      case 1:
        return (
          <span className="inline-flex items-center px-3.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>
            Approved
          </span>
        );
      case 2:
        return (
          <span className="inline-flex items-center px-3.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-600 border border-rose-100">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-1.5"></span>
            Rejected
          </span>
        );
      case 3:
        return (
          <span className="inline-flex items-center px-3.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-600 border border-blue-100">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-1.5"></span>
            Partially Approved
          </span>
        );
      case 0:
      default:
        return (
          <span className="inline-flex items-center px-3.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-600 border border-amber-100">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5"></span>
            Pending
          </span>
        );
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 p-4 sm:p-6 min-h-[calc(100vh-100px)] animate-fade-in">
      {/* Page Title & Subtitle */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Leave Management
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
          Select date (s) and apply for leave request.
        </p>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-5 py-3.5 rounded-2xl flex items-center space-x-2 text-xs sm:text-sm font-semibold shadow-sm animate-fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-5 py-3.5 rounded-2xl flex items-center space-x-2 text-xs sm:text-sm font-semibold shadow-sm animate-fade-in">
          <XCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ======================== CARD 1: APPLY FOR LEAVE ======================== */}
      <div className="bg-white rounded-3xl border border-slate-100 p-6 sm:p-8 shadow-sm space-y-6">
        {/* Card Header */}
        <div className="flex items-center space-x-2 border-b border-slate-100 pb-4">
          <span className="text-violet-600 font-extrabold text-lg leading-none">+</span>
          <h2 className="text-base sm:text-lg font-bold text-slate-900">
            Apply for Leave
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Top Form Row: Market, Manager, NTID/Email */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            {/* Market Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 flex items-center space-x-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Market</span>
              </label>
              <div className="relative">
                <select
                  value={selectedMarketId}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                    setSelectedMarketId(Number(e.target.value))
                  }
                  disabled={loadingMarkets || markets.length === 0}
                  className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-600 shadow-sm cursor-pointer disabled:opacity-60"
                >
                  {loadingMarkets ? (
                    <option value={0}>Loading markets...</option>
                  ) : markets.length === 0 ? (
                    <option value={0}>No markets available</option>
                  ) : (
                    markets.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))
                  )}
                </select>
                <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <ChevronRight className="w-4 h-4 rotate-90" />
                </div>
              </div>
            </div>

            {/* Manager Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 flex items-center space-x-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>Manager</span>
              </label>
              <div className="relative">
                <select
                  value={selectedManagerId}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                    setSelectedManagerId(Number(e.target.value))
                  }
                  disabled={loadingManagers || managers.length === 0}
                  className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-600 shadow-sm cursor-pointer disabled:opacity-60"
                >
                  {loadingManagers ? (
                    <option value={0}>Loading managers...</option>
                  ) : managers.length === 0 ? (
                    <option value={0}>No managers available</option>
                  ) : (
                    managers.map((mgr) => (
                      <option key={mgr.id} value={mgr.id}>
                        {mgr.name}
                      </option>
                    ))
                  )}
                </select>
                <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <ChevronRight className="w-4 h-4 rotate-90" />
                </div>
              </div>
            </div>

            {/* NTID / Email Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 flex items-center space-x-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>NTID / Email</span>
              </label>
              <input
                type="text"
                value={ntidEmail}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setNtidEmail(e.target.value)}
                placeholder="Enter NTID or Email"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs sm:text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-600 shadow-sm"
              />
            </div>
          </div>

          {/* Select Dates Calendar Section */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-600 flex items-center space-x-1.5">
              <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
              <span>Select Dates</span>
            </label>

            {/* Calendar Box Container */}
            <div className="border border-slate-200 rounded-3xl p-5 sm:p-6 bg-white space-y-4 shadow-sm">
              {/* Calendar Month Header with Nav Arrows */}
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                  {calendarDate.toLocaleString("default", {
                    month: "long",
                    year: "numeric",
                  })}
                </h3>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 transition"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 transition"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Day of Week Headers */}
              <div className="grid grid-cols-7 text-center text-xs font-bold text-slate-400 tracking-wide">
                <span>Sun</span>
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 gap-2 sm:gap-3">
                {calendarGrid.map((dateStr, idx) => {
                  if (!dateStr) {
                    return (
                      <div
                        key={`empty-${idx}`}
                        className="h-11 sm:h-12 rounded-2xl bg-transparent"
                      />
                    );
                  }

                  const info = getDateInfo(dateStr);
                  const isSelected = selectedDates.includes(dateStr);
                  const dayNum = parseInt(dateStr.split("-")[2], 10);

                  // Compute dynamic button styling based on date status
                  let buttonStyle = "bg-white text-slate-800 border-slate-200 hover:border-violet-300 hover:bg-violet-50/30 cursor-pointer";

                  if (info.type === "passed") {
                    buttonStyle = "bg-slate-100/80 text-slate-300 border-slate-200 cursor-not-allowed";
                  } else if (info.type === "approved") {
                    buttonStyle = "bg-emerald-100 text-emerald-800 border-emerald-300 font-bold cursor-not-allowed shadow-xs";
                  } else if (info.type === "pending") {
                    buttonStyle = "bg-amber-100 text-amber-800 border-amber-300 font-bold cursor-not-allowed shadow-xs";
                  } else if (isSelected) {
                    buttonStyle = "bg-violet-600 text-white border-violet-600 shadow-md shadow-violet-600/20 font-bold scale-[1.02]";
                  }

                  return (
                    <button
                      type="button"
                      key={dateStr}
                      disabled={info.disabled}
                      title={info.tooltip || undefined}
                      onClick={() => handleToggleDate(dateStr)}
                      className={`h-11 sm:h-12 rounded-2xl text-xs sm:text-sm font-semibold flex items-center justify-center transition border ${buttonStyle}`}
                    >
                      {dayNum}
                    </button>
                  );
                })}
              </div>

              {/* Status Legend */}
              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-3 sm:gap-4 text-[11px] font-medium text-slate-500">
                <div className="flex items-center space-x-1.5">
                  <span className="w-3 h-3 rounded-md bg-emerald-100 border border-emerald-300"></span>
                  <span>Approved (Leave Taken)</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-3 h-3 rounded-md bg-amber-100 border border-amber-300"></span>
                  <span>Pending Approval</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-3 h-3 rounded-md bg-violet-600"></span>
                  <span>Selected</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-3 h-3 rounded-md bg-white border border-slate-200"></span>
                  <span>Available</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-3 h-3 rounded-md bg-slate-100 border border-slate-200"></span>
                  <span>Passed</span>
                </div>
              </div>

              {/* Selected Dates Summary Counter */}
              {selectedDates.length > 0 && (
                <div className="pt-2 text-xs text-violet-700 font-semibold flex items-center space-x-1">
                  <span>Selected:</span>
                  <span className="font-bold">{selectedDates.length} date(s)</span>
                  <span className="text-slate-400 font-normal">
                    ({selectedDates.join(", ")})
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Reason Section */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 block">
              Reason
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setReason(e.target.value)}
              placeholder="Briefly describe the reason for leave"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs sm:text-sm placeholder:text-slate-400 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-600 resize-none shadow-sm"
            />
          </div>

          {/* Submit Button */}
          <div>
            <button
              type="submit"
              disabled={submitting}
              className="px-8 py-3.5 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-2xl text-xs sm:text-sm shadow-md shadow-violet-600/20 transition flex items-center justify-center space-x-2 active:scale-[0.99] disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <span>Submit Leave Request</span>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* ======================== CARD 2: LEAVE HISTORY ======================== */}
      <div className="bg-white rounded-3xl border border-slate-100 p-6 sm:p-8 shadow-sm space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-bold text-slate-900">
            Leave History
          </h2>
          {loadingHistory && (
            <div className="flex items-center space-x-1.5 text-xs text-slate-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-600" />
              <span>Loading...</span>
            </div>
          )}
        </div>

        {/* History Table */}
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="pb-3 pr-4 font-bold">MARKET</th>
                <th className="pb-3 pr-4 font-bold">MANAGER</th>
                <th className="pb-3 pr-4 font-bold">SELECTED DATES</th>
                <th className="pb-3 pr-4 font-bold text-center">TOTAL DAYS</th>
                <th className="pb-3 pr-4 font-bold">REASON</th>
                <th className="pb-3 font-bold text-right">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
              {historyRequests.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-8 text-center text-xs text-slate-400 font-medium"
                  >
                    No leave requests history found.
                  </td>
                </tr>
              ) : (
                historyRequests.map((req) => {
                  const daysCount =
                    req.days && req.days.length > 0
                      ? req.days.length
                      : req.fromDate && req.toDate
                        ? Math.max(
                            1,
                            Math.round(
                              (new Date(req.toDate).getTime() -
                                new Date(req.fromDate).getTime()) /
                                (1000 * 60 * 60 * 24),
                            ) + 1,
                          )
                        : 1;

                  const dateList =
                    req.days && req.days.length > 0
                      ? req.days.map((d) => d.leaveDate.split("T")[0])
                      : [req.fromDate.split("T")[0]];

                  return (
                    <tr
                      key={req.id}
                      className="hover:bg-slate-50/80 transition group"
                    >
                      {/* MARKET */}
                      <td className="py-4 pr-4 font-bold text-slate-900 uppercase">
                        {req.marketName || "—"}
                      </td>

                      {/* MANAGER */}
                      <td className="py-4 pr-4 font-medium text-slate-600">
                        {req.managerName || "—"}
                      </td>

                      {/* SELECTED DATES */}
                      <td className="py-4 pr-4">
                        <div className="flex flex-wrap items-center gap-1.5 max-w-xs">
                          {dateList.slice(0, 3).map((dStr, idx) => (
                            <span
                              key={idx}
                              className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 font-semibold text-[11px] border border-slate-200/60"
                            >
                              {dStr}
                            </span>
                          ))}
                          {dateList.length > 3 && (
                            <span className="px-2 py-0.5 rounded-xl bg-violet-100 text-violet-700 font-bold text-[10px]">
                              +{dateList.length - 3} more
                            </span>
                          )}
                        </div>
                      </td>

                      {/* TOTAL DAYS */}
                      <td className="py-4 pr-4 font-bold text-slate-900 text-center">
                        {daysCount}
                      </td>

                      {/* REASON */}
                      <td className="py-4 pr-4 font-medium text-slate-600 max-w-xs truncate">
                        {req.reason || "—"}
                      </td>

                      {/* STATUS */}
                      <td className="py-4 text-right">
                        {getStatusBadge(req.status)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
