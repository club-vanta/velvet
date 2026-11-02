// Staff management (site admins).
// Every key needs an English and a Spanish string; `es` is typed against `en`
// so a missing translation fails the typecheck.

export const en = {
  // Staff page
  staffManagement: "Staff Management",
  allStaff: "All Staff",
  pendingApproval: "Pending Approval",
  role: "Role",
  joined: "Joined",
  actions: "Actions",
  noStaffAccounts: "No staff accounts.",
  revoke: "Revoke",
  approve: "Approve",
  disable: "Disable",
  enable: "Enable",
  failedLoadStaff: "Failed to load staff.",
  statusDisabled: "Disabled",
  statusPending: "Pending",
  statusActive: "Active",
  disableDialogTitle: "Disable",
  disableReasonPlaceholder: "e.g. Left the organisation",
  disabling: "Disabling…",
  disableAccount: "Disable account",
  failedDisable: "Failed to disable account",
  accountApproved: "Account approved",
  approvalRevoked: "Approval revoked",
  roleUpdated: "Role updated",
  accountReenabled: "Account re-enabled",
};

export const es: Record<keyof typeof en, string> = {
  // Staff page
  staffManagement: "Gestión de Staff",
  allStaff: "Todo el Staff",
  pendingApproval: "Pendientes",
  role: "Rol",
  joined: "Se unió",
  actions: "Acciones",
  noStaffAccounts: "Sin cuentas de staff.",
  revoke: "Revocar",
  approve: "Aprobar",
  disable: "Deshabilitar",
  enable: "Habilitar",
  failedLoadStaff: "Error al cargar staff.",
  statusDisabled: "Deshabilitado",
  statusPending: "Pendiente",
  statusActive: "Activo",
  disableDialogTitle: "¿Deshabilitar a",
  disableReasonPlaceholder: "Ej: Dejó la organización",
  disabling: "Deshabilitando…",
  disableAccount: "Deshabilitar cuenta",
  failedDisable: "Error al deshabilitar cuenta",
  accountApproved: "Cuenta aprobada",
  approvalRevoked: "Aprobación revocada",
  roleUpdated: "Rol actualizado",
  accountReenabled: "Cuenta reactivada",
};
