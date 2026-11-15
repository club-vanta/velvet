// Generic actions and labels shared by every screen.
// Every key needs an English and a Spanish string; `es` is typed against `en`
// so a missing translation fails the typecheck.

export const en = {
  // Common
  appName: "Alter Tracker",
  retry: "Retry",
  cancel: "Cancel",
  close: "Close",
  view: "View",
  add: "Add",
  adding: "Adding…",
  reasonRequired: "Reason (required)",
  networkError: "Could not reach the server.\nCheck your connection.",
};

export const es: Record<keyof typeof en, string> = {
  // Common
  appName: "Alter Tracker",
  retry: "Reintentar",
  cancel: "Cancelar",
  close: "Cerrar",
  view: "Ver",
  add: "Agregar",
  adding: "Agregando…",
  reasonRequired: "Motivo (requerido)",
  networkError: "No se pudo conectar con el servidor.\nVerificá tu conexión.",
};
