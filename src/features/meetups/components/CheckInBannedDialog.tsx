import { useId } from "react";
import { toast } from "sonner";
import { useLanguage } from "@/lib/i18n";
import type { components } from "@/api/types";
import { useCheckInGuest } from "../api/useCheckInGuest";
import { checkedInMessage } from "../lib/guestRow";
import { BanReason } from "./BanReason";
import { ConfirmDialog } from "./ConfirmDialog";

type MeetupGuest = components["schemas"]["MeetupGuestPublic"];

/** Warns that the guest is vanted, says why, and lets staff check them in anyway. */
export function CheckInBannedDialog({
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
  const checkIn = useCheckInGuest(orgId, meetupId);
  const reasonHeadingId = useId();

  return (
    <ConfirmDialog
      data-cy="check-in-banned-dialog"
      title={t("bannedGuestDialogTitle")}
      confirmLabel={t("checkInAnyway")}
      pendingLabel={t("checkingIn")}
      destructive
      isPending={checkIn.isPending}
      onConfirm={() =>
        checkIn.mutate(guest.guest.id, {
          onSuccess: (data) => {
            toast.success(checkedInMessage(t, data));
            onClose();
          },
          onError: (err) => toast.error(err.message),
        })
      }
      onClose={onClose}
    >
      <p className="text-sm text-muted-foreground py-2">
        <span className="font-medium text-destructive">
          {guest.guest.displayname}
        </span>{" "}
        {t("bannedGuestDialogBody")}
      </p>
      {/* The reason is what staff weigh before letting the guest in, so it
          gets its own section. Loading or failing never blocks the choice. */}
      <section
        aria-labelledby={reasonHeadingId}
        className="space-y-1 border-t pt-3 text-sm"
      >
        <h3 id={reasonHeadingId} className="font-medium">
          {t("banReasonLabel")}
        </h3>
        {/* Polite, so the reason is read out when it arrives after the
            dialog has opened. */}
        <div aria-live="polite">
          <BanReason orgId={orgId} guestId={guest.guest.id} />
        </div>
      </section>
    </ConfirmDialog>
  );
}
