import { toast } from "sonner";
import { useLanguage } from "@/lib/i18n";
import { useMeetupStats } from "@/domain/meetup";
import type { components } from "@/api/types";
import { useSetMeetupFinalized } from "../api/useSetMeetupFinalized";
import { ConfirmDialog } from "./ConfirmDialog";

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
  const reopening = meetup.is_finalized;
  const statsQ = useMeetupStats(orgId, meetup.id);
  const setFinalized = useSetMeetupFinalized(orgId, meetup.id);
  const attendance = statsQ.data?.attendance;

  return (
    <ConfirmDialog
      data-cy="finalize-dialog"
      title={t(reopening ? "reopenDialogTitle" : "finalizeDialogTitle").replace(
        "{0}",
        meetup.name,
      )}
      description={
        reopening ? t("reopenDialogBody") : t("finalizeDialogBlocks")
      }
      confirmLabel={t(reopening ? "reopenMeetup" : "finalizeMeetup")}
      pendingLabel={t(reopening ? "reopening" : "finalizing")}
      isPending={setFinalized.isPending}
      onConfirm={() =>
        setFinalized.mutate(!reopening, {
          onSuccess: () => {
            toast.success(
              t(
                reopening ? "meetupReopenedToast" : "meetupFinalizedToast",
              ).replace("{0}", meetup.name),
            );
            onClose();
          },
          onError: (err) => toast.error(err.message),
        })
      }
      onClose={onClose}
    >
      {!reopening && (
        <div className="space-y-2 text-sm">
          {attendance && (
            <p className="font-medium" data-cy="finalize-summary">
              {t("finalizeDialogSummary")
                .replace("{0}", String(attendance.arrived_count))
                .replace("{1}", String(attendance.total_rsvps))
                .replace("{2}", String(attendance.not_arrived_count))}
            </p>
          )}
          <p className="text-muted-foreground">{t("finalizeDialogAllowed")}</p>
        </div>
      )}
    </ConfirmDialog>
  );
}
