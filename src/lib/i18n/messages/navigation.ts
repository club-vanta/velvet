// App navigation (sidebar, bottom nav, user menu).
// Every key needs an English and a Spanish string; `es` is typed against `en`
// so a missing translation fails the typecheck.

export const en = {
  // Nav
  navDashboard: "Dashboard",
  navMeetups: "Meetups",
  navGuests: "Guests",
  navStaff: "Staff",
  navAuditLog: "Audit Log",
  logout: "Logout",
  roleAdmin: "Admin",
  roleStaff: "Staff",
};

export const es: Record<keyof typeof en, string> = {
  // Nav
  navDashboard: "Panel",
  navMeetups: "Eventos",
  navGuests: "Invitados",
  navStaff: "Staff",
  navAuditLog: "Reg. Auditoría",
  logout: "Cerrar sesión",
  roleAdmin: "Admin",
  roleStaff: "Staff",
};
