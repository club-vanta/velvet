import { toast } from "sonner";
import { ReasonDialog } from "@/components/ReasonDialog";
import { useLanguage } from "@/lib/i18n";
import type { components } from "@/api/types";
import { useUndoCheckIn } from "../api/useUndoCheckIn";

type MeetupGuest = components["schemas"]["MeetupGuestPublic"];

/** Asks why before reversing a guest's check-in. */
export function UndoCheckInDialog({
  orgId,
  meetupId,
  guest,
  onClose,
}: {
  orgId: string;
  meetupId: string;
  guest: MeetupGuest;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const undo = useUndoCheckIn(orgId, meetupId);

  return (
    <ReasonDialog
      data-cy="undo-check-in-dialog"
      title={`${t("undoDialogTitle")} ${guest.guest.displayname}?`}
      placeholder={t("undoReasonPlaceholder")}
      confirmLabel={t("undoCheckIn")}
      pendingLabel={t("undoing")}
      isPending={undo.isPending}
      onConfirm={(reason) =>
        undo.mutate(
          { guestId: guest.guest.id, reason },
          {
            onSuccess: () => {
              toast.success(t("undoDone"));
              onClose();
            },
            onError: (err) => toast.error(err.message),
          },
        )
      }
      onClose={onClose}
    />
  );
}
