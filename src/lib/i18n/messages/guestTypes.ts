// Per-meetup guest types (invited, walk-in, vendor…).
// Every key needs an English and a Spanish string; `es` is typed against `en`
// so a missing translation fails the typecheck.

export const en = {
  // Guest types (per meetup)
  guestType: "Guest type",
  guestTypeNormal: "Regular",
  guestTypeInvited: "Invited",
  guestTypeVendor: "Vendor",
  guestTypeStaff: "Staff",
  guestTypeNormalDescription: "Pays entry when the event is paid",
  guestTypeInvitedDescription: "Invited by the organizer, no entry fee",
  guestTypeVendorDescription: "Runs a stand at the event, no entry fee",
  guestTypeStaffDescription: "Works the event, no entry fee",
  guestTypeChanged: "{0}: guest type set to {1}",
  guestList: "Guest list",
  paidBeforeExempt: "Paid",
  checkedInToast: "{0} checked in ({1})",
  walkinAddedToast: "{0} added as walk-in",
  syncDoneToast: "Synced: {0} new guests added, {1} skipped",
  guestsRefreshedToast: "Updated {0} guests from Mazmo",
  guestsRefreshedPartialToast:
    "Updated {0} guests from Mazmo. {1} weren't found and kept their data.",
  meetupFinalized: "Finalized",
  checkInBlockedFinalized: "This meetup is finalized",
  rsvpCancelled: "Cancelled",
  guestProfileOf: "Profile of {0}",
  failedLoadVantStatus: "Couldn't check whether this guest is vanted.",
  unlinkBlockedVanted: "A vanted guest can't be unlinked from Mazmo.",
  failedChangeGuestType: "Failed to change guest type",
  guestTypeLockedFinalized:
    "This meetup is finalized, so guest types can't change.",
  paymentExempt: "Exempt",
  paymentExemptInvited: "Exempt from payment: courtesy guest",
  paymentExemptVendor: "Exempt from payment: runs a stand",
  paymentExemptStaff: "Exempt from payment: event staff",
  paymentExemptHint: "Invited, vendor, and staff guests don't pay entry",
  viewProfile: "View profile",
  openFullProfile: "Open full profile",
};

export const es: Record<keyof typeof en, string> = {
  // Guest types (per meetup)
  guestType: "Tipo de invitado",
  guestTypeNormal: "General",
  guestTypeInvited: "Cortesía",
  guestTypeVendor: "Stand",
  guestTypeStaff: "Staff",
  guestTypeNormalDescription: "Paga entrada si el evento es pago",
  guestTypeInvitedDescription: "Invitado por la organización, no paga entrada",
  guestTypeVendorDescription: "Tiene un stand en el evento, no paga entrada",
  guestTypeStaffDescription: "Trabaja en el evento, no paga entrada",
  guestTypeChanged: "Tipo de {0}: {1}",
  guestList: "Lista de invitados",
  paidBeforeExempt: "Pagó",
  checkedInToast: "{0} ingresó ({1})",
  walkinAddedToast: "{0} agregado como discreto",
  syncDoneToast: "Sincronizado: {0} invitados nuevos, {1} omitidos",
  guestsRefreshedToast: "Se actualizaron {0} invitados desde Mazmo",
  guestsRefreshedPartialToast:
    "Se actualizaron {0} invitados desde Mazmo. {1} no se encontraron y quedaron como estaban.",
  meetupFinalized: "Finalizado",
  checkInBlockedFinalized: "Este evento está finalizado",
  rsvpCancelled: "Cancelado",
  guestProfileOf: "Perfil de {0}",
  failedLoadVantStatus: "No se pudo verificar si este invitado está vanteado.",
  unlinkBlockedVanted:
    "No se puede desvincular de Mazmo a un invitado vanteado.",
  failedChangeGuestType: "Error al cambiar el tipo de invitado",
  guestTypeLockedFinalized:
    "Este evento está finalizado, no se puede cambiar el tipo de invitado.",
  paymentExempt: "Exento",
  paymentExemptInvited: "Exento de pago por ser invitado de cortesía",
  paymentExemptVendor: "Exento de pago por tener un stand",
  paymentExemptStaff: "Exento de pago por ser staff",
  paymentExemptHint: "Cortesía, stand y staff no pagan entrada",
  viewProfile: "Ver perfil",
  openFullProfile: "Abrir perfil completo",
};
