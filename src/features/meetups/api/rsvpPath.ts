/** Path parameters of one guest's RSVP to a meetup. */
export function rsvpPath(orgId: string, meetupId: string, guestId: string) {
  return { path: { org_id: orgId, meetup_id: meetupId, guest_id: guestId } };
}
