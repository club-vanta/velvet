// Organizations and their members.
// Every key needs an English and a Spanish string; `es` is typed against `en`
// so a missing translation fails the typecheck.

export const en = {
  // Organizations page
  createdAt: "Created",
  navOrganizations: "Organizations",
  backToOrgs: "Back to organizations",
};

export const es: Record<keyof typeof en, string> = {
  // Organizations page
  createdAt: "Creado",
  navOrganizations: "Organizaciones",
  backToOrgs: "Volver a organizaciones",
};
