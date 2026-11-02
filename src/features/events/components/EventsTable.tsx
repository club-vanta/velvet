import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { components } from "@/api/types";
import { useLanguage } from "@/lib/i18n";
import { EventRow } from "./EventRow";

type EventLog = components["schemas"]["EventLogPublic"];

const COLUMNS = 6;

export function EventsTable({
  events,
  isLoading,
  meetupNames,
}: {
  events: EventLog[];
  isLoading: boolean;
  /** Meetup names by id, for the meetup column. */
  meetupNames: ReadonlyMap<string, string>;
}) {
  const { t } = useLanguage();

  return (
    <div className="rounded-md border">
      <Table data-cy="events-table">
        <TableHeader>
          <TableRow>
            <TableHead>{t("type")}</TableHead>
            <TableHead>{t("timestamp")}</TableHead>
            <TableHead>{t("guestCol")}</TableHead>
            <TableHead>{t("actor")}</TableHead>
            <TableHead>{t("meetupCol")}</TableHead>
            <TableHead>{t("reason")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading &&
            Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i} data-cy="event-row-loading">
                {Array.from({ length: COLUMNS }).map((__, j) => (
                  <TableCell key={j}>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          {!isLoading && events.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={COLUMNS}
                className="text-center text-muted-foreground py-8"
                data-cy="events-empty"
              >
                {t("noEventsFound")}
              </TableCell>
            </TableRow>
          )}
          {events.map((event) => (
            <EventRow
              key={event.id}
              event={event}
              meetupName={
                event.meetup_id ? meetupNames.get(event.meetup_id) : undefined
              }
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
