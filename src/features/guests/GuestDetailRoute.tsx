import { useParams } from "react-router-dom";
import { GuestDetailPage } from "./GuestDetailPage";

// Keyed by id so moving from one guest to another (browser Back or Forward)
// starts the page fresh, instead of carrying over an open dialog that still
// targets the previous guest.
export function GuestDetailRoute() {
  const { guestId } = useParams();
  return <GuestDetailPage key={guestId} />;
}
