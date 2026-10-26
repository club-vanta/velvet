import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { LanguageProvider } from "./lib/i18n";
import { OrgProvider, useIsOrgAdmin } from "./lib/org";
import { LoginPage } from "./auth/LoginPage";
import { SignupPage } from "./auth/SignupPage";
import { ForgotPasswordPage } from "./auth/ForgotPasswordPage";
import { ResetPasswordPage } from "./auth/ResetPasswordPage";
import { Shell } from "./layout/Shell";
import { DashboardPage } from "./features/dashboard/DashboardPage";
import { MeetupsPage } from "./features/meetups/MeetupsPage";
import { MeetupDetailRoute } from "./features/meetups/MeetupDetailRoute";
import { GuestsPage } from "./features/guests/GuestsPage";
import { GuestDetailPage } from "./features/guests/GuestDetailPage";
import { StaffPage } from "./features/staff/StaffPage";
import { EventsPage } from "./features/events/EventsPage";
import { OrganizationsPage } from "./features/organizations/OrganizationsPage";
import { OrganizationDetailPage } from "./features/organizations/OrganizationDetailPage";

// Charts are only for admins, so recharts loads with this page instead of
// weighing down every cold start.
const StatsPage = lazy(() =>
  import("./features/stats/StatsPage").then((m) => ({ default: m.StatsPage })),
);

function StatsPageFallback() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}

function AuthenticatedRoutes() {
  const { user } = useAuth();
  const isSiteAdmin = user?.role.name === "SITE_ADMIN";
  const canSeeOrgs = useIsOrgAdmin();

  return (
    <Shell>
      <Routes>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/meetups" element={<MeetupsPage />} />
        <Route path="/meetups/:id" element={<MeetupDetailRoute />} />
        <Route path="/guests" element={<GuestsPage />} />
        <Route path="/guests/:guestId" element={<GuestDetailPage />} />
        {canSeeOrgs && (
          <Route
            path="/stats"
            element={
              <Suspense fallback={<StatsPageFallback />}>
                <StatsPage />
              </Suspense>
            }
          />
        )}
        {isSiteAdmin && <Route path="/staff" element={<StaffPage />} />}
        {canSeeOrgs && <Route path="/events" element={<EventsPage />} />}
        {canSeeOrgs && (
          <Route path="/organizations" element={<OrganizationsPage />} />
        )}
        {canSeeOrgs && (
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
