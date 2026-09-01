import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { type ReactNode } from "react";

// ---------- Authentication ---------- //
import AppLayout from "@/pages/shell/AppLayout";
import LoginPage from "@/pages/auth/LoginPage";
import ForgotPasswordPage from "@/pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/auth/ResetPasswordPage";
import Setup2FAPage from "@/pages/auth/Setup2FAPage";
import Verify2FAPage from "@/pages/auth/Verify2FAPage";

// ---------- Dashboard ---------- //
import AiChatPage from "@/pages/ai-chat/AiChatPage";
import TeamChatPage from "@/pages/team-chat/TeamChatPage";
import SettingsPage from "@/pages/settings/SettingsPage";

// ---------- Ticketing Portal ---------- //
import TicketingDashboardPage from "@/pages/portals/ticketing/DashboardPage";
import TicketsPage from "@/pages/portals/ticketing/TicketsPage";
import TicketDetailPage from "@/pages/portals/ticketing/TicketDetailPage";
import ExternalPage from "@/pages/portals/ticketing/ExternalPage";

// ---------- Commission Portal ---------- //
import CommissionDashboardPage from "@/pages/portals/commission/DashboardPage";
import CommissionPage from "@/pages/portals/commission/CommissionPage";
import Support from "@/pages/portals/commission/Support";
import Privacy from "@/pages/portals/commission/Privacy";

// ---------- Ranker Portal ---------- //
import RankerDashboardPage from "@/pages/portals/ranker/DashboardPage";
import StandingsPage from "@/pages/portals/ranker/Standings";
import StandingsDetailPage from "@/pages/portals/ranker/StandingsDetail";

// ---------- Leave Portal ---------- //
import RequestLeavePage from "@/pages/portals/leave/RequestLeavePage";
import ApproveLeavePage from "@/pages/portals/leave/ApproveLeavePage";

// ---------- User manager ---------- //
import UsersPage from "@/pages/user-manager/UsersPage";
import UserDetailPage from "@/pages/user-manager/UserDetailPage";
import DepartmentsPage from "@/pages/user-manager/DepartmentsPage";
import DistrictsPage from "@/pages/user-manager/DistrictsPage";
import StatesPage from "@/pages/user-manager/StatesPage";
import MarketsPage from "@/pages/user-manager/MarketsPage";
import HousesPage from "@/pages/user-manager/HousesPage";
import StoresPage from "@/pages/user-manager/StoresPage";
import NotFoundInApp from "@/pages/shell/NotFoundInApp";
import ComingSoon from "@/pages/shell/ComingSoon";

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

/** Commission Dashboard is only visible to role 'admin'. */
function CommissionAdminOnly({ children }: { children: ReactNode }) {
  let isAdmin = false;
  try {
    const raw = window.localStorage.getItem("user");
    if (raw) {
      const u = JSON.parse(raw);
      const access = Array.isArray(u?.portalAccess) ? u.portalAccess : [];
      isAdmin = access.some(
        (p: any) =>
          p?.portalName?.toLowerCase() === "commission" && p?.roleName?.toLowerCase() === "admin",
      );
    }
  } catch {
    /* ignore */
  }
  if (!isAdmin) return <Navigate to="/commission/my-commission" replace />;
  return <>{children}</>;
}

/** Check whether user has manager / supervisor privileges for leave portal */
function isLeaveManager(): boolean {
  try {
    const raw = window.localStorage.getItem("user");
    if (raw) {
      const u = JSON.parse(raw);
      const access = Array.isArray(u?.portalAccess) ? u.portalAccess : [];
      const leaveAccess = access.find((p: any) => p?.portalName?.toLowerCase() === "leave");
      const roleStr = (leaveAccess?.roleName || u?.roleName || u?.role || "user")
        .toLowerCase()
        .replace(/[\s_-]/g, "");

      return [
        "admin",
        "manager",
        "storemanager",
        "districtmanager",
        "statemanager",
        "marketmanager",
      ].includes(roleStr);
    }
  } catch {
    /* ignore */
  }
  return false;
}

function LeaveDashboardRedirect() {
  const isMgr = isLeaveManager();
  return <Navigate to={isMgr ? "/leave/approve" : "/leave/request"} replace />;
}

