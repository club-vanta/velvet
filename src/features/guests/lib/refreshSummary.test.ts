import { describe, expect, it } from "vitest";
import { translations, type TranslationKey } from "@/lib/i18n";
import { makeMazmoRefresh } from "@/tests/factories";
import { refreshSummary } from "./refreshSummary";

const en = (key: TranslationKey) => translations.en[key];
const es = (key: TranslationKey) => translations.es[key];

describe("refreshSummary", () => {
  it("reports how many guests were refreshed", () => {
    expect(refreshSummary(makeMazmoRefresh({ refreshed: 3 }), en)).toBe(
      "Updated 3 guests from Mazmo",
    );
  });

  it("mentions the guests Mazmo didn't return", () => {
    expect(
      refreshSummary(
        makeMazmoRefresh({ total: 5, refreshed: 3, not_found: 2 }),
        es,
      ),
    ).toBe(
      "Se actualizaron 3 invitados desde Mazmo. 2 no se encontraron y quedaron como estaban.",
    );
  });
});
