// Audit log (/events).
// Every key needs an English and a Spanish string; `es` is typed against `en`
// so a missing translation fails the typecheck.

export const en = {
  // Events page
  auditLog: "Audit Log",
  allEvents: "All events",
  eventCheckIn: "Check-in",
  eventUndo: "Un-check-in",
  eventBan: "Vant",
  eventUnban: "Unvant",
  eventWalkin: "Walk-in",
  eventGuestCreated: "Guest created",
  eventGuestMazmoLinked: "Mazmo account linked",
  eventGuestMazmoUnlinked: "Mazmo account unlinked",
  eventFinalized: "Finalized",
  eventUnfinalized: "Unfinalized",
  eventPaymentRecorded: "Payment recorded",
  eventPaymentRevoked: "Payment revoked",
  eventPaymentEnabled: "Payment enabled",
  eventPaymentDisabled: "Payment disabled",
  failedLoadAuditLog: "Failed to load audit log.",
  timestamp: "Timestamp",
  actor: "Actor",
  type: "Type",
  guestCol: "Guest",
  meetupCol: "Meetup",
  noEventsFound: "No events found.",
  loadMore: "Load more",
};

export const es: Record<keyof typeof en, string> = {
  // Events page
  auditLog: "Registro de Auditoría",
  allEvents: "Todos los eventos",
  eventCheckIn: "Ingreso",
  eventUndo: "Anular ingreso",
  eventBan: "Vanteo",
  eventUnban: "Desvanteo",
  eventWalkin: "Discreto",
  eventGuestCreated: "Invitado creado",
  eventGuestMazmoLinked: "Cuenta de Mazmo vinculada",
  eventGuestMazmoUnlinked: "Cuenta de Mazmo desvinculada",
  eventFinalized: "Finalizado",
  eventUnfinalized: "Des-finalizado",
  eventPaymentRecorded: "Pago registrado",
  eventPaymentRevoked: "Pago deshecho",
  eventPaymentEnabled: "Pago habilitado",
  eventPaymentDisabled: "Pago deshabilitado",
  failedLoadAuditLog: "Error al cargar registro.",
  timestamp: "Fecha/Hora",
  actor: "Actor",
  type: "Tipo",
  guestCol: "Invitado",
  meetupCol: "Evento",
  noEventsFound: "Sin eventos.",
  loadMore: "Cargar más",
};
