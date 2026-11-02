import {
  isGuestType,
  isPaymentExempt,
  PAYMENT_EXEMPT_REASON,
} from "@/domain/guest";
import { ordinal } from "@/lib/format";
import type { TranslationKey } from "@/lib/i18n";
import type { components } from "@/api/types";

type MeetupGuest = components["schemas"]["MeetupGuestPublic"];
type CheckInResponse = components["schemas"]["CheckInResponse"];

/** What a guest row needs to know about the meetup it belongs to. */
export type GuestListMeetup = {
  requiresPayment: boolean;
  /** False until the meetup has loaded, so its payment rule is unknown. */
  paymentStateKnown: boolean;
  isFinalized: boolean;
  isOrgAdmin: boolean;
};

/** Everything a guest row reads and the steps it can start. */
export type GuestRowContext = GuestListMeetup & {
  orgId: string;
  meetupId: string;
  /** The guest whose check-in is in flight; every "Check in" waits for it. */
  checkingInId: string | null;
  onCheckIn: (guest: MeetupGuest) => void;
  onUndoCheckIn: (guest: MeetupGuest) => void;
  onMarkPaid: (guest: MeetupGuest) => void;
  onUndoPayment: (guest: MeetupGuest) => void;
  onViewProfile: (guest: MeetupGuest) => void;
};

/**
 * Why the guest pays no fee, falling back to a bare "Exempt" for a type the
 * API sends that this build does not know yet.
 */
export function exemptReason(guestType: string): TranslationKey {
  return isGuestType(guestType) && guestType !== "NORMAL"
    ? PAYMENT_EXEMPT_REASON[guestType]
    : "paymentExempt";
}

/**
 * Whether "Check in" waits for a payment. While the meetup loads its payment
 * rule is unknown, so the step waits too rather than guessing "free".
 */
export function isBlockedByPayment(
  guest: MeetupGuest,
  meetup: GuestListMeetup,
): boolean {
  const { has_paid, guest_type } = guest.rsvp;
  return (
    !meetup.paymentStateKnown ||
    (meetup.requiresPayment && !isPaymentExempt(guest_type) && !has_paid)
  );
}

/** Whether the guest still owes the fee, as far as the loaded meetup says. */
export function owesPayment(
  guest: MeetupGuest,
  meetup: GuestListMeetup,
): boolean {
  const { has_paid, guest_type } = guest.rsvp;
  return (
    meetup.requiresPayment &&
    meetup.paymentStateKnown &&
    !isPaymentExempt(guest_type) &&
    !has_paid
  );
}

/**
 * Whether "Mark paid" is offered: only admins collect fees, and a finalized
 * meetup refuses new payments.
 */
export function canMarkPaid(
  guest: MeetupGuest,
  meetup: GuestListMeetup,
): boolean {
  return (
    meetup.requiresPayment &&
    meetup.isOrgAdmin &&
    !meetup.isFinalized &&
    !isPaymentExempt(guest.rsvp.guest_type) &&
    !guest.rsvp.has_paid
  );
}

/** The id of a card's "fee not paid" line, which explains a blocked check-in. */
export function unpaidLineId(guestId: string): string {
  return `unpaid-${guestId}`;
}

/** "Luna checked in (#3)", in the UI language. */
export function checkedInMessage(
  t: (key: TranslationKey) => string,
  checkIn: CheckInResponse,
): string {
  return t("checkedInToast")
    .replace("{0}", checkIn.guest.displayname)
    .replace("{1}", ordinal(checkIn.arrival_order));
}
