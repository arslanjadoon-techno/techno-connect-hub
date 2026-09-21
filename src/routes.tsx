import { Navigate, Route, Routes, Outlet } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { type ReactNode } from "react";
import { RankerUserAccessModal } from "@/components/ranker/RankerUserAccessModal";
import { useRankerAuth } from "@/services/portals/ranker/ranker-auth";

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
import StarRankerPage from "@/pages/portals/ranker/StarRankerPage";
import WallOfFamePage from "@/pages/portals/ranker/WallOfFamePage";
import GoalsVsAchievementPage from "@/pages/portals/ranker/GoalsVsAchievementPage";
import SpecialReportPage from "@/pages/portals/ranker/SpecialReportPage";
import HappeningBoardPage from "@/pages/portals/ranker/HappeningBoardPage";
import RulesPage from "@/pages/portals/ranker/RulesPage";
import CriteriaDetailsPage from "@/pages/portals/ranker/CriteriaDetailsPage";

// ---------- Leasing Portal ---------- //
import LeasingDashboardPage from "@/pages/portals/leasing/DashboardPage";
import LeasingViewPage from "@/pages/portals/leasing/LeasingViewPage";
import ManageRentPaymentListPage from "@/pages/portals/leasing/ManageRentPaymentListPage";
import ManageRentPaymentAgreementPage from "@/pages/portals/leasing/ManageRentPaymentAgreementPage";
import RentAgreement2MonthlyRentPage from "@/pages/portals/leasing/RentAgreement2MonthlyRentPage";
import UpcomingRentChangesPage from "@/pages/portals/leasing/UpcomingRentChangesPage";
import LeaseExpiryBreakdownPage from "@/pages/portals/leasing/LeaseExpiryBreakdownPage";
import LeasingReportsPage from "@/pages/portals/leasing/ReportsPage";
import BulkUploadRentPage from "@/pages/portals/leasing/BulkUploadRentPage";
import BulkUploadAccountingPage from "@/pages/portals/leasing/BulkUploadAccountingPage";
import BulkUploadLeaseDetailsPage from "@/pages/portals/leasing/BulkUploadLeaseDetailsPage";
import ManageLeasingPage from "@/pages/portals/leasing/ManageLeasingPage";
import LeasingDetailedPage from "@/pages/portals/leasing/LeasingDetailedPage";

// ---------- Leave Portal ---------- //
import RequestLeavePage from "@/pages/portals/leave-management/RequestLeave";
import ApproveLeavePage from "@/pages/portals/leave-management/ApproveLeave";

// ---------- User manager ---------- //
import UsersPage from "@/pages/user-manager/UsersPage";
import UserDetailPage from "@/pages/user-manager/UserDetailPage";
import DepartmentsPage from "@/pages/user-manager/DepartmentsPage";
import DistrictsPage from "@/pages/user-manager/DistrictsPage";
import StatesPage from "@/pages/user-manager/StatesPage";
import MarketsPage from "@/pages/user-manager/MarketsPage";
import HousesPage from "@/pages/user-manager/HousesPage";
import StoresPage from "@/pages/user-manager/StoresPage";
import CreatePermissionPage from "@/pages/user-manager/permissions/CreatePermissionPage";
import AssignPermissionsPage from "@/pages/user-manager/permissions/AssignPermissionsPage";
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

      // If role is explicitly 'user' or 'employee', they only get Request Leave
      if (roleStr === "user" || roleStr === "employee") {
        return false;
      }

      // Admin or any manager (marketManager, stateManager, storeManager, districtManager, etc.) gets Approve Leave
      return (
        roleStr.includes("manager") ||
        roleStr.includes("admin") ||
        roleStr.includes("supervisor") ||
        roleStr.includes("director") ||
        roleStr.includes("lead") ||
        roleStr.includes("market") ||
        roleStr.includes("state") ||
        roleStr.includes("store") ||
        roleStr.includes("district") ||
        roleStr !== "user"
      );
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

