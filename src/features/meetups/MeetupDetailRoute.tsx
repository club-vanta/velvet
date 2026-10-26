import { useParams } from "react-router-dom";
import { MeetupDetailPage } from "./MeetupDetailPage";

// Keyed by id so following a link from one meetup to another (from a guest's
// profile sheet) starts the page fresh, instead of carrying over the open
// sheet, search, filters, dialogs, and any pending refresh of the previous
// meetup.
export function MeetupDetailRoute() {
  const { id } = useParams();
  return <MeetupDetailPage key={id} />;
}
