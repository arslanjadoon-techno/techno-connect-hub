import { Navigate, Route, Routes, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { type ReactNode } from "react";
import { RankerUserAccessModal } from "@/components/ranker/RankerUserAccessModal";
import { useRankerAuth } from "@/services/portals/ranker/ranker-auth";
import { getStoredPermissions } from "@/lib/api/client";
import PublicPrivacyPage from "@/pages/public/PublicPrivacyPage";
import PublicContactPage from "@/pages/public/PublicContactPage";

// ---------- Authentication ---------- //
import AppLayout from "@/pages/shell/AppLayout";
import LoginPage from "@/pages/auth/LoginPage";
import ForgotPasswordPage from "@/pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/auth/ResetPasswordPage";
import Setup2FAPage from "@/pages/auth/Setup2FAPage";
import Verify2FAPage from "@/pages/auth/Verify2FAPage";
import Reset2FAPage from "@/pages/auth/Reset2FAPage";

// ---------- Application Dashboard ---------- //
import AiChatPage from "@/pages/ai-chat/AiChatPage";
import TeamChatPage from "@/pages/team-chat/TeamChatPage";
import SettingsPage from "@/pages/settings/SettingsPage";

// ---------- Ticketing Portal ---------- //
import TicketingDashboardPage from "@/pages/portals/ticketing/DashboardPage";
import TicketsPage from "@/pages/portals/ticketing/TicketsPage";
import TicketDetailPage from "@/pages/portals/ticketing/TicketDetailPage";
import ExternalPage from "@/pages/portals/ticketing/ExternalPage";

// ---------- Reporting Portal ---------- //
import ReportingDashboard from "@/pages/portals/reporting/Dashboard";

// ---------- Commission Portal ---------- //
import CommissionDashboardPage from "@/pages/portals/commission/DashboardPage";
import CommissionPage from "@/pages/portals/commission/CommissionPage";
import Support from "@/pages/portals/commission/Support";
import Privacy from "@/pages/portals/commission/Privacy";
import HousesPage from "@/pages/portals/commission/HousesPage";

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
import DistrictDetailPage from "@/pages/user-manager/DistrictDetailPage";
import StatesPage from "@/pages/user-manager/StatesPage";
import MarketsPage from "@/pages/user-manager/MarketsPage";
import MarketDetailPage from "@/pages/user-manager/MarketDetailPage";
import StoresPage from "@/pages/user-manager/StoresPage";
import CreatePermissionPage from "@/pages/user-manager/permissions/CreatePermissionPage";
import AssignPermissionsPage from "@/pages/user-manager/permissions/AssignPermissionsPage";
import MisPrivacyPage from "@/pages/mis/MisPrivacyPage";
import MisSupportPage from "@/pages/mis/MisSupportPage";
import NotFoundInApp from "@/pages/shell/NotFoundInApp";
import ComingSoon from "@/pages/shell/ComingSoon";
import ReportingApp from "./pages/portals/reporting/ReportingApp";
import StoreWisePdCompensationPage from "./pages/portals/reporting/store-wise-pd-compensation/page";
import RetentionActivationPage from "./pages/portals/reporting/retention-activation/page";
import ProfitabilityPage from "./pages/portals/reporting/profitability/page";

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) {
    if (location.pathname === "/mis/privacy") return <Navigate to="/privacy" replace />;
    if (location.pathname === "/mis/support") return <Navigate to="/contact-us" replace />;
    return <Navigate to="/login" replace />;
  }
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
        target === "reporting" ||
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
            (target === "ranker" && pNorm.includes("rank")) ||
            (target === "reporting" && pNorm.includes("report"))
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
            (target === "ranker" && pNorm.includes("rank")) ||
            (target === "reporting" && pNorm.includes("report"))
          );
        });
    }
  } catch {
    /* ignore */
  }

  if (!isAllowed) return <Navigate to="/ai-chat" replace />;
  return <>{children}</>;
}

