import React, { useState, useEffect, ChangeEvent } from 'react';
import {
  Search,
  FileText,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Calendar as CalendarIcon,
  Building2,
  User,
  CheckSquare,
  Square,
  Loader2,
  RefreshCw,
  LayoutGrid,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import {
  getManagerLeaveRequests,
  decideLeaveDays,
  APILeaveRequest,
  DecideDayPayload
} from '@/services/managerLeave.service';

export type LeaveStatus = 'Pending' | 'Approved' | 'Partially Approved' | 'Rejected';

// Internal UI Interface mapped from API
export interface ManagerLeaveRequest {
  id: number;
  leaveType: string;
  selectedDates: { id: number; dateStr: string; status: number }[]; // Raw days mapping
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
  const [requests, setRequests] = useState<ManagerLeaveRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // View & Filter States
  const [activeTab, setActiveTab] = useState<'Pending' | 'Approved' | 'Rejected' | 'All'>('Pending');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedRequest, setSelectedRequest] = useState<ManagerLeaveRequest | null>(null);

  // Detail View Action States (Stores day IDs)
  const [checkedDayIds, setCheckedDayIds] = useState<number[]>([]);
  const [managerNote, setManagerNote] = useState<string>('');

  // Reject Modal Open State
  const [isRejectModalOpen, setIsRejectModalOpen] = useState<boolean>(false);

  // State for View Switcher (List vs Calendar)
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  // Calendar Navigation & Selection States
  const [currentCalendarDate, setCurrentCalendarDate] = useState<Date>(new Date());
  const [selectedCalendarDateStr, setSelectedCalendarDateStr] = useState<string | null>(null);

  // Status mapping helper
  const mapStatusToText = (statusNum: number): LeaveStatus => {
    switch (statusNum) {
      case 1: return 'Approved';
      case 2: return 'Rejected';
      case 3: return 'Partially Approved';
      case 0:
      default: return 'Pending';
    }
  };

  // Helper: Get Absentees (Employees having Approved/Partially Approved leaves) on a specific date (YYYY-MM-DD)
  const getAbsenteesForDate = (dateStr: string) => {
    const absentees: { name: string; market: string; avatar: string }[] = [];

    requests.forEach((req) => {
      // Only check Approved or Partially Approved requests
      if (req.status === 'Approved' || req.status === 'Partially Approved') {
        const hasApprovedDay = req.selectedDates.some(
          (d) => d.dateStr === dateStr && d.status === 1
        );
        if (hasApprovedDay) {
          absentees.push({
            name: req.employeeName,
            market: req.market,
            avatar: req.avatar,
          });
        }
      }
    });

    return absentees;
  };

  // Helper: Days in Month generator
  const getDaysInMonthGrid = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();

    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    const days: (string | null)[] = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    for (let d = 1; d <= totalDays; d++) {
      const dayStr = String(d).padStart(2, '0');
      const monthStr = String(month + 1).padStart(2, '0');
      days.push(`${year}-${monthStr}-${dayStr}`);
    }

    return days;
  };

  // Helper for Initials Avatar
  const getInitials = (name: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  // Format Date ISO string to YYYY-MM-DD
  const formatDateStr = (isoDate: string) => {
    if (!isoDate) return '';
    return isoDate.split('T')[0];
  };

  // Map API Response to Local Interface
  const transformAPIResponse = (data: APILeaveRequest[]): ManagerLeaveRequest[] => {
    const mapped = data.map((item) => {
      // Check if employeeName exists, otherwise fallback to "N/A" or "Unknown"
      const empName = item.employeeName && item.employeeName.trim() !== '' ? item.employeeName : 'Admin';

      const datesObj = (item.days || []).map((d) => ({
        id: d.id,
        dateStr: formatDateStr(d.leaveDate),
        status: d.status,
      }));

      const existingComment = item.days?.find((d) => d.managerComment)?.managerComment || '';
      const approvedIds = (item.days || []).filter((d) => d.status === 1).map((d) => d.id);

      return {
        id: item.id,
        leaveType: 'N/A',
        selectedDates: datesObj,
        approvedDates: approvedIds,
        market: item.marketName || 'N/A',
        ntid: item.managerNTID || '',
        employeeName: empName,
        reason: item.reason || '',
        status: mapStatusToText(item.status),
        createdAt: formatDateStr(item.createdAt),
        managerNote: existingComment,
        avatar: getInitials(item.employeeName),
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

      const currentUserId = Number(localStorage.getItem("userId")) || 0;

      const response = await getManagerLeaveRequests(currentUserId);
      const transformed = transformAPIResponse(response);
      setRequests(transformed);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to fetch leave requests');
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
    setManagerNote(req.managerNote || '');

    // Default select all days if pending or approved days if available
    if (req.status === 'Pending') {
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
      // Create Payload array for each day in selected request
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
  const filteredRequests = requests.filter((r) => {
    const matchesTab =
      activeTab === 'All'
        ? true
        : activeTab === 'Approved'
          ? r.status === 'Approved' || r.status === 'Partially Approved'
          : r.status === activeTab;

    const matchesSearch =
      r.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.ntid.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.market.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesTab && matchesSearch;
  });


  return (
    <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6 p-3 sm:p-6">
      {/* Loading state indicator */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 text-violet-600 animate-spin" />
          <p className="text-xs font-semibold text-slate-500">Loading requests...</p>
        </div>
      ) : errorMsg ? (
        <div className="bg-rose-50 border border-rose-100 rounded-2xl p-6 text-center space-y-3">
          <p className="text-xs sm:text-sm text-rose-600 font-bold">{errorMsg}</p>
          <button
            onClick={fetchRequests}
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-rose-600 text-white text-xs font-bold rounded-xl"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        </div>
      ) : selectedRequest ? (
        /* Detail View Modal / Card */
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-100 p-4 sm:p-6 shadow-sm space-y-4 sm:space-y-6 max-w-2xl mx-auto">
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-3">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-violet-100 text-violet-700 font-bold text-sm sm:text-base flex items-center justify-center shrink-0">
                {selectedRequest.avatar}
              </div>
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 truncate">
                  {selectedRequest.employeeName}
                </h3>
                <div className="text-xs text-slate-400 font-medium flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                  <span className="flex items-center gap-1 truncate">
                    <Building2 className="w-3 h-3 shrink-0" /> {selectedRequest.market}
                  </span>
                </div>
              </div>
            </div>

            <div className="self-start sm:self-center">
              <span
                className={`text-xs font-bold px-3 py-1.5 rounded-xl border inline-block ${selectedRequest.status === 'Approved'
                  ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                  : selectedRequest.status === 'Partially Approved'
                    ? 'bg-blue-50 text-blue-600 border-blue-100'
                    : selectedRequest.status === 'Rejected'
                      ? 'bg-rose-50 text-rose-600 border-rose-100'
                      : 'bg-amber-50 text-amber-600 border-amber-100'
                  }`}
              >
                {selectedRequest.status}
              </span>
            </div>
          </div>

          {/* Request Meta Data Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-1 gap-3 sm:gap-4">
            {/* <div className="bg-slate-50 p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-100">
              <span className="text-[11px] sm:text-xs font-bold text-slate-400 block mb-1">
                USER NTID
              </span>
              <p className="text-xs sm:text-sm font-bold text-slate-800">{selectedRequest.ntid}</p>
            </div> */}
            <div className="bg-slate-50 p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-100">
              <span className="text-[11px] sm:text-xs font-bold text-slate-400 block mb-1">
                TOTAL REQUESTED DAYS
              </span>
              <p className="text-xs sm:text-sm font-bold text-slate-800">
                {selectedRequest.selectedDates.length} Days
              </p>
            </div>
          </div>

          {/* Reason Section */}
          <div className="bg-slate-50 p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-100">
            <span className="text-[11px] sm:text-xs font-bold text-slate-400 block mb-1">
              EMPLOYEE REASON
            </span>
            <p className="text-xs sm:text-sm font-medium text-slate-700 leading-relaxed">
              {selectedRequest.reason}
            </p>
          </div>

          {/* Date Selection Checkbox Section */}
          <div className="border border-slate-200 rounded-xl sm:rounded-2xl p-3.5 sm:p-4 bg-slate-50/50 space-y-3">
            <div className="flex flex-wrap items-center justify-between border-b border-slate-200 pb-2.5 gap-2">
              <span className="text-xs font-bold text-slate-600 uppercase flex items-center gap-1.5">
                <CalendarIcon className="w-4 h-4 text-violet-600" /> Select Dates To Approve
              </span>

              {/* Select All Checkbox */}
              {selectedRequest.status === 'Pending' && (
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
                const isReadOnly = selectedRequest.status !== 'Pending' || submitting;

                return (
                  <div
                    key={item.id}
                    onClick={() => !isReadOnly && handleToggleDate(item.id)}
                    className={`flex items-center justify-between p-3 rounded-xl border transition touch-manipulation ${isReadOnly
                      ? 'bg-slate-100 border-slate-200 cursor-default'
                      : isChecked
                        ? 'bg-violet-50 border-violet-300 cursor-pointer'
                        : 'bg-white border-slate-200 cursor-pointer hover:bg-slate-50'
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
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">
              Manager Note / Feedback (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="Add a comment or note for the employee..."
              value={managerNote}
              onChange={(e) => setManagerNote(e.target.value)}
              disabled={selectedRequest.status !== 'Pending' || submitting}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-600 resize-none font-medium disabled:opacity-75"
            ></textarea>
          </div>

          {/* Action Buttons for Pending Requests */}
          {selectedRequest.status === 'Pending' && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setIsRejectModalOpen(true)}
                className="w-full sm:flex-1 py-3 bg-rose-50 text-rose-600 font-bold rounded-xl text-xs hover:bg-rose-100 transition flex items-center justify-center space-x-1.5 active:scale-[0.99] disabled:opacity-50"
              >
                <XCircle className="w-4 h-4" />
                <span>Reject Entire Request</span>
              </button>

              <div className="relative group w-full sm:flex-1">
                <button
                  type="button"
                  disabled={submitting || checkedDayIds.length === 0}
                  onClick={handleApprove}
                  className="w-full py-3 bg-violet-600 text-white font-bold rounded-xl text-xs hover:bg-violet-700 shadow-md shadow-violet-600/20 transition flex items-center justify-center space-x-1.5 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-violet-600 disabled:shadow-none disabled:active:scale-100 pointer-events-auto"
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

                {/* Tooltip on Hover when Disabled */}
                {checkedDayIds.length === 0 && !submitting && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-slate-900 text-white text-[11px] font-semibold py-1.5 px-3 rounded-lg whitespace-nowrap shadow-lg z-10 pointer-events-none">
                    Select at least one day to approve
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900"></div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Main Content Layout (When no specific request is selected) */
        <div className="space-y-4 sm:space-y-6">
          {/* Header & Search Bar (Available in BOTH List & Calendar views) */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                Manager Leave Approvals
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 font-medium flex items-center space-x-1.5 mt-0.5">
                <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-300 shrink-0" />
                <span>Select requests to approve individual or all requested dates</span>
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder="Search employee or market..."
                value={searchQuery}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2 sm:py-2 text-xs sm:text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-600"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          {/* Filter Line: Tabs only show in LIST View; Toggle stays FIXED on Extreme Right */}
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
            {viewMode === 'list' ? (
              /* Filter Tabs (Visible ONLY in List View) */
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar -mx-3 px-3 sm:mx-0 sm:px-0">
                {(['Pending', 'Approved', 'Rejected', 'All'] as const).map((tab) => {
                  const count = requests.filter((r) =>
                    tab === 'All'
                      ? true
                      : tab === 'Approved'
                        ? r.status === 'Approved' || r.status === 'Partially Approved'
                        : r.status === tab
                  ).length;
                  const isActive = activeTab === tab;

                  return (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 whitespace-nowrap shrink-0 transition ${isActive
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-white text-slate-400 border border-slate-200'
                        }`}
                    >
                      <span>{tab}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full ${isActive ? 'bg-slate-700 text-slate-200' : 'bg-slate-100 text-slate-500'
                          }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              /* Empty spacer to maintain layout alignment in Calendar view */
              <div />
            )}

            {/* List vs Calendar View Toggle Button (Always Fixed on Right Side) */}
            <div className="bg-slate-100 p-1 rounded-xl flex items-center shrink-0 ml-auto">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${viewMode === 'list'
                  ? 'bg-white text-violet-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
                  }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>List</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('calendar')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${viewMode === 'calendar'
                  ? 'bg-white text-violet-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
                  }`}
              >
                <CalendarIcon className="w-3.5 h-3.5" />
                <span>Calendar</span>
              </button>
            </div>
          </div>

          {/* View Mode Switching: List View OR Calendar View */}
          {viewMode === 'list' ? (
            /* REGULAR LIST VIEW */
            <div className="space-y-3 sm:space-y-4">
              {filteredRequests.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-100 p-6 sm:p-8 text-center text-xs sm:text-sm text-slate-400 font-medium">
                  No leave requests found for this filter.
                </div>
              ) : (
                filteredRequests.map((req) => (
                  <div
                    key={req.id}
                    onClick={() => handleOpenDetail(req)}
                    className="bg-white rounded-2xl border border-slate-100 p-4 sm:p-5 shadow-sm hover:border-violet-300 hover:shadow-md transition duration-200 flex flex-col sm:flex-row sm:items-center justify-between cursor-pointer gap-3 sm:gap-4 active:scale-[0.99]"
                  >
                    <div className="flex items-center space-x-3 sm:space-x-4 min-w-0">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-violet-50 text-violet-700 font-bold text-xs sm:text-sm flex items-center justify-center shrink-0">
                        {req.avatar}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-bold text-slate-800 text-xs sm:text-sm truncate">
                            {req.employeeName}
                          </h4>
                          <span className="text-xs text-slate-300">•</span>
                          <span className="text-xs text-slate-500 font-semibold truncate">
                            {req.market}
                          </span>
                        </div>

                        <div className="text-xs text-slate-400 font-medium mt-1 flex flex-wrap items-center gap-1.5">
                          <span className="text-[11px] sm:text-xs">
                            {req.selectedDates.length} Days requested
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end border-t border-slate-50 pt-2 sm:pt-0 sm:border-0 gap-3">
                      <span className="text-[11px] font-medium text-slate-400 sm:hidden">
                        Status:
                      </span>
                      <span
                        className={`text-[11px] sm:text-xs font-bold px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl border ${req.status === 'Approved'
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                          : req.status === 'Partially Approved'
                            ? 'bg-blue-50 text-blue-600 border-blue-100'
                            : req.status === 'Rejected'
                              ? 'bg-rose-50 text-rose-600 border-rose-100'
                              : 'bg-amber-50 text-amber-600 border-amber-100'
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
            /* CALENDAR VIEW */
            <div className="space-y-4">
              {/* Calendar Header / Month Switcher */}
              <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm flex items-center justify-between">
                <h3 className="font-bold text-slate-800 text-sm sm:text-base">
                  {currentCalendarDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </h3>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() =>
                      setCurrentCalendarDate(
                        new Date(
                          currentCalendarDate.getFullYear(),
                          currentCalendarDate.getMonth() - 1,
                          1
                        )
                      )
                    }
                    className="p-2 hover:bg-slate-100 rounded-xl text-slate-600 transition"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCurrentCalendarDate(new Date())}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-700 transition"
                  >
                    Today
                  </button>
                  <button
                    onClick={() =>
                      setCurrentCalendarDate(
                        new Date(
                          currentCalendarDate.getFullYear(),
                          currentCalendarDate.getMonth() + 1,
                          1
                        )
                      )
                    }
                    className="p-2 hover:bg-slate-100 rounded-xl text-slate-600 transition"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Calendar Grid */}
              <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm space-y-2">
                {/* Weekday Names */}
                <div className="grid grid-cols-7 text-center font-bold text-slate-400 text-[11px] uppercase pb-2 border-b border-slate-100">
                  <span>Sun</span>
                  <span>Mon</span>
                  <span>Tue</span>
                  <span>Wed</span>
                  <span>Thu</span>
                  <span>Fri</span>
                  <span>Sat</span>
                </div>

                {/* Date Boxes */}
                <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                  {getDaysInMonthGrid(currentCalendarDate).map((dateStr, idx) => {
                    if (!dateStr) {
                      return (
                        <div key={`empty-${idx}`} className="h-16 sm:h-20 bg-slate-50/50 rounded-xl" />
                      );
                    }

                    const dayRequests = requests.filter(
                      (r) =>
                        r.status !== 'Rejected' && r.status !== 'Pending' &&
                        r.selectedDates.some((d) => d.dateStr === dateStr)
                    );
                    const dayNumber = parseInt(dateStr.split('-')[2], 10);
                    const isSelected = selectedCalendarDateStr === dateStr;

                    return (
                      <div
                        key={dateStr}
                        onClick={() => setSelectedCalendarDateStr(dateStr)}
                        className={`h-16 sm:h-20 p-1.5 sm:p-2 rounded-xl border flex flex-col justify-between transition cursor-pointer ${isSelected
                          ? 'border-violet-600 bg-violet-50/50 ring-2 ring-violet-500/20'
                          : dayRequests.length > 0
                            ? 'bg-violet-50/30 border-violet-100 hover:border-violet-300'
                            : 'bg-white border-slate-100 hover:border-slate-200'
                          }`}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-xs font-bold ${isSelected ? 'text-violet-700' : 'text-slate-700'
                              }`}
                          >
                            {dayNumber}
                          </span>

                          {dayRequests.length > 0 && (
                            <span className="bg-violet-600 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                              {dayRequests.length}
                            </span>
                          )}
                        </div>

                        {/* Request Preview Badges */}
                        <div className="space-y-1 overflow-hidden">
                          {dayRequests.slice(0, 2).map((req, i) => (
                            <div
                              key={i}
                              className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded truncate font-semibold"
                            >
                              {req.employeeName}
                            </div>
                          ))}
                          {dayRequests.length > 2 && (
                            <div className="text-[9px] text-slate-400 font-bold px-1">
                              +{dayRequests.length - 2} more
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Selected Calendar Date Requests Details Drawer */}
              {selectedCalendarDateStr && (() => {
                const dateRequests = requests.filter(
                  (r) =>
                    r.status !== 'Rejected' && r.status !== 'Pending' &&
                    r.selectedDates.some((d) => d.dateStr === selectedCalendarDateStr)
                );

                return (
                  <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                      <h4 className="text-xs sm:text-sm font-bold text-slate-800">
                        Approved requests on <span className="text-violet-600">{selectedCalendarDateStr}</span>
                      </h4>
                      <span className="text-xs font-bold text-slate-400">
                        Total: {dateRequests.length}
                      </span>
                    </div>

                    {dateRequests.length === 0 ? (
                      <p className="text-xs text-slate-400 font-medium py-2">
                        No leave requests on this date.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {dateRequests.map((req) => (
                          <div
                            key={req.id}
                            onClick={() => handleOpenDetail(req)}
                            className="flex items-center space-x-3 p-3 bg-slate-50 border border-slate-100 hover:border-violet-300 hover:bg-violet-50/30 rounded-xl cursor-pointer transition active:scale-[0.99]"
                          >
                            <div className="w-9 h-9 rounded-xl bg-violet-100 text-violet-700 font-bold text-xs flex items-center justify-center shrink-0">
                              {req.avatar}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-slate-800 truncate">
                                {req.employeeName}
                              </p>
                              <p className="text-[11px] text-slate-400 font-medium truncate">
                                {req.market}
                              </p>
                            </div>
                            <span
                              className={`text-[10px] font-bold px-2 py-1 rounded-lg border shrink-0 ${req.status === 'Approved'
                                ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                : req.status === 'Partially Approved'
                                  ? 'bg-blue-50 text-blue-600 border-blue-100'
                                  : req.status === 'Rejected'
                                    ? 'bg-rose-50 text-rose-600 border-rose-100'
                                    : 'bg-amber-50 text-amber-600 border-amber-100'
                                }`}
                            >
                              {req.status}
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
          <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-xl max-w-sm w-full space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <XCircle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900">Reject Leave Request?</h3>
              <p className="text-xs text-slate-500 font-medium">
                Are you sure you want to reject all{' '}
                <span className="font-bold text-slate-800">
                  {selectedRequest.selectedDates.length} days
                </span>{' '}
                requested by{' '}
                <span className="font-bold text-slate-800">{selectedRequest.employeeName}</span>?
              </p>
            </div>

            <div className="flex items-center gap-2.5 pt-2">
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