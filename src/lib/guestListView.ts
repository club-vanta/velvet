import { isPaymentExempt, type GuestType } from "@/lib/guestType";
import { compareNames, type SortDir } from "@/lib/sortNames";

export type { SortDir };
import type { components } from "@/api/types";

type MeetupGuest = components["schemas"]["MeetupGuestPublic"];

export type GuestSortKey = "name" | "rsvp" | "arrival" | "status";
export type GuestSort = { key: GuestSortKey; dir: SortDir };

export const GUEST_SORT_KEYS: readonly GuestSortKey[] = [
  "name",
  "rsvp",
  "arrival",
  "status",
];

// Alphabetical, the order staff used to get from the old table.
export const DEFAULT_GUEST_SORT: GuestSort = { key: "name", dir: "asc" };

export type GuestFilters = {
  status: "all" | "pending" | "arrived";
  rsvp: "all" | "active" | "cancelled";
  type: "all" | GuestType;
  payment: "all" | "paid" | "unpaid" | "exempt";
  walkinOnly: boolean;
  bannedOnly: boolean;
};

export const DEFAULT_GUEST_FILTERS: GuestFilters = {
  status: "all",
  rsvp: "all",
  type: "all",
  payment: "all",
  walkinOnly: false,
  bannedOnly: false,
};

/**
 * The filters that actually narrow the list. Payment is ignored on a free
 * meetup, where its menu is hidden and every guest would count as unpaid.
 */
export function activeGuestFilters(
  filters: GuestFilters,
  requiresPayment: boolean,
): (keyof GuestFilters)[] {
  return (Object.keys(filters) as (keyof GuestFilters)[]).filter(
    (key) =>
      filters[key] !== DEFAULT_GUEST_FILTERS[key] &&
      (key !== "payment" || requiresPayment),
  );
}

function matches(
  mg: MeetupGuest,
  f: GuestFilters,
  requiresPayment: boolean,
): boolean {
  const { rsvp, guest } = mg;
  if (f.status === "pending" && rsvp.has_arrived) return false;
  if (f.status === "arrived" && !rsvp.has_arrived) return false;
  if (f.rsvp === "active" && rsvp.cancelled_rsvp) return false;
  if (f.rsvp === "cancelled" && !rsvp.cancelled_rsvp) return false;
  if (f.type !== "all" && rsvp.guest_type !== f.type) return false;
  if (requiresPayment && f.payment !== "all") {
    const exempt = isPaymentExempt(rsvp.guest_type);
    if (f.payment === "paid" && !rsvp.has_paid) return false;
    if (f.payment === "unpaid" && (exempt || rsvp.has_paid)) return false;
    if (f.payment === "exempt" && !exempt) return false;
  }
  if (f.walkinOnly && !rsvp.is_walkin) return false;
  if (f.bannedOnly && !guest.is_banned) return false;
  return true;
}

// The last resort, so equal rows never swap places between refetches.
const byRsvpTime = (a: MeetupGuest, b: MeetupGuest) =>
  a.rsvp.rsvp_time.localeCompare(b.rsvp.rsvp_time) ||
  a.guest.id.localeCompare(b.guest.id);

function compare(a: MeetupGuest, b: MeetupGuest, key: GuestSortKey): number {
  switch (key) {
    case "name":
      return compareNames(a.guest.displayname, b.guest.displayname);
    case "rsvp":
      return a.rsvp.rsvp_time.localeCompare(b.rsvp.rsvp_time);
    case "arrival":
      return (a.rsvp.arrival_order ?? 0) - (b.rsvp.arrival_order ?? 0);
    case "status":
      return Number(a.rsvp.has_arrived) - Number(b.rsvp.has_arrived);
  }
}

/** Filters, then sorts, without touching the input array. */
export function viewGuestList(
  guests: readonly MeetupGuest[],
  filters: GuestFilters,
  sort: GuestSort,
  requiresPayment: boolean,
): MeetupGuest[] {
  const sign = sort.dir === "asc" ? 1 : -1;
  return guests
    .filter((mg) => matches(mg, filters, requiresPayment))
    .sort((a, b) => {
      // Guests who haven't arrived have no order yet: keep them at the
      // bottom in both directions, alphabetically.
      if (sort.key === "arrival") {
        const aNone = a.rsvp.arrival_order == null;
        const bNone = b.rsvp.arrival_order == null;
        if (aNone !== bNone) return aNone ? 1 : -1;
        if (aNone && bNone) return compare(a, b, "name") || byRsvpTime(a, b);
      }
      return (
        sign * compare(a, b, sort.key) ||
        (sort.key !== "name" ? compare(a, b, "name") : 0) ||
        byRsvpTime(a, b)
      );
    });
}
