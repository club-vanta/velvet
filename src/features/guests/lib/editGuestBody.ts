import type { components } from "@/api/types";

type Guest = Pick<
  components["schemas"]["GuestPublic"],
  "displayname" | "instagram_username"
>;
type UpdateGuestRequest = components["schemas"]["UpdateGuestRequest"];

/**
 * The PATCH body for an edit: only the fields that changed. The backend
 * leaves an omitted key alone, so an unchanged field is never sent, and a
 * cleared Instagram handle is sent as an explicit null. A blank name is never
 * sent, since a guest's name cannot be cleared.
 */
export function editGuestBody(
  guest: Guest,
  form: { displayname: string; instagram: string },
): UpdateGuestRequest {
  const body: UpdateGuestRequest = {};
  const displayname = form.displayname.trim();
  if (displayname && displayname !== guest.displayname) {
    body.displayname = displayname;
  }
  const instagram = form.instagram.trim();
  if (instagram !== (guest.instagram_username ?? "")) {
    body.instagram_username = instagram === "" ? null : instagram;
  }
  return body;
}
