import { formatDateTime } from "@/lib/format";
import { useLanguage } from "@/lib/i18n";
import type { components } from "@/api/types";
import {
  canMarkPaid,
  owesPayment,
  unpaidLineId,
  type GuestRowContext,
} from "../lib/guestRow";
import { CheckInButton } from "./CheckInButton";
import { GuestCard } from "./GuestCard";
import { GuestCardStatuses } from "./GuestCardStatuses";
import { GuestIdentity } from "./GuestIdentity";
import { GuestRowActions } from "./GuestRowActions";
import { MarkPaidButton } from "./MarkPaidButton";

type MeetupGuest = components["schemas"]["MeetupGuestPublic"];

/** One guest of the list on phones and narrow screens. */
export function MeetupGuestCard({
  guest,
  ctx,
}: {
  guest: MeetupGuest;
  ctx: GuestRowContext;
}) {
  const { t } = useLanguage();
  // Once finalized the header says the door is closed, so the cards drop
  // their steps band instead of showing dead buttons.
  const hasCheckIn = !ctx.isFinalized && !guest.rsvp.has_arrived;
  const hasStep = canMarkPaid(guest, ctx) || hasCheckIn;

  return (
    <GuestCard
      data-cy={`guest-row-${guest.guest.id}`}
      identity={
        <GuestIdentity
          guest={guest}
          onViewProfile={() => ctx.onViewProfile(guest)}
          meta={
            <p className="text-xs text-muted-foreground">
              <span className="font-medium">{t("rsvp")}</span>{" "}
              <span data-cy="guest-rsvp-time">
                {formatDateTime(guest.rsvp.rsvp_time)}
              </span>
            </p>
          }
        />
      }
      menu={<GuestRowActions guest={guest} ctx={ctx} />}
      statuses={<GuestCardStatuses guest={guest} ctx={ctx} />}
      actions={
        hasStep ? (
          <>
            <MarkPaidButton guest={guest} ctx={ctx} />
            {hasCheckIn && (
              <CheckInButton
                guest={guest}
                ctx={ctx}
                blockedHintId={
                  owesPayment(guest, ctx)
                    ? unpaidLineId(guest.guest.id)
                    : undefined
                }
              />
            )}
          </>
        ) : null
      }
      dimmed={guest.rsvp.cancelled_rsvp}
    />
  );
}