/** Blocks direct navigation to a page whose "show_*" permission resolves to "hide". */
function PermissionRouteGuard({ permKey, children }: { permKey: string; children: ReactNode }) {
  const entry = getStoredPermissions().find((p) => p.permissionKey === permKey);
  const isAllowed = (entry?.accessLevel ?? "hide") !== "hide";
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
      {/* ---------- Authentication ---------- */}
      <Route path="/" element={<Navigate to="/ai-chat" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/setup-2fa" element={<Setup2FAPage />} />
      <Route path="/verify-2fa" element={<Verify2FAPage />} />
      <Route path="/reset-2fa" element={<Reset2FAPage />} />

      {/* ---------- Public Pages (Accessible without login) ---------- */}
      <Route path="/privacy" element={<PublicPrivacyPage />} />
      <Route path="/contact-us" element={<PublicContactPage />} />
      <Route path="/contact" element={<Navigate to="/contact-us" replace />} />
      <Route path="/support" element={<Navigate to="/contact-us" replace />} />
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        {/* ---------- Dashboard ---------- */}
        <Route path="/ai-chat" element={<AiChatPage />} />
        <Route path="/chat" element={<TeamChatPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        {/* ---------- Ticketing Portal ---------- */}
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
        {/* ---------- Commission Portal ---------- */}
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
        <Route
          path="/commission/houses"
          element={
            <PortalRouteGuard portalKey="commission">
              <HousesPage />
            </PortalRouteGuard>
          }
        />
        <Route path="/commission/home" element={<Navigate to="/commission/houses" replace />} />
        {/* ---------- Ranker Portal ---------- */}
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

        {/* ---------- Lease / Scheduling / Ticketing Portals ---------- */}
        <Route
          path="/lease/dashboard"
          element={
            <PortalRouteGuard portalKey="leasing">
              <PermissionRouteGuard permKey="leasing.show_leasing_dashboard">
                <LeasingDashboardPage />
              </PermissionRouteGuard>
            </PortalRouteGuard>
          }
        />
        <Route
          path="/leasing/dashboard"
          element={
            <PortalRouteGuard portalKey="leasing">
              <PermissionRouteGuard permKey="leasing.show_leasing_dashboard">
                <LeasingDashboardPage />
              </PermissionRouteGuard>
            </PortalRouteGuard>
          }
        />
        <Route
          path="/leasing/leasing-view"
          element={
            <PortalRouteGuard portalKey="leasing">
              <PermissionRouteGuard permKey="leasing.show_leasing_view">
                <LeasingViewPage />
              </PermissionRouteGuard>
            </PortalRouteGuard>
          }
        />
        <Route
          path="/leasing/manage-rent-payment-list"
          element={
            <PortalRouteGuard portalKey="leasing">
              <PermissionRouteGuard permKey="leasing.show_rentpayment_list">
                <ManageRentPaymentListPage />
              </PermissionRouteGuard>
            </PortalRouteGuard>
          }
        />
        <Route
          path="/leasing/manage-rent-payment-agreement"
          element={
            <PortalRouteGuard portalKey="leasing">
              <PermissionRouteGuard permKey="leasing.show_rent_agreement">
                <ManageRentPaymentAgreementPage />
              </PermissionRouteGuard>
            </PortalRouteGuard>
          }
        />
        <Route
          path="/leasing/rent-agreement-to-monthly-rent"
          element={
            <PortalRouteGuard portalKey="leasing">
              <PermissionRouteGuard permKey="leasing.show_rent_agreement_table">
                <RentAgreement2MonthlyRentPage />
              </PermissionRouteGuard>
            </PortalRouteGuard>
          }
        />
        <Route
          path="/leasing/lease-monitor/next-month-rent-change"
          element={
            <PortalRouteGuard portalKey="leasing">
              <PermissionRouteGuard permKey="leasing.show_lease_monitor">
                <UpcomingRentChangesPage />
              </PermissionRouteGuard>
            </PortalRouteGuard>
          }
        />
        <Route
          path="/leasing/lease-monitor/lease-expiry-breakdown"
          element={
            <PortalRouteGuard portalKey="leasing">
              <PermissionRouteGuard permKey="leasing.show_lease_monitor">
                <LeaseExpiryBreakdownPage />
              </PermissionRouteGuard>
            </PortalRouteGuard>
          }
        />
        <Route
          path="/leasing/reports"
          element={
            <PortalRouteGuard portalKey="leasing">
              <PermissionRouteGuard permKey="leasing.show_leasing_reports">
                <LeasingReportsPage />
              </PermissionRouteGuard>
            </PortalRouteGuard>
          }
        />
        <Route
          path="/leasing/bulk-upload/rent"
          element={
            <PortalRouteGuard portalKey="leasing">
              <PermissionRouteGuard permKey="leasing.show_leasing_bulk_upload">
                <BulkUploadRentPage />
              </PermissionRouteGuard>
            </PortalRouteGuard>
          }
        />
        <Route
          path="/leasing/bulk-upload/accounting"
          element={
            <PortalRouteGuard portalKey="leasing">
              <PermissionRouteGuard permKey="leasing.show_leasing_bulk_upload">
                <BulkUploadAccountingPage />
              </PermissionRouteGuard>
            </PortalRouteGuard>
          }
        />
        <Route
          path="/leasing/bulk-upload/lease-details"
          element={
            <PortalRouteGuard portalKey="leasing">
              <PermissionRouteGuard permKey="leasing.show_leasing_bulk_upload">
                <BulkUploadLeaseDetailsPage />
              </PermissionRouteGuard>
            </PortalRouteGuard>
          }
        />
        <Route
          path="/leasing/manage-leasing"
          element={
            <PortalRouteGuard portalKey="leasing">
              <PermissionRouteGuard permKey="leasing.show_manage_leasing">
                <ManageLeasingPage />
              </PermissionRouteGuard>
            </PortalRouteGuard>
          }
        />
        <Route
          path="/leasing/leasing-detail/:techId"
          element={
            <PortalRouteGuard portalKey="leasing">
              <PermissionRouteGuard permKey="leasing.show_leasing_detail">
                <LeasingDetailedPage />
              </PermissionRouteGuard>
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
        {/* ---------- Reporting Portal ---------- */}
        <Route
          path="/reporting"
          element={
            <PortalRouteGuard portalKey="reporting">
              <Navigate to="/reporting/pd-compensation" replace />
            </PortalRouteGuard>
          }
        />
        <Route
          path="/reporting/pd-compensation"
          element={
            <PortalRouteGuard portalKey="reporting">
              <ReportingApp initialView="pd-compensation" />
            </PortalRouteGuard>
          }
        />
        <Route
          path="/reporting/store-wise-pd-compensation"
          element={
            <PortalRouteGuard portalKey="reporting">
              <StoreWisePdCompensationPage />
            </PortalRouteGuard>
          }
        />
        <Route
          path="/reporting/retention-activation"
          element={
            <PortalRouteGuard portalKey="reporting">
              <RetentionActivationPage />
            </PortalRouteGuard>
          }
        />
        <Route
          path="/reporting/profitability"
          element={
            <PortalRouteGuard portalKey="reporting">
              <ProfitabilityPage />
            </PortalRouteGuard>
          }
        />
        {/* ---------- Leave Portal ---------- */}
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
        {/* ---------- User Manager ---------- */}
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
          path="/admin/districts/:id"
          element={
            <UserManagementOnly>
              <DistrictDetailPage />
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
          path="/admin/markets/:id"
          element={
            <UserManagementOnly>
              <MarketDetailPage />
            </UserManagementOnly>
          }
        />
        <Route path="/admin/houses" element={<Navigate to="/commission/houses" replace />} />
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
        {/* MIS Information Routes */}
        <Route path="/mis/privacy" element={<MisPrivacyPage />} />
        <Route path="/mis/support" element={<MisSupportPage />} />
        {/* Custom 404 page — keeps sidebar + header visible */}
        <Route path="*" element={<NotFoundInApp />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
