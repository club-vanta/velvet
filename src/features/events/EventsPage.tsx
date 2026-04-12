import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/api/client";
import { formatDateTime } from "@/lib/format";
import { useLanguage } from "@/lib/i18n";
import type { components } from "@/api/types";

type EventLog = components["schemas"]["EventLogPublic"];
type EventType = EventLog["event_type"];

const EVENT_BADGE_VARIANT: Record<
  EventType,
  "default" | "secondary" | "destructive" | "outline"
> = {
  CHECK_IN: "default",
  UNDO_CHECK_IN: "secondary",
  BAN: "destructive",
  UNBAN: "outline",
  MEETUP_FINALIZED: "secondary",
  MEETUP_UNFINALIZED: "outline",
  WALKIN: "outline",
};

const PAGE_SIZE = 50;

export function EventsPage() {
  const { t } = useLanguage();
  const [eventType, setEventType] = useState("all");
  const [offset, setOffset] = useState(0);

  const eventTypeLabel: Record<EventType, string> = {
    CHECK_IN: t("eventCheckIn"),
    UNDO_CHECK_IN: t("eventUndo"),
    BAN: t("eventBan"),
    UNBAN: t("eventUnban"),
    MEETUP_FINALIZED: t("eventFinalized"),
    MEETUP_UNFINALIZED: t("eventUnfinalized"),
    WALKIN: t("eventWalkin"),
  };

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["events", eventType, offset],
    queryFn: async () => {
      const { data, error } = await api.GET("/events/", {
        params: {
          query: {
            limit: PAGE_SIZE,
            offset,
            ...(eventType !== "all" && { type: eventType as EventType }),
          },
        },
      });
      if (error) throw new Error("Failed to load events");
      return data;
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{t("auditLog")}</h1>

      <div className="flex items-center gap-3">
        <Select
          value={eventType}
          onValueChange={(v) => {
            setEventType(v ?? "all");
            setOffset(0);
          }}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder={t("allEvents")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allEvents")}</SelectItem>
            <SelectItem value="CHECK_IN">{t("eventCheckIn")}</SelectItem>
            <SelectItem value="UNDO_CHECK_IN">{t("eventUndo")}</SelectItem>
            <SelectItem value="BAN">{t("eventBan")}</SelectItem>
            <SelectItem value="UNBAN">{t("eventUnban")}</SelectItem>
            <SelectItem value="WALKIN">{t("eventWalkin")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isError && (
        <Alert variant="destructive">
          <AlertDescription className="flex items-center justify-between">
            {t("failedLoadAuditLog")}
            <Button variant="ghost" size="sm" onClick={() => refetch()}>
              {t("retry")}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("timestamp")}</TableHead>
              <TableHead>{t("actor")}</TableHead>
              <TableHead>{t("type")}</TableHead>
              <TableHead>{t("guestCol")}</TableHead>
              <TableHead>{t("meetupCol")}</TableHead>
              <TableHead>{t("reason")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            {!isLoading && (data?.events.length ?? 0) === 0 && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center text-muted-foreground py-8"
                >
                  {t("noEventsFound")}
                </TableCell>
              </TableRow>
            )}
            {data?.events.map((event) => {
              const label =
                eventTypeLabel[event.event_type] ?? event.event_type;
              const variant =
                EVENT_BADGE_VARIANT[event.event_type] ?? "outline";
              return (
                <TableRow key={event.id}>
                  <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                    {formatDateTime(event.timestamp)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {event.actor?.username ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={variant}>{label}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {event.guest?.displayname ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm font-mono text-xs">
                    {event.meetup_id ? event.meetup_id.slice(0, 8) + "…" : "—"}
                  </TableCell>
                  <TableCell className="text-sm max-w-xs truncate">
                    {event.reason ?? "—"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {(data?.events.length ?? 0) === PAGE_SIZE && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => setOffset(offset + PAGE_SIZE)}
          >
            {t("loadMore")}
          </Button>
        </div>
      )}
    </div>
  );
}
