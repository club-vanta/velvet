import { describe, expect, it } from "vitest";
import {
  makeCheckInResponse,
  makeGuest,
  makeMeetupGuest,
} from "@/tests/factories";
import {
  canMarkPaid,
  checkedInMessage,
  exemptReason,
  isBlockedByPayment,
  owesPayment,
  unpaidLineId,
  type GuestListMeetup,
} from "./guestRow";

const PAID: GuestListMeetup = {
  requiresPayment: true,
  paymentStateKnown: true,
  isFinalized: false,
  isOrgAdmin: true,
};
const FREE = { ...PAID, requiresPayment: false };
const owes = makeMeetupGuest();
const paid = makeMeetupGuest({ rsvp: { has_paid: true } });
const staff = makeMeetupGuest({ rsvp: { guest_type: "STAFF" } });

describe("isBlockedByPayment", () => {
  it("blocks a regular guest who owes the fee on a paid meetup", () => {
    expect(isBlockedByPayment(owes, PAID)).toBe(true);
    expect(isBlockedByPayment(paid, PAID)).toBe(false);
    expect(isBlockedByPayment(staff, PAID)).toBe(false);
    expect(isBlockedByPayment(owes, FREE)).toBe(false);
  });

  it("blocks everyone while the payment rule is unknown", () => {
    expect(
      isBlockedByPayment(paid, { ...FREE, paymentStateKnown: false }),
    ).toBe(true);
  });
});

describe("owesPayment", () => {
  it("is only true once the meetup is known to be paid", () => {
    expect(owesPayment(owes, PAID)).toBe(true);
    expect(owesPayment(owes, { ...PAID, paymentStateKnown: false })).toBe(
      false,
    );
    expect(owesPayment(staff, PAID)).toBe(false);
    expect(owesPayment(paid, PAID)).toBe(false);
  });
});

describe("canMarkPaid", () => {
  it("is for admins, on open paid meetups, with a fee left to collect", () => {
    expect(canMarkPaid(owes, PAID)).toBe(true);
    expect(canMarkPaid(owes, { ...PAID, isOrgAdmin: false })).toBe(false);
    expect(canMarkPaid(owes, { ...PAID, isFinalized: true })).toBe(false);
    expect(canMarkPaid(owes, FREE)).toBe(false);
    expect(canMarkPaid(paid, PAID)).toBe(false);
    expect(canMarkPaid(staff, PAID)).toBe(false);
  });
});

describe("exemptReason", () => {
  it("names each exempt type, and falls back for an unknown one", () => {
    expect(exemptReason("INVITED")).toBe("paymentExemptInvited");
    expect(exemptReason("VENDOR")).toBe("paymentExemptVendor");
    expect(exemptReason("STAFF")).toBe("paymentExemptStaff");
    expect(exemptReason("PRESS")).toBe("paymentExempt");
  });
});

describe("unpaidLineId and checkedInMessage", () => {
  it("builds the line id and the toast", () => {
    expect(unpaidLineId("g-1")).toBe("unpaid-g-1");
    const t = (key: string) =>
      key === "checkedInToast" ? "{0} in ({1})" : key;
    expect(
      checkedInMessage(
        t,
        makeCheckInResponse({
          guest: makeGuest({ displayname: "Luna" }),
          arrival_order: 7,
        }),
      ),
    ).toBe("Luna in (#7)");
  });
});