function UserManagementOnly({ children }: { children: ReactNode }) {
  let isAllowed = false;
  try {
    const raw = window.localStorage.getItem("user");
    if (raw) {
      const u = JSON.parse(raw);
      isAllowed = Boolean(u?.allowedUserManagement);
    }
  } catch {
    /* ignore */
  }
  if (!isAllowed) return <Navigate to="/ai-chat" replace />;
  return <>{children}</>;
}

function PortalRouteGuard({ portalKey, children }: { portalKey: string; children: ReactNode }) {
  let isAllowed = false;
  try {
    const raw = window.localStorage.getItem("user");
    if (raw) {
      const u = JSON.parse(raw);
      const assigned = Array.isArray(u?.assignedPortals) ? u.assignedPortals : [];
      const access = Array.isArray(u?.portalAccess) ? u.portalAccess : [];
      const norm = (s: string) =>
        String(s || "")
          .toLowerCase()
          .replace(/[\s_-]/g, "");
      const target = norm(portalKey);

      isAllowed =
        assigned.some((p: string) => {
          const pNorm = norm(p);
          return (
            pNorm === target ||
            (target === "leave" && (pNorm.includes("leave") || pNorm.includes("attendance"))) ||
            (target === "scheduling" &&
              (pNorm.includes("schedul") || pNorm.includes("attendance"))) ||
            (target === "ticketing" && pNorm.includes("ticket")) ||
            (target === "leasing" && pNorm.includes("leas")) ||
            (target === "commission" && pNorm.includes("commiss")) ||
            (target === "ranker" && pNorm.includes("rank"))
          );
        }) ||
        access.some((p: any) => {
          const pNorm = norm(p?.portalName || "");
          return (
            pNorm === target ||
            (target === "leave" && (pNorm.includes("leave") || pNorm.includes("attendance"))) ||
            (target === "scheduling" &&
              (pNorm.includes("schedul") || pNorm.includes("attendance"))) ||
            (target === "ticketing" && pNorm.includes("ticket")) ||
            (target === "leasing" && pNorm.includes("leas")) ||
            (target === "commission" && pNorm.includes("commiss")) ||
            (target === "ranker" && pNorm.includes("rank"))
          );
        });
    }
  } catch {
    /* ignore */
  }

  if (!isAllowed) return <Navigate to="/ai-chat" replace />;
  return <>{children}</>;
}

