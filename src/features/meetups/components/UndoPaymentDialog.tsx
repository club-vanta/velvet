import { toast } from "sonner";
import { ReasonDialog } from "@/components/ReasonDialog";
import { useLanguage } from "@/lib/i18n";
import type { components } from "@/api/types";
import { useUndoPayment } from "../api/useUndoPayment";

type MeetupGuest = components["schemas"]["MeetupGuestPublic"];

/** Asks why before reversing a recorded payment. */
export function UndoPaymentDialog({
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
  const undo = useUndoPayment(orgId, meetupId);

  return (
    <ReasonDialog
      data-cy="undo-payment-dialog"
      title={`${t("undoPaymentDialogTitle")} ${guest.guest.displayname}?`}
      placeholder={t("undoPaymentPlaceholder")}
      confirmLabel={t("undoPayment")}
      pendingLabel={t("undoing")}
      isPending={undo.isPending}
      onConfirm={(reason) =>
        undo.mutate(
          { guestId: guest.guest.id, reason },
          {
            onSuccess: () => {
              toast.success(t("paymentUndone"));
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
