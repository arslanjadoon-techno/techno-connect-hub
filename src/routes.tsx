import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { type ReactNode } from "react";

import AppLayout from "@/pages/shell/AppLayout";
import LoginPage from "@/pages/auth/LoginPage";
import ForgotPasswordPage from "@/pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/auth/ResetPasswordPage";
import Setup2FAPage from "@/pages/auth/Setup2FAPage";
import Verify2FAPage from "@/pages/auth/Verify2FAPage";

import AiChatPage from "@/pages/ai-chat/AiChatPage";
import TeamChatPage from "@/pages/team-chat/TeamChatPage";
import SettingsPage from "@/pages/settings/SettingsPage";

import TicketingDashboardPage from "@/pages/portals/ticketing/DashboardPage";
import TicketsPage from "@/pages/portals/ticketing/TicketsPage";
import TicketDetailPage from "@/pages/portals/ticketing/TicketDetailPage";

import CommissionDashboardPage from "@/pages/portals/commission/DashboardPage";

import UsersPage from "@/pages/user-manager/UsersPage";
import DepartmentsPage from "@/pages/user-manager/DepartmentsPage";
import DistrictsPage from "@/pages/user-manager/DistrictsPage";
import StatesPage from "@/pages/user-manager/StatesPage";
import MarketsPage from "@/pages/user-manager/MarketsPage";
import HousesPage from "@/pages/user-manager/HousesPage";
import StoresPage from "@/pages/user-manager/StoresPage";
import ExternalPage from "@/pages/user-manager/ExternalPage";

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">The page you're looking for doesn't exist.</p>
      </div>
    </div>
  );
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/ai-chat" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/setup-2fa" element={<Setup2FAPage />} />
      <Route path="/verify-2fa" element={<Verify2FAPage />} />

      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="/ai-chat" element={<AiChatPage />} />
        <Route path="/chat" element={<TeamChatPage />} />
        <Route path="/settings" element={<SettingsPage />} />

        <Route path="/ticketing/dashboard" element={<TicketingDashboardPage />} />
        <Route path="/ticketing/tickets" element={<TicketsPage />} />
        <Route path="/ticketing/tickets/:id" element={<TicketDetailPage />} />

        <Route path="/commission/dashboard" element={<CommissionDashboardPage />} />

        <Route path="/admin/users" element={<UsersPage />} />
        <Route path="/admin/departments" element={<DepartmentsPage />} />
        <Route path="/admin/districts" element={<DistrictsPage />} />
        <Route path="/admin/states" element={<StatesPage />} />
        <Route path="/admin/markets" element={<MarketsPage />} />
        <Route path="/admin/houses" element={<HousesPage />} />
        <Route path="/admin/stores" element={<StoresPage />} />
        <Route path="/admin/external" element={<ExternalPage />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
