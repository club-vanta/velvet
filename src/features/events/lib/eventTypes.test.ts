import { describe, expect, it } from "vitest";
import { translations, type TranslationKey } from "@/lib/i18n";
import { makeEventLog } from "@/tests/factories";
import { eventBadgeVariant, eventReason, eventTypeLabel } from "./eventTypes";

const t = (key: TranslationKey) => translations.en[key];
const tEs = (key: TranslationKey) => translations.es[key];

describe("eventTypeLabel", () => {
  it("names a known type in the UI language", () => {
    expect(eventTypeLabel("GUEST_TYPE_CHANGED", t)).toBe("Guest type changed");
    expect(eventTypeLabel("BAN", tEs)).toBe("Vanteo");
  });

  it("shows a type the app does not know yet as the backend wrote it", () => {
    expect(eventTypeLabel("SOMETHING_NEW", t)).toBe("SOMETHING_NEW");
  });

  it("does not treat inherited object keys as event types", () => {
    expect(eventTypeLabel("toString", t)).toBe("toString");
  });
});

describe("eventBadgeVariant", () => {
  it("marks bans as destructive and unknown types as outline", () => {
    expect(eventBadgeVariant("BAN")).toBe("destructive");
    expect(eventBadgeVariant("CHECK_IN")).toBe("default");
    expect(eventBadgeVariant("SOMETHING_NEW")).toBe("outline");
  });
});

describe("eventReason", () => {
  it("makes a guest type change readable in the UI language", () => {
    const event = makeEventLog({
      event_type: "GUEST_TYPE_CHANGED",
      reason: "Changed guest_type from NORMAL to VENDOR",
    });
    expect(eventReason(event, t)).toBe("Regular → Vendor");
    expect(eventReason(event, tEs)).toBe(
      `${translations.es.guestTypeNormal} → ${translations.es.guestTypeVendor}`,
    );
  });

  it("keeps an unrecognized guest type change reason as is", () => {
    expect(
      eventReason(
        makeEventLog({
          event_type: "GUEST_TYPE_CHANGED",
          reason: "Something else",
        }),
        t,
      ),
    ).toBe("Something else");
    expect(
      eventReason(
        makeEventLog({
          event_type: "GUEST_TYPE_CHANGED",
          reason: "Changed guest_type from NORMAL to ROYALTY",
        }),
        t,
      ),
    ).toBe("Changed guest_type from NORMAL to ROYALTY");
  });

  it("shows other reasons as written, and null when there is none", () => {
    expect(
      eventReason(makeEventLog({ event_type: "BAN", reason: "Fight" }), t),
    ).toBe("Fight");
    expect(eventReason(makeEventLog({ reason: null }), t)).toBeNull();
  });
});
