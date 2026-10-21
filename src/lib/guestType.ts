import type { components } from "@/api/types";
import type { TranslationKey } from "@/lib/i18n";

export type GuestType = components["schemas"]["GuestType"];

export const GUEST_TYPES: readonly GuestType[] = [
  "NORMAL",
  "INVITED",
  "VENDOR",
  "STAFF",
];

export const GUEST_TYPE_LABEL: Record<GuestType, TranslationKey> = {
  NORMAL: "guestTypeNormal",
  INVITED: "guestTypeInvited",
  VENDOR: "guestTypeVendor",
  STAFF: "guestTypeStaff",
};

export const GUEST_TYPE_DESCRIPTION: Record<GuestType, TranslationKey> = {
  NORMAL: "guestTypeNormalDescription",
  INVITED: "guestTypeInvitedDescription",
  VENDOR: "guestTypeVendorDescription",
  STAFF: "guestTypeStaffDescription",
};

// RsvpPublic.guest_type is typed as a plain string by the API (the backend
// stores it as VARCHAR), so narrow it before indexing the label maps.
export function isGuestType(value: string): value is GuestType {
  return (GUEST_TYPES as readonly string[]).includes(value);
}

/**
 * Mirrors the backend check-in gate: only NORMAL guests have to pay.
 * INVITED, VENDOR, and STAFF skip the payment check regardless of has_paid.
 */
export function isPaymentExempt(guestType: string): boolean {
  return guestType !== "NORMAL";
}
