import { useAuth, useIsOrgAdmin } from "@/domain/session";

/**
 * Who may open a route or see its nav item. The route table and the nav both
 * read it, so a link never points at a route the viewer cannot open.
 */
export type Access = "everyone" | "orgAdmin" | "siteAdmin";

export type Viewer = {
  isSiteAdmin: boolean;
  /** A site admin, or an admin of the active organization. */
  isOrgAdmin: boolean;
};

export function canAccess(access: Access, viewer: Viewer): boolean {
  switch (access) {
    case "everyone":
      return true;
    case "orgAdmin":
      return viewer.isOrgAdmin;
    case "siteAdmin":
      return viewer.isSiteAdmin;
  }
}

/** The signed-in viewer's access level. */
export function useViewer(): Viewer {
  const { user } = useAuth();
  const isOrgAdmin = useIsOrgAdmin();
  return { isSiteAdmin: user?.role.name === "SITE_ADMIN", isOrgAdmin };
}
