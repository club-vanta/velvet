import { describe, it, expect } from "vitest";
import { GUEST_TYPES, isGuestType, isPaymentExempt } from "./guestType";

describe("isPaymentExempt", () => {
  it("only makes NORMAL guests pay, mirroring the backend check-in gate", () => {
    expect(isPaymentExempt("NORMAL")).toBe(false);
    expect(isPaymentExempt("INVITED")).toBe(true);
    expect(isPaymentExempt("VENDOR")).toBe(true);
    expect(isPaymentExempt("STAFF")).toBe(true);
  });
});

describe("isGuestType", () => {
  it("accepts the four backend values and nothing else", () => {
    for (const type of GUEST_TYPES) expect(isGuestType(type)).toBe(true);
    expect(isGuestType("normal")).toBe(false);
    expect(isGuestType("VIP")).toBe(false);
  });
});
