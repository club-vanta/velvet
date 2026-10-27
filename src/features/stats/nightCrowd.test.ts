import { describe, expect, it } from "vitest";
import type { components } from "@/api/types";
import { translations, type TranslationKey } from "@/lib/i18n";
import { formatGap, groupByVisits, isRegular, visitBand } from "./nightCrowd";

type NightGuest = components["schemas"]["NightGuestPublic"];

const es = (key: TranslationKey) => translations.es[key];

function guest(visit: number, overrides: Partial<NightGuest> = {}): NightGuest {
  return {
    guest_id: `g${visit}-${overrides.displayname ?? ""}`,
    displayname: `Guest ${visit}`,
    avatar_url: null,
    visit,
    days_since_previous: visit === 1 ? null : 28,
    came_back: false,
    ...overrides,
  };
}

describe("visitBand", () => {
  it.each([
    [1, "first"],
    [2, "second"],
    [3, "few"],
    [5, "few"],
    [6, "regular"],
    [40, "regular"],
  ] as const)("puts visit %i in %s", (visit, band) => {
    expect(visitBand(visit)).toBe(band);
  });

  it("calls 6 visits or more a regular", () => {
    expect([5, 6].map(isRegular)).toEqual([false, true]);
  });
});

describe("groupByVisits", () => {
  it("keeps every band in order, empty ones too, and the guests' order", () => {
    const a = guest(9, { displayname: "a" });
    const b = guest(7, { displayname: "b" });
    const c = guest(1, { displayname: "c" });
    expect(groupByVisits([a, b, c])).toEqual([
      { band: "first", guests: [c] },
      { band: "second", guests: [] },
      { band: "few", guests: [] },
      { band: "regular", guests: [a, b] },
    ]);
  });
});

describe("formatGap", () => {
  it.each([
    [0, "el mismo día"],
    [1, "1 día"],
    [59, "59 días"],
    [60, "2 meses"],
    [100, "3 meses"],
    [364, "12 meses"],
    [365, "1 año"],
    [800, "2 años"],
  ])("writes %i days as %s", (days, text) => {
    expect(formatGap(days, es)).toBe(text);
  });
});
