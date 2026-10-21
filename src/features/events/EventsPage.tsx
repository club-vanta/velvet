import { useState } from "react";
import { Link } from "react-router-dom";
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
import { useOrg } from "@/lib/org";
import { formatDateTime } from "@/lib/format";
import { useLanguage } from "@/lib/i18n";
import { GUEST_TYPE_LABEL, isGuestType } from "@/lib/guestType";
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
  GUEST_CREATED: "outline",
  GUEST_MAZMO_LINKED: "outline",
  GUEST_MAZMO_UNLINKED: "outline",
  PAYMENT_RECORDED: "default",
  PAYMENT_REVOKED: "secondary",
  PAYMENT_REQUIREMENT_ENABLED: "outline",
  PAYMENT_REQUIREMENT_DISABLED: "outline",
  GUEST_TYPE_CHANGED: "outline",
  GUEST_DISPLAYNAME_CHANGED: "outline",
};

const GUEST_TYPE_CHANGE_REASON = /^Changed guest_type from (\w+) to (\w+)$/;

const PAGE_SIZE = 50;

export function EventsPage() {
  const { t } = useLanguage();
  const { activeOrg } = useOrg();
  const orgId = activeOrg?.org_id ?? "";
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
    GUEST_CREATED: t("eventGuestCreated"),
    GUEST_MAZMO_LINKED: t("eventGuestMazmoLinked"),
    GUEST_MAZMO_UNLINKED: t("eventGuestMazmoUnlinked"),
    PAYMENT_RECORDED: t("eventPaymentRecorded"),
    PAYMENT_REVOKED: t("eventPaymentRevoked"),
    PAYMENT_REQUIREMENT_ENABLED: t("eventPaymentEnabled"),
    PAYMENT_REQUIREMENT_DISABLED: t("eventPaymentDisabled"),
    GUEST_TYPE_CHANGED: t("eventGuestTypeChanged"),
    GUEST_DISPLAYNAME_CHANGED: t("eventGuestDisplaynameChanged"),
  };

  // The backend writes this reason in English with raw enum values; show it
  // as "Normal -> Vendor" in the active language when it matches.
  function formatReason(event: EventLog): string | null {
    if (event.event_type !== "GUEST_TYPE_CHANGED" || !event.reason)
      return event.reason ?? null;
    const match = GUEST_TYPE_CHANGE_REASON.exec(event.reason);
    const from = match?.[1];
    const to = match?.[2];
    if (!from || !to || !isGuestType(from) || !isGuestType(to))
      return event.reason;
    return `${t(GUEST_TYPE_LABEL[from])} → ${t(GUEST_TYPE_LABEL[to])}`;
  }

  const { data: meetupsData } = useQuery({
    queryKey: ["meetups", orgId],
    queryFn: async () => {
      const { data } = await api.GET("/organizations/{org_id}/meetups/", {
        params: { path: { org_id: orgId } },
      });
      return data;
    },
    enabled: !!orgId,
  });

  const meetupName: Record<string, string> = {};
  for (const m of meetupsData?.meetups ?? []) {
    meetupName[m.id] = m.name;
  }

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["events", orgId, eventType, offset],
    queryFn: async () => {
      const { data, error } = await api.GET("/organizations/{org_id}/events/", {
        params: {
          path: { org_id: orgId },
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
    enabled: !!orgId,
  });

  if (!activeOrg) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">{t("noOrganization")}</p>
      </div>
    );
  }

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
          <SelectTrigger className="w-48" aria-label={t("type")}>
            <SelectValue placeholder={t("allEvents")}>
              {eventType === "all"
                ? t("allEvents")
                : (eventTypeLabel[eventType as EventType] ?? eventType)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allEvents")}</SelectItem>
            <SelectItem value="CHECK_IN">{t("eventCheckIn")}</SelectItem>
            <SelectItem value="UNDO_CHECK_IN">{t("eventUndo")}</SelectItem>
            <SelectItem value="BAN">{t("eventBan")}</SelectItem>
            <SelectItem value="UNBAN">{t("eventUnban")}</SelectItem>
            <SelectItem value="WALKIN">{t("eventWalkin")}</SelectItem>
            <SelectItem value="PAYMENT_RECORDED">
              {t("eventPaymentRecorded")}
            </SelectItem>
            <SelectItem value="PAYMENT_REVOKED">
              {t("eventPaymentRevoked")}
            </SelectItem>
            <SelectItem value="GUEST_TYPE_CHANGED">
              {t("eventGuestTypeChanged")}
            </SelectItem>
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
                  <TableCell>
                    <Badge variant={variant}>{label}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                    {formatDateTime(event.timestamp)}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {event.guest ? (
                      <Link
                        to={`/guests/${event.guest.id}`}
                        className="hover:text-foreground transition-colors"
                      >
                        {event.guest.displayname}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {event.actor?.username ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {event.meetup_id ? (
                      <Link
                        to={`/meetups/${event.meetup_id}`}
                        className="hover:text-foreground transition-colors"
                      >
                        {meetupName[event.meetup_id] ??
                          event.meetup_id.slice(0, 8) + "…"}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-sm max-w-xs truncate">
                    {formatReason(event) ?? "—"}
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
