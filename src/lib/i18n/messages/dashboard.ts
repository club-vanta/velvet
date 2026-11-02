// Dashboard page.
// Every key needs an English and a Spanish string; `es` is typed against `en`
// so a missing translation fails the typecheck.

export const en = {
  // Dashboard
  dashboard: "Dashboard",
  newMeetup: "New Meetup",
  totalMeetups: "Total meetups",
  totalGuests: "Total guests",
  pendingApprovals: "Pending approvals",
  recentMeetups: "Recent meetups",
  featuredToday: "Happening today",
  featuredNext: "Next meetup",
  featuredLast: "Last meetup",
  openMeetup: "Open meetup",
  statsRsvps: "RSVPs",
  statsArrivedPercent: "{0}% arrived",
  orgTotals: "Organization totals",
  noMeetupsYet: "No meetups yet.",
  failedLoadMeetups: "Failed to load meetups.",
  failedLoadGuests: "Failed to load guests.",
  failedLoadPending: "Failed to load pending staff.",
};

export const es: Record<keyof typeof en, string> = {
  // Dashboard
  dashboard: "Panel",
  newMeetup: "Nuevo Evento",
  totalMeetups: "Total de eventos",
  totalGuests: "Total de invitados",
  pendingApprovals: "Aprobaciones pendientes",
  recentMeetups: "Eventos recientes",
  featuredToday: "Es hoy",
  featuredNext: "Próximo evento",
  featuredLast: "Último evento",
  openMeetup: "Abrir evento",
  statsRsvps: "Anotados",
  statsArrivedPercent: "{0}% ya ingresó",
  orgTotals: "Totales de la organización",
  noMeetupsYet: "Aún no hay eventos.",
  failedLoadMeetups: "Error al cargar eventos.",
  failedLoadGuests: "Error al cargar invitados.",
  failedLoadPending: "Error al cargar staff pendiente.",
};
