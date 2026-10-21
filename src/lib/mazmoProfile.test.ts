import { describe, it, expect } from "vitest";
import { translations, type TranslationKey } from "./i18n";
import {
  MAZMO_GENDER_LABEL,
  MAZMO_PRONOUN_LABEL,
  MAZMO_PRONOUN_SHORT,
  mazmoLabel,
} from "./mazmoProfile";

const tEs = (key: TranslationKey) => translations.es[key];

describe("mazmoLabel", () => {
  it("translates known Mazmo gender and pronoun codes", () => {
    expect(mazmoLabel(MAZMO_GENDER_LABEL, "WOMAN_CIS", tEs)).toBe("Mujer cis");
    expect(mazmoLabel(MAZMO_GENDER_LABEL, "NOT_BINARY", tEs)).toBe(
      "No binarie",
    );
    expect(mazmoLabel(MAZMO_PRONOUN_LABEL, "MALE", tEs)).toBe("Masculino");
    expect(mazmoLabel(MAZMO_PRONOUN_SHORT, "NEUTRAL", tEs)).toBe("elle");
  });

  it("falls back to the raw code for codes it does not know", () => {
    expect(mazmoLabel(MAZMO_GENDER_LABEL, "SOMETHING_NEW", tEs)).toBe(
      "SOMETHING_NEW",
    );
    expect(mazmoLabel(MAZMO_GENDER_LABEL, "toString", tEs)).toBe("toString");
  });

  it("has a non-empty EN and ES label for every code", () => {
    const maps = [MAZMO_GENDER_LABEL, MAZMO_PRONOUN_LABEL, MAZMO_PRONOUN_SHORT];
    for (const map of maps) {
      for (const key of Object.values(map)) {
        expect(translations.en[key]).toBeTruthy();
        expect(translations.es[key]).toBeTruthy();
      }
    }
  });
});
