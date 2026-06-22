import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { type ReactNode } from "react";

import AppLayout from "@/portals/shell/AppLayout";
import LoginPage from "@/portals/auth/LoginPage";
import ForgotPasswordPage from "@/portals/auth/ForgotPasswordPage";
import ResetPasswordPage from "@/portals/auth/ResetPasswordPage";

import AiChatPage from "@/portals/ai-chat/AiChatPage";
import TeamChatPage from "@/portals/team-chat/TeamChatPage";
import SettingsPage from "@/portals/settings/SettingsPage";

import TicketingDashboardPage from "@/portals/ticketing/DashboardPage";
import TicketsPage from "@/portals/ticketing/TicketsPage";
import TicketDetailPage from "@/portals/ticketing/TicketDetailPage";

import CommissionDashboardPage from "@/portals/commission/DashboardPage";

import UsersPage from "@/portals/admin/UsersPage";
import DepartmentsPage from "@/portals/admin/DepartmentsPage";
import DistrictsPage from "@/portals/admin/DistrictsPage";
import StatesPage from "@/portals/admin/StatesPage";
import MarketsPage from "@/portals/admin/MarketsPage";
import HousesPage from "@/portals/admin/HousesPage";
import StoresPage from "@/portals/admin/StoresPage";
import ExternalPage from "@/portals/admin/ExternalPage";

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
