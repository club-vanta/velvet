import { toast } from "sonner";
import { useLanguage } from "@/lib/i18n";
import type { components } from "@/api/types";
import { useMarkPaid } from "../api/useMarkPaid";
import { ConfirmDialog } from "./ConfirmDialog";

type MeetupGuest = components["schemas"]["MeetupGuestPublic"];

/** Confirms the entrance fee was received, which lets the guest check in. */
export function MarkPaidDialog({
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
  const markPaid = useMarkPaid(orgId, meetupId);
  const name = guest.guest.displayname;

  return (
    <ConfirmDialog
      data-cy="mark-paid-dialog"
      title={`${t("markPaidDialogTitle")} ${name}?`}
      confirmLabel={t("markPaid")}
      pendingLabel={t("markingPaid")}
      isPending={markPaid.isPending}
      onConfirm={() =>
        markPaid.mutate(guest.guest.id, {
          onSuccess: () => {
            toast.success(`${name} — ${t("paymentRecorded")}`);
            onClose();
          },
          onError: (err) => toast.error(err.message),
        })
      }
      onClose={onClose}
    >
      <p className="text-sm text-muted-foreground py-2">
        {t("markPaidDialogBody")}
      </p>
    </ConfirmDialog>
  );
}
