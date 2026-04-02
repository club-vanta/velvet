import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ExternalLink, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/api/client";
import { formatDate, formatDateTime, ordinal } from "@/lib/format";
import type { components } from "@/api/types";

type MeetupGuest = components["schemas"]["MeetupGuestPublic"];

function UndoDialog({
  guest,
  meetupId,
  onClose,
}: {
  guest: MeetupGuest;
  meetupId: string;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await api.PATCH(
        "/meetups/{meetup_id}/guests/{mazmo_user_id}/undo-checkin",
        {
          params: { path: { meetup_id: meetupId, mazmo_user_id: guest.guest.mazmo_user_id } },
          body: { reason },
        },
      );
      if (error) throw new Error((error as { detail?: string }).detail ?? "Failed to undo check-in");
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["meetup-guests", meetupId] });
      toast.success("Undone — check-in reversed");
      onClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Undo check-in for {guest.guest.displayname}?</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <label htmlFor="undo-reason" className="text-sm font-medium">Reason (required)</label>
          <Textarea
            id="undo-reason"
            placeholder="e.g. Checked in by mistake"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
          />
          <p className="text-xs text-muted-foreground">{reason.trim().length}/500</p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            variant="destructive"
            onClick={() => mutation.mutate()}
            disabled={reason.trim().length < 5 || reason.trim().length > 500 || mutation.isPending}
          >
            {mutation.isPending ? "Undoing…" : "Undo check-in"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CheckInBannedDialog({
  guest,
  meetupId,
  onClose,
}: {
  guest: MeetupGuest;
  meetupId: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await api.POST(
        "/meetups/{meetup_id}/guests/{mazmo_user_id}/checkin",
        { params: { path: { meetup_id: meetupId, mazmo_user_id: guest.guest.mazmo_user_id } } },
      );
      if (error) throw new Error((error as { detail?: string }).detail ?? "Check-in failed");
      return data;
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ["meetup-guests", meetupId] });
      toast.success(`${data!.guest.displayname} checked in (${ordinal(data!.arrival_order)})`);
      onClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Check in banned guest?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground py-2">
          <span className="font-medium text-destructive">{guest.guest.displayname}</span> is on the banned list.
          Do you want to check them in anyway?
        </p>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            variant="destructive"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Checking in…" : "Check in anyway"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function MeetupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [undoTarget, setUndoTarget] = useState<MeetupGuest | null>(null);
  const [bannedTarget, setBannedTarget] = useState<MeetupGuest | null>(null);

  const meetupQ = useQuery({
    queryKey: ["meetup", id],
    queryFn: async () => {
      const { data, error } = await api.GET("/meetups/{meetup_id}", {
        params: { path: { meetup_id: id! } },
      });
      if (error) throw new Error("Failed to load meetup");
      return data;
    },
    enabled: !!id,
  });

  const guestsQ = useQuery({
    queryKey: ["meetup-guests", id],
    queryFn: async () => {
      const { data, error } = await api.GET("/meetups/{meetup_id}/guests", {
        params: { path: { meetup_id: id! } },
      });
      if (error) throw new Error("Failed to load guests");
      return data;
    },
    enabled: !!id,
    refetchInterval: 30_000,
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await api.POST("/meetups/{meetup_id}/sync", {
        params: { path: { meetup_id: id! } },
      });
      if (error) throw new Error((error as { detail?: string }).detail ?? "Sync failed");
      return data;
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ["meetup-guests", id] });
      toast.success(`Synced — ${data!.inserted} new guests added, ${data!.skipped} skipped`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const checkInMutation = useMutation({
    mutationFn: async (guest: MeetupGuest) => {
      const { data, error } = await api.POST(
        "/meetups/{meetup_id}/guests/{mazmo_user_id}/checkin",
        { params: { path: { meetup_id: id!, mazmo_user_id: guest.guest.mazmo_user_id } } },
      );
      if (error) throw new Error((error as { detail?: string }).detail ?? "Check-in failed");
      return data;
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ["meetup-guests", id] });
      toast.success(`${data!.guest.displayname} checked in (${ordinal(data!.arrival_order)})`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const meetup = meetupQ.data;
  const guests = guestsQ.data?.guests ?? [];
  const arrivedCount = guests.filter((g) => g.rsvp.has_arrived).length;
  const totalCount = guests.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      {meetupQ.isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
      ) : meetupQ.isError ? (
        <Alert variant="destructive">
          <AlertDescription>Failed to load meetup.</AlertDescription>
        </Alert>
      ) : (
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold">{meetup?.name}</h1>
            <p className="text-sm text-muted-foreground">{formatDate(meetup?.date ?? "")}</p>
            <a
              href={meetup?.mazmo_meetup_url}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors"
            >
              {meetup?.mazmo_meetup_url}
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <Button
            variant="outline"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            className="gap-2 shrink-0"
          >
            <RefreshCw className={`h-4 w-4 ${syncMutation.isPending ? "animate-spin" : ""}`} />
            Sync from Mazmo
          </Button>
        </div>
      )}

      {/* Progress */}
      {!guestsQ.isLoading && totalCount > 0 && (
        <div className="space-y-1">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{arrivedCount} / {totalCount} guests checked in</span>
            <span>{Math.round((arrivedCount / totalCount) * 100)}%</span>
          </div>
          <Progress value={(arrivedCount / totalCount) * 100} />
        </div>
      )}

      {/* Guest table */}
      {guestsQ.isError && (
        <Alert variant="destructive">
          <AlertDescription className="flex items-center justify-between">
            Failed to load guest list.
            <Button variant="ghost" size="sm" onClick={() => guestsQ.refetch()}>Retry</Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Order</TableHead>
              <TableHead>Guest</TableHead>
              <TableHead>RSVP</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-32" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {guestsQ.isLoading &&
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                </TableRow>
              ))}

            {!guestsQ.isLoading && guests.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No guests yet. Sync from Mazmo to load the RSVP list.
                </TableCell>
              </TableRow>
            )}

            {guests.map((mg) => (
              <TableRow key={mg.guest.mazmo_user_id} className={mg.rsvp.cancelled_rsvp ? "opacity-50" : ""}>
                <TableCell className="text-muted-foreground text-sm">
                  {mg.rsvp.arrival_order != null ? (
                    <Badge variant="secondary">{ordinal(mg.rsvp.arrival_order)}</Badge>
                  ) : "—"}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className={mg.guest.is_banned ? "text-destructive font-medium" : "font-medium"}>
                      {mg.guest.displayname}
                    </span>
                    <span className="text-muted-foreground text-sm">@{mg.guest.username}</span>
                    {mg.guest.is_banned && <Badge variant="destructive">Banned</Badge>}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {formatDateTime(mg.rsvp.rsvp_time)}
                </TableCell>
                <TableCell>
                  {mg.rsvp.has_arrived ? (
                    <div className="space-y-0.5">
                      <Badge>✓ Checked in</Badge>
                      <p className="text-xs text-muted-foreground">
                        {mg.rsvp.arrival_time ? formatDateTime(mg.rsvp.arrival_time) : ""}
                      </p>
                    </div>
                  ) : (
                    <Badge variant="secondary">Pending</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2 justify-end">
                    {mg.rsvp.has_arrived ? (
                      <Button variant="ghost" size="sm" onClick={() => setUndoTarget(mg)}>
                        Undo
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant={mg.guest.is_banned ? "destructive" : "default"}
                        onClick={() => {
                          if (mg.guest.is_banned) {
                            setBannedTarget(mg);
                          } else {
                            checkInMutation.mutate(mg);
                          }
                        }}
                        disabled={checkInMutation.isPending}
                      >
                        Check in
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {undoTarget && (
        <UndoDialog guest={undoTarget} meetupId={id!} onClose={() => setUndoTarget(null)} />
      )}
      {bannedTarget && (
        <CheckInBannedDialog guest={bannedTarget} meetupId={id!} onClose={() => setBannedTarget(null)} />
      )}
    </div>
  );
}
