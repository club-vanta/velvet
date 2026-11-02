import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";
import type { components } from "@/api/types";
import { isBlockedByPayment, type GuestRowContext } from "../lib/guestRow";

type MeetupGuest = components["schemas"]["MeetupGuestPublic"];

/**
 * The "Check in" step, or nothing once the guest is in. A step the backend
 * would refuse is disabled with a reachable reason: `blockedHintId` names a
 * visible line that already says why a payment blocks it; without one the
 * button carries its own hidden explanation.
 */
export function CheckInButton({
  guest,
  ctx,
  blockedHintId,
}: {
  guest: MeetupGuest;
  ctx: GuestRowContext;
  blockedHintId?: string;
}) {
  const { t } = useLanguage();
  const { id, is_banned } = guest.guest;
  if (guest.rsvp.has_arrived) return null;

  if (isBlockedByPayment(guest, ctx)) {
    const hintId = blockedHintId ?? `checkin-blocked-${id}`;
    return (
      <span title={t("checkInBlockedUnpaid")} className="inline-flex">
        <Button
          size="sm"
          variant="secondary"
          disabled
          aria-describedby={hintId}
          data-cy="guest-check-in"
        >
          {t("checkIn")}
        </Button>
        {!blockedHintId && (
          <span id={hintId} className="sr-only">
            {t("checkInBlockedUnpaid")}
          </span>
        )}
      </span>
    );
  }

  const finalizedHintId = `checkin-finalized-${id}`;
  return (
    <>
      <Button
        size="sm"
        variant={is_banned ? "destructive" : "default"}
        onClick={() => ctx.onCheckIn(guest)}
        disabled={ctx.checkingInId !== null || ctx.isFinalized}
        title={ctx.isFinalized ? t("checkInBlockedFinalized") : undefined}
        aria-describedby={ctx.isFinalized ? finalizedHintId : undefined}
        data-cy="guest-check-in"
      >
        {ctx.checkingInId === id ? t("checkingIn") : t("checkIn")}
      </Button>
      {ctx.isFinalized && (
        <span id={finalizedHintId} className="sr-only">
          {t("checkInBlockedFinalized")}
        </span>
      )}
    </>
  );
}
