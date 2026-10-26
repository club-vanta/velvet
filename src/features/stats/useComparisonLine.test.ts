import { describe, expect, it } from "vitest";
import { translations, type TranslationKey } from "@/lib/i18n";
import { allEventsLine } from "./useComparisonLine";

const es = (key: TranslationKey) => translations.es[key];
const en = (key: TranslationKey) => translations.en[key];

describe("allEventsLine", () => {
  it.each([
    ["30d", "En todos los eventos de los últimos 30 días: 21:58"],
    ["3m", "En todos los eventos de los últimos 3 meses: 21:58"],
    ["12m", "En todos los eventos de los últimos 12 meses: 21:58"],
    ["ytd", "En todos los eventos de este año: 21:58"],
    ["all", "En todos los eventos registrados: 21:58"],
  ] as const)("names the %s period", (preset, line) => {
    expect(allEventsLine({ preset }, "21:58", es)).toBe(line);
  });

  it("names both days of a custom period", () => {
    expect(
      allEventsLine(
        { preset: "custom", custom: { from: "2026-03-01", to: "2026-04-15" } },
        "32%",
        es,
      ),
    ).toBe("En todos los eventos del 01/03/2026 al 15/04/2026: 32%");
  });

  it("says it in English too", () => {
    expect(allEventsLine({ preset: "ytd" }, "32%", en)).toBe(
      "Across all events this year: 32%",
    );
    expect(allEventsLine({ preset: "all" }, "32%", en)).toBe(
      "Across all recorded events: 32%",
    );
    expect(
      allEventsLine(
        { preset: "custom", custom: { from: "2026-03-01", to: "2026-04-15" } },
        "32%",
        en,
      ),
    ).toBe("Across all events from 01/03/2026 to 15/04/2026: 32%");
  });
});
