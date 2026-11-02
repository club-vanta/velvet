// App navigation (sidebar, bottom nav, top bar).
// Every key needs an English and a Spanish string; `es` is typed against `en`
// so a missing translation fails the typecheck.

export const en = {
  // Nav
  navDashboard: "Dashboard",
  navMeetups: "Meetups",
  navGuests: "Guests",
  navStaff: "Staff",
  navAuditLog: "Audit Log",
  navAuditLogShort: "Log",
  navOrganizationsShort: "Orgs",
  navPendingApprovals: "pending approvals",
  mainNavigation: "Main navigation",
  logout: "Logout",
  roleAdmin: "Admin",
  roleStaff: "Staff",
  // Top bar
  hideSidebar: "Hide sidebar",
  showSidebar: "Show sidebar",
  languageMenu: "Language",
  organizationMenu: "Organization",
};

export const es: Record<keyof typeof en, string> = {
  // Nav
  navDashboard: "Panel",
  navMeetups: "Eventos",
  navGuests: "Invitados",
  navStaff: "Staff",
  navAuditLog: "Reg. Auditoría",
  navAuditLogShort: "Log",
  navOrganizationsShort: "Orgs",
  navPendingApprovals: "aprobaciones pendientes",
  mainNavigation: "Navegación principal",
  logout: "Cerrar sesión",
  roleAdmin: "Admin",
  roleStaff: "Staff",
  // Top bar
  hideSidebar: "Ocultar barra lateral",
  showSidebar: "Mostrar barra lateral",
  languageMenu: "Idioma",
  organizationMenu: "Organización",
};
