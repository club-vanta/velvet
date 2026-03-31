import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { LoginPage } from "./auth/LoginPage";
import { Shell } from "./layout/Shell";
import { DashboardPage } from "./features/dashboard/DashboardPage";
import { MeetupsPage } from "./features/meetups/MeetupsPage";
import { MeetupDetailPage } from "./features/meetups/MeetupDetailPage";
import { GuestsPage } from "./features/guests/GuestsPage";
import { StaffPage } from "./features/staff/StaffPage";
import { EventsPage } from "./features/events/EventsPage";

function AuthenticatedRoutes() {
  const { user } = useAuth();
  const isAdmin = user?.role.name === "ADMIN";

  return (
    <Shell>
      <Routes>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/meetups" element={<MeetupsPage />} />
        <Route path="/meetups/:id" element={<MeetupDetailPage />} />
        <Route path="/guests" element={<GuestsPage />} />
        {isAdmin && <Route path="/staff" element={<StaffPage />} />}
        {isAdmin && <Route path="/events" element={<EventsPage />} />}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Shell>
  );
}

function AppRoutes() {
  const { user } = useAuth();

  if (!user) {
    return (
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  return <AuthenticatedRoutes />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
      <Toaster richColors theme="dark" />
    </AuthProvider>
  );
}
