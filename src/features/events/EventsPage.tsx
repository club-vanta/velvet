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
import type { components } from "@/api/types";

type EventLog = components["schemas"]["EventLogPublic"];
type EventType = EventLog["event_type"];

const EVENT_BADGE: Record<
  EventType,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
  }
> = {
  CHECK_IN: { label: "Check-in", variant: "default" },
  UNDO_CHECK_IN: { label: "Undo", variant: "secondary" },
  BAN: { label: "Ban", variant: "destructive" },
  UNBAN: { label: "Unban", variant: "outline" },
  MEETUP_FINALIZED: { label: "Finalized", variant: "secondary" },
  MEETUP_UNFINALIZED: { label: "Unfinalized", variant: "outline" },
};

const PAGE_SIZE = 50;

export function EventsPage() {
  const [eventType, setEventType] = useState("all");
  const [offset, setOffset] = useState(0);

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
      <h1 className="text-2xl font-semibold">Audit Log</h1>

      <div className="flex items-center gap-3">
        <Select
          value={eventType}
          onValueChange={(v) => {
            setEventType(v ?? "all");
            setOffset(0);
          }}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All events" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All events</SelectItem>
            <SelectItem value="CHECK_IN">Check-in</SelectItem>
            <SelectItem value="UNDO_CHECK_IN">Undo</SelectItem>
            <SelectItem value="BAN">Ban</SelectItem>
            <SelectItem value="UNBAN">Unban</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isError && (
        <Alert variant="destructive">
          <AlertDescription className="flex items-center justify-between">
            Failed to load audit log.
            <Button variant="ghost" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Guest ID</TableHead>
              <TableHead>Meetup</TableHead>
              <TableHead>Reason</TableHead>
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
                  No events found.
                </TableCell>
              </TableRow>
            )}
            {data?.events.map((event) => {
              const badge = EVENT_BADGE[event.event_type] ?? {
                label: event.event_type,
                variant: "outline" as const,
              };
              return (
                <TableRow key={event.id}>
                  <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                    {formatDateTime(event.timestamp)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {event.actor?.username ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={badge.variant}>{badge.label}</Badge>
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
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}
