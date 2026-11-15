import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import type { components } from "@/api/types";
import { formatDateTime } from "@/lib/format";
import { useLanguage } from "@/lib/i18n";
import {
  eventBadgeVariant,
  eventReason,
  eventTypeLabel,
} from "../lib/eventTypes";

type EventLog = components["schemas"]["EventLogPublic"];

const NONE = "—";

/**
 * One audit log entry. The guest and the meetup link to their pages;
 * `meetupName` is missing for a meetup the org list does not have (yet), so
 * the id stands in.
 */
export function EventRow({
  event,
  meetupName,
}: {
  event: EventLog;
  meetupName: string | undefined;
}) {
  const { t } = useLanguage();

  return (
    <TableRow data-cy={`event-row-${event.id}`}>
      <TableCell>
        <Badge
          variant={eventBadgeVariant(event.event_type)}
          data-cy="event-type"
        >
          {eventTypeLabel(event.event_type, t)}
        </Badge>
      </TableCell>
      <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
        {formatDateTime(event.timestamp)}
      </TableCell>
      <TableCell
        className="text-muted-foreground text-sm"
        data-cy="event-guest"
      >
        {event.guest ? (
          <Link
            to={`/guests/${event.guest.id}`}
            className="hover:text-foreground transition-colors"
          >
            {event.guest.displayname}
          </Link>
        ) : (
          NONE
        )}
      </TableCell>
      <TableCell className="text-sm" data-cy="event-actor">
        {event.actor?.username ?? NONE}
      </TableCell>
      <TableCell
        className="text-muted-foreground text-sm"
        data-cy="event-meetup"
      >
        {event.meetup_id ? (
          <Link
            to={`/meetups/${event.meetup_id}`}
            className="hover:text-foreground transition-colors"
          >
            {meetupName ?? event.meetup_id.slice(0, 8) + "…"}
          </Link>
        ) : (
          NONE
        )}
      </TableCell>
      <TableCell className="text-sm max-w-xs truncate" data-cy="event-reason">
        {eventReason(event, t) ?? NONE}
      </TableCell>
    </TableRow>
  );
}
