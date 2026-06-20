import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { LanguageProvider } from "./lib/i18n";
import { OrgProvider, useOrg } from "./lib/org";
import { LoginPage } from "./auth/LoginPage";
import { SignupPage } from "./auth/SignupPage";
import { ForgotPasswordPage } from "./auth/ForgotPasswordPage";
import { ResetPasswordPage } from "./auth/ResetPasswordPage";
import { Shell } from "./layout/Shell";
import { DashboardPage } from "./features/dashboard/DashboardPage";
import { MeetupsPage } from "./features/meetups/MeetupsPage";
import { MeetupDetailPage } from "./features/meetups/MeetupDetailPage";
import { GuestsPage } from "./features/guests/GuestsPage";
import { StaffPage } from "./features/staff/StaffPage";
import { EventsPage } from "./features/events/EventsPage";
import { OrganizationsPage } from "./features/organizations/OrganizationsPage";
import { OrganizationDetailPage } from "./features/organizations/OrganizationDetailPage";

function AuthenticatedRoutes() {
  const { user } = useAuth();
  const { activeOrg } = useOrg();
  const isSiteAdmin = user?.role.name === "SITE_ADMIN";
  const isOrgAdmin = activeOrg?.role === "ADMIN";
  const canSeeOrgs = isSiteAdmin || isOrgAdmin;

  return (
    <Shell>
      <Routes>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/meetups" element={<MeetupsPage />} />
        <Route path="/meetups/:id" element={<MeetupDetailPage />} />
        <Route path="/guests" element={<GuestsPage />} />
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