function RankerPortalGuard() {
  const auth = useRankerAuth();
  return (
    <>
      <Outlet />
      <RankerUserAccessModal isOpen={auth.isRankerUser} />
    </>
  );
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
        {/* <Route path="/ticketing/dashboard" element={<TicketingDashboardPage />} /> */}
        <Route
          path="/ticketing/tickets"
          element={
            <PortalRouteGuard portalKey="ticketing">
              <TicketsPage />
            </PortalRouteGuard>
          }
        />
        <Route
          path="/ticketing/tickets/:id"
          element={
            <PortalRouteGuard portalKey="ticketing">
              <TicketDetailPage />
            </PortalRouteGuard>
          }
        />
        <Route
          path="/ticketing/external"
          element={
            <PortalRouteGuard portalKey="ticketing">
              <ExternalPage />
            </PortalRouteGuard>
          }
        />
        // ---------- Commission Portal ---------- //
        <Route
          path="/commission/dashboard"
          element={
            <PortalRouteGuard portalKey="commission">
              <CommissionAdminOnly>
                <CommissionDashboardPage />
              </CommissionAdminOnly>
            </PortalRouteGuard>
          }
        />
        <Route
          path="/commission/my-commission"
          element={
            <PortalRouteGuard portalKey="commission">
              <CommissionPage />
            </PortalRouteGuard>
          }
        />
        <Route
          path="/commission/privacy"
          element={
            <PortalRouteGuard portalKey="commission">
              <Privacy />
            </PortalRouteGuard>
          }
        />
        <Route
          path="/commission/support"
          element={
            <PortalRouteGuard portalKey="commission">
              <Support />
            </PortalRouteGuard>
          }
        />
        // ---------- Ranker Portal ---------- //
        <Route
          element={
            <PortalRouteGuard portalKey="ranker">
              <RankerPortalGuard />
            </PortalRouteGuard>
          }
        >
          <Route path="/ranker/dashboard" element={<RankerDashboardPage />} />
          <Route path="/ranker/standings" element={<StandingsPage />} />
          <Route path="/ranker/standings/detail" element={<StandingsDetailPage />} />
          <Route path="/ranker/star-ranker" element={<StarRankerPage />} />
          <Route path="/ranker/wall-of-fame" element={<WallOfFamePage />} />
          <Route path="/ranker/goals-vs-achievement" element={<GoalsVsAchievementPage />} />
          <Route path="/ranker/special-report" element={<SpecialReportPage />} />
          <Route path="/ranker/happening-board" element={<HappeningBoardPage />} />
          <Route path="/ranker/rules" element={<RulesPage />} />
          <Route path="/ranker/criteria-details" element={<CriteriaDetailsPage />} />
        </Route>
        // ---------- Lease / Scheduling / Ticketing Portals ---------- //
        <Route
          path="/lease/dashboard"
          element={
            <PortalRouteGuard portalKey="leasing">
              <LeasingDashboardPage />
            </PortalRouteGuard>
          }
        />
        <Route
          path="/leasing/dashboard"
          element={
            <PortalRouteGuard portalKey="leasing">
              <LeasingDashboardPage />
            </PortalRouteGuard>
          }
        />
        <Route
          path="/leasing/leasing-view"
          element={
            <PortalRouteGuard portalKey="leasing">
              <LeasingViewPage />
            </PortalRouteGuard>
          }
        />
        <Route
          path="/leasing/manage-rent-payment-list"
          element={
            <PortalRouteGuard portalKey="leasing">
              <ManageRentPaymentListPage />
            </PortalRouteGuard>
          }
        />
        <Route
          path="/leasing/manage-rent-payment-agreement"
          element={
            <PortalRouteGuard portalKey="leasing">
              <ManageRentPaymentAgreementPage />
            </PortalRouteGuard>
          }
        />
        <Route
          path="/leasing/rent-agreement-to-monthly-rent"
          element={
            <PortalRouteGuard portalKey="leasing">
              <RentAgreement2MonthlyRentPage />
            </PortalRouteGuard>
          }
        />
        <Route
          path="/leasing/lease-monitor/next-month-rent-change"
          element={
            <PortalRouteGuard portalKey="leasing">
              <UpcomingRentChangesPage />
            </PortalRouteGuard>
          }
        />
        <Route
          path="/leasing/lease-monitor/lease-expiry-breakdown"
          element={
            <PortalRouteGuard portalKey="leasing">
              <LeaseExpiryBreakdownPage />
            </PortalRouteGuard>
          }
        />
        <Route
          path="/leasing/reports"
          element={
            <PortalRouteGuard portalKey="leasing">
              <LeasingReportsPage />
            </PortalRouteGuard>
          }
        />
        <Route
          path="/leasing/bulk-upload/rent"
          element={
            <PortalRouteGuard portalKey="leasing">
              <BulkUploadRentPage />
            </PortalRouteGuard>
          }
        />
        <Route
          path="/leasing/bulk-upload/accounting"
          element={
            <PortalRouteGuard portalKey="leasing">
              <BulkUploadAccountingPage />
            </PortalRouteGuard>
          }
        />
        <Route
          path="/leasing/bulk-upload/lease-details"
          element={
            <PortalRouteGuard portalKey="leasing">
              <BulkUploadLeaseDetailsPage />
            </PortalRouteGuard>
          }
        />
        <Route
          path="/leasing/manage-leasing"
          element={
            <PortalRouteGuard portalKey="leasing">
              <ManageLeasingPage />
            </PortalRouteGuard>
          }
        />
        <Route
          path="/leasing/leasing-detail/:techId"
          element={
            <PortalRouteGuard portalKey="leasing">
              <LeasingDetailedPage />
            </PortalRouteGuard>
          }
        />
        <Route
          path="/scheduling/dashboard"
          element={
            <PortalRouteGuard portalKey="scheduling">
              <ComingSoon title="Scheduling Portal Dashboard" />
            </PortalRouteGuard>
          }
        />
        <Route
          path="/ticketing/dashboard"
          element={
            <PortalRouteGuard portalKey="ticketing">
              <ComingSoon title="Ticketing Portal Dashboard" />
            </PortalRouteGuard>
          }
        />
        // ---------- Leave Portal ---------- //
        <Route
          path="/leave"
          element={
            <PortalRouteGuard portalKey="leave">
              <LeaveDashboardRedirect />
            </PortalRouteGuard>
          }
        />
        <Route
          path="/leave/dashboard"
          element={
            <PortalRouteGuard portalKey="leave">
              <LeaveDashboardRedirect />
            </PortalRouteGuard>
          }
        />
        <Route
          path="/leave/request"
          element={
            <PortalRouteGuard portalKey="leave">
              <LeaveRequestOnly>
                <RequestLeavePage />
              </LeaveRequestOnly>
            </PortalRouteGuard>
          }
        />
        <Route
          path="/leave/my-leaves"
          element={
            <PortalRouteGuard portalKey="leave">
              <LeaveRequestOnly>
                <RequestLeavePage />
              </LeaveRequestOnly>
            </PortalRouteGuard>
          }
        />
        <Route
          path="/leave/approve"
          element={
            <PortalRouteGuard portalKey="leave">
              <LeaveApproveOnly>
                <ApproveLeavePage />
              </LeaveApproveOnly>
            </PortalRouteGuard>
          }
        />
        <Route
          path="/leave/approvals"
          element={
            <PortalRouteGuard portalKey="leave">
              <LeaveApproveOnly>
                <ApproveLeavePage />
              </LeaveApproveOnly>
            </PortalRouteGuard>
          }
        />
        <Route
          path="/attendance/dashboard"
          element={
            <PortalRouteGuard portalKey="leave">
              <LeaveDashboardRedirect />
            </PortalRouteGuard>
          }
        />
        // ---------- User Manager ---------- //
        <Route
          path="/admin/users"
          element={
            <UserManagementOnly>
              <UsersPage />
            </UserManagementOnly>
          }
        />
        <Route
          path="/admin/users/:id"
          element={
            <UserManagementOnly>
              <UserDetailPage />
            </UserManagementOnly>
          }
        />
        <Route
          path="/admin/permissions"
          element={
            <UserManagementOnly>
              <Navigate to="/admin/permissions/create" replace />
            </UserManagementOnly>
          }
        />
        <Route
          path="/admin/permissions/create"
          element={
            <UserManagementOnly>
              <CreatePermissionPage />
            </UserManagementOnly>
          }
        />
        <Route
          path="/admin/permissions/assign"
          element={
            <UserManagementOnly>
              <AssignPermissionsPage />
            </UserManagementOnly>
          }
        />
        <Route
          path="/admin/departments"
          element={
            <UserManagementOnly>
              <DepartmentsPage />
            </UserManagementOnly>
          }
        />
        <Route
          path="/admin/districts"
          element={
            <UserManagementOnly>
              <DistrictsPage />
            </UserManagementOnly>
          }
        />
        <Route
          path="/admin/states"
          element={
            <UserManagementOnly>
              <StatesPage />
            </UserManagementOnly>
          }
        />
        <Route
          path="/admin/markets"
          element={
            <UserManagementOnly>
              <MarketsPage />
            </UserManagementOnly>
          }
        />
        <Route
          path="/admin/houses"
          element={
            <UserManagementOnly>
              <HousesPage />
            </UserManagementOnly>
          }
        />
        <Route
          path="/admin/stores"
          element={
            <UserManagementOnly>
              <StoresPage />
            </UserManagementOnly>
          }
        />
        <Route
          path="/admin/external"
          element={
            <UserManagementOnly>
              <ExternalPage />
            </UserManagementOnly>
          }
        />
        {/* Custom 404 page — keeps sidebar + header visible */}
        <Route path="*" element={<NotFoundInApp />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
