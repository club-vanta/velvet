import { Banknote, Check } from "lucide-react";
import { isPaymentExempt } from "@/domain/guest";
import { formatDateTime, ordinal } from "@/lib/format";
import { useLanguage } from "@/lib/i18n";
import type { components } from "@/api/types";
import {
  exemptReason,
  owesPayment,
  unpaidLineId,
  type GuestRowContext,
} from "../lib/guestRow";
import { GuestStatusLine } from "./GuestStatusLine";
import { InlineUndo } from "./InlineUndo";

type MeetupGuest = components["schemas"]["MeetupGuestPublic"];

// On a tinted line the undo takes the line's color (see InlineUndo).
const ON_TINT = "text-current hover:text-current";

/**
 * One tinted line per state the card shows: in, then paid, exempt or owing.
 * A guest who is not in gets no check-in line, since the "Check in" step
 * already says so.
 */
export function GuestCardStatuses({
  guest,
  ctx,
}: {
  guest: MeetupGuest;
  ctx: GuestRowContext;
}) {
  const { t } = useLanguage();
  const { has_arrived, arrival_time, arrival_order, has_paid, paid_at } =
    guest.rsvp;

  function paymentLine() {
    if (!ctx.requiresPayment) return null;
    if (has_paid)
      return (
        <GuestStatusLine
          tone="paid"
          icon={Banknote}
          data-cy="guest-line-payment"
          action={
            ctx.isOrgAdmin && (
              <InlineUndo
                onClick={() => ctx.onUndoPayment(guest)}
                className={ON_TINT}
                data-cy="guest-undo-payment"
              >
                {t("undoPayment")}
              </InlineUndo>
            )
          }
        >
          <span className="font-medium">{t("statusPaid")}</span>
          {paid_at && (
            <>
              {" "}
              <span className="whitespace-nowrap">
                {formatDateTime(paid_at)}
              </span>
            </>
          )}
        </GuestStatusLine>
      );
    if (isPaymentExempt(guest.rsvp.guest_type))
      return (
        <GuestStatusLine tone="neutral" data-cy="guest-line-payment">
          {t(exemptReason(guest.rsvp.guest_type))}
        </GuestStatusLine>
      );
    if (owesPayment(guest, ctx))
      return (
        <GuestStatusLine
          tone="missing"
          icon={Banknote}
          id={unpaidLineId(guest.guest.id)}
          data-cy="guest-line-payment"
        >
          <span className="font-medium">{t("statusUnpaid")}</span>
        </GuestStatusLine>
      );
    return null;
  }

  return (
    <>
      {has_arrived && (
        <GuestStatusLine
          tone="done"
          icon={Check}
          data-cy="guest-line-checked-in"
          action={
            <InlineUndo
              onClick={() => ctx.onUndoCheckIn(guest)}
              className={ON_TINT}
              data-cy="guest-undo-check-in"
            >
              {t("undo")}
            </InlineUndo>
          }
        >
          {arrival_order != null && (
            <span
              className="mr-2 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold"
              data-cy="guest-arrival-order"
            >
              {ordinal(arrival_order)}
            </span>
          )}
          <span className="font-medium">{t("statusCheckedIn")}</span>
          {arrival_time && (
            <>
              {" "}
              <span className="whitespace-nowrap">
                {formatDateTime(arrival_time)}
              </span>
            </>
          )}
        </GuestStatusLine>
      )}
      {paymentLine()}
    </>
  );
}