function LeaveRequestOnly({ children }: { children: ReactNode }) {
  const isMgr = isLeaveManager();
  if (isMgr) return <Navigate to="/leave/approve" replace />;
  return <>{children}</>;
}

function LeaveApproveOnly({ children }: { children: ReactNode }) {
  const isMgr = isLeaveManager();
  if (!isMgr) return <Navigate to="/leave/request" replace />;
  return <>{children}</>;
}

function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist.
        </p>
      </div>
    </div>
  );
}

export function AppRoutes() {
  return (
    <Routes>
      // ---------- Authentication ---------- //
      <Route path="/" element={<Navigate to="/ai-chat" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/setup-2fa" element={<Setup2FAPage />} />
      <Route path="/verify-2fa" element={<Verify2FAPage />} />
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        // ---------- Dashboard ---------- //
        <Route path="/ai-chat" element={<AiChatPage />} />
        <Route path="/chat" element={<TeamChatPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        // ---------- Ticketing Portal ---------- //
        <Route path="/ticketing/dashboard" element={<TicketingDashboardPage />} />
        <Route path="/ticketing/tickets" element={<TicketsPage />} />
        <Route path="/ticketing/tickets/:id" element={<TicketDetailPage />} />
        <Route path="/ticketing/external" element={<ExternalPage />} />
        // ---------- Commission Portal ---------- //
        <Route
          path="/commission/dashboard"
          element={
            <CommissionAdminOnly>
              <CommissionDashboardPage />
            </CommissionAdminOnly>
          }
        />
        <Route path="/commission/my-commission" element={<CommissionPage />} />
        <Route path="/commission/privacy" element={<Privacy />} />
        <Route path="/commission/support" element={<Support />} />
        // ---------- Ranker Portal ---------- //
        <Route path="/ranker/dashboard" element={<RankerDashboardPage />} />
        <Route path="/ranker/standings" element={<StandingsPage />} />
        <Route path="/ranker/standings/detail" element={<StandingsDetailPage />} />
        // ---------- Lease / Scheduling Portals ---------- //
        <Route path="/lease/dashboard" element={<ComingSoon title="Lease Portal Dashboard" />} />
        <Route
          path="/leasing/dashboard"
          element={<ComingSoon title="Leasing Portal Dashboard" />}
        />
        <Route
          path="/scheduling/dashboard"
          element={<ComingSoon title="Scheduling Portal Dashboard" />}
        />
        // ---------- Leave Portal ---------- //
        <Route path="/leave" element={<LeaveDashboardRedirect />} />
        <Route path="/leave/dashboard" element={<LeaveDashboardRedirect />} />
        <Route
          path="/leave/request"
          element={
            <LeaveRequestOnly>
              <RequestLeavePage />
            </LeaveRequestOnly>
          }
        />
        <Route
          path="/leave/my-leaves"
          element={
            <LeaveRequestOnly>
              <RequestLeavePage />
            </LeaveRequestOnly>
          }
        />
        <Route
          path="/leave/approve"
          element={
            <LeaveApproveOnly>
              <ApproveLeavePage />
            </LeaveApproveOnly>
          }
        />
        <Route
          path="/leave/approvals"
          element={
            <LeaveApproveOnly>
              <ApproveLeavePage />
            </LeaveApproveOnly>
          }
        />
        <Route path="/attendance/dashboard" element={<LeaveDashboardRedirect />} />
        // ---------- User Manager ---------- //
        <Route path="/admin/users" element={<UsersPage />} />
        <Route path="/admin/users/:id" element={<UserDetailPage />} />
        <Route path="/admin/departments" element={<DepartmentsPage />} />
        <Route path="/admin/districts" element={<DistrictsPage />} />
        <Route path="/admin/states" element={<StatesPage />} />
        <Route path="/admin/markets" element={<MarketsPage />} />
        <Route path="/admin/houses" element={<HousesPage />} />
        <Route path="/admin/stores" element={<StoresPage />} />
        <Route path="/admin/external" element={<ExternalPage />} />
        {/* Custom 404 page — keeps sidebar + header visible */}
        <Route path="*" element={<NotFoundInApp />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
