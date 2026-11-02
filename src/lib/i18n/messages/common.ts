// Generic actions and labels shared by every screen.
// Every key needs an English and a Spanish string; `es` is typed against `en`
// so a missing translation fails the typecheck.

export const en = {
  // Common
  retry: "Retry",
  cancel: "Cancel",
  close: "Close",
  view: "View",
  add: "Add",
  adding: "Adding…",
  reasonRequired: "Reason (required)",
};

export const es: Record<keyof typeof en, string> = {
  // Common
  retry: "Reintentar",
  cancel: "Cancelar",
  close: "Cerrar",
  view: "Ver",
  add: "Agregar",
  adding: "Agregando…",
  reasonRequired: "Motivo (requerido)",
};
