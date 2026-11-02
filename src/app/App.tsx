import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth, OrgProvider } from "@/domain/session";
import { LanguageProvider } from "@/lib/i18n";
import {
  LoginPage,
  SignupPage,
  ForgotPasswordPage,
  ResetPasswordPage,
} from "@/features/auth";
import { canAccess, useViewer, type Access } from "./access";
import { Shell } from "./layout/Shell";
import { DashboardPage } from "@/features/dashboard";
import { MeetupsPage, MeetupDetailRoute } from "@/features/meetups";
import { GuestsPage, GuestDetailPage } from "@/features/guests";
import { StaffPage } from "@/features/staff";
import { EventsPage } from "@/features/events";
import {
  OrganizationsPage,
  OrganizationDetailPage,
} from "@/features/organizations";

// Charts are only for admins, so recharts loads with this page instead of
// weighing down every cold start.
const StatsPage = lazy(() =>
  import("@/features/stats").then((m) => ({ default: m.StatsPage })),
);

function StatsPageFallback() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}

// Routes a viewer may not open are left out, so they fall through to the
// dashboard. The nav (layout/navItems.ts) uses the same access levels.
function AuthenticatedRoutes() {
  const viewer = useViewer();
  const can = (access: Access) => canAccess(access, viewer);

  return (
    <Shell>
      <Routes>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/meetups" element={<MeetupsPage />} />
        <Route path="/meetups/:id" element={<MeetupDetailRoute />} />
        <Route path="/guests" element={<GuestsPage />} />
        <Route path="/guests/:guestId" element={<GuestDetailPage />} />
        {can("orgAdmin") && (
          <Route
            path="/stats"
            element={
              <Suspense fallback={<StatsPageFallback />}>
                <StatsPage />
              </Suspense>
            }
          />
        )}
        {can("siteAdmin") && <Route path="/staff" element={<StaffPage />} />}
        {can("orgAdmin") && <Route path="/events" element={<EventsPage />} />}
        {can("orgAdmin") && (
          <Route path="/organizations" element={<OrganizationsPage />} />
        )}
        {can("orgAdmin") && (
          <Route
            path="/organizations/:orgId"
            element={<OrganizationDetailPage />}
          />
        )}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Shell>
  );
}

function AppRoutes() {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;

  if (!user) {
    return (
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  return <AuthenticatedRoutes />;
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <OrgProvider>
          <AppRoutes />
          <Toaster richColors theme="dark" />
        </OrgProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}
