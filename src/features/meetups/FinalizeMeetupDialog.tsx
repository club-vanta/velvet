import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/api/client";
import { extractApiError } from "@/api/errors";
import { useLanguage } from "@/lib/i18n";
import { useMeetupStats } from "@/hooks/useMeetupStats";
import { invalidateMeetupGuests, meetupKey, meetupsKey } from "@/lib/queryKeys";
import type { components } from "@/api/types";

type Meetup = components["schemas"]["MeetupPublic"];

/**
 * Confirms finalizing a meetup, or reopening a finalized one. Finalizing
 * says what gets locked and what stays open, with the attendance numbers
 * so staff can tell whether the door is really done.
 */
export function FinalizeMeetupDialog({
  orgId,
  meetup,
  onClose,
}: {
  orgId: string;
  meetup: Meetup;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const reopening = meetup.is_finalized;
  const statsQ = useMeetupStats(orgId, meetup.id);

  const mutation = useMutation({
    mutationFn: async () => {
      const path = reopening
        ? ("/organizations/{org_id}/meetups/{meetup_id}/unfinalize" as const)
        : ("/organizations/{org_id}/meetups/{meetup_id}/finalize" as const);
      const { data, error } = await api.PATCH(path, {
        params: { path: { org_id: orgId, meetup_id: meetup.id } },
      });
      if (error)
        throw new Error(extractApiError(error, t("somethingWentWrong")));
      return data;
    },
    onSuccess: (data) => {
      // Write the answer straight into the cache so the page locks or
      // unlocks at once, then refetch what depends on it.
      if (data) queryClient.setQueryData(meetupKey(orgId, meetup.id), data);
      void queryClient.invalidateQueries({
        queryKey: meetupKey(orgId, meetup.id),
      });
      void queryClient.invalidateQueries({ queryKey: meetupsKey(orgId) });
      // Finalizing turns pending RSVPs into no-shows, reopening turns them
      // back, and only finalized meetups count in the org statistics.
      invalidateMeetupGuests(queryClient, orgId, meetup.id);
      toast.success(
        t(reopening ? "meetupReopenedToast" : "meetupFinalizedToast").replace(
          "{0}",
          meetup.name,
        ),
      );
      onClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const attendance = statsQ.data?.attendance;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t(reopening ? "reopenDialogTitle" : "finalizeDialogTitle").replace(
              "{0}",
              meetup.name,
            )}
          </DialogTitle>
          <DialogDescription>
            {reopening ? t("reopenDialogBody") : t("finalizeDialogBlocks")}
          </DialogDescription>
        </DialogHeader>
        {!reopening && (
          <div className="space-y-2 text-sm">
            {attendance && (
              <p className="font-medium">
                {t("finalizeDialogSummary")
                  .replace("{0}", String(attendance.arrived_count))
                  .replace("{1}", String(attendance.total_rsvps))
                  .replace("{2}", String(attendance.not_arrived_count))}
              </p>
            )}
            <p className="text-muted-foreground">
              {t("finalizeDialogAllowed")}
            </p>
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
          >
            {mutation.isPending
              ? t(reopening ? "reopening" : "finalizing")
              : t(reopening ? "reopenMeetup" : "finalizeMeetup")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
