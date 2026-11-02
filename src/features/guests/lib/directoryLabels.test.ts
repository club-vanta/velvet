import { describe, expect, it } from "vitest";
import { translations, type TranslationKey } from "@/lib/i18n";
import { DEFAULT_DIRECTORY_FILTERS } from "./guestDirectoryView";
import {
  DIRECTORY_SORT_LABEL,
  INSTAGRAM_FILTER_LABEL,
  MAZMO_FILTER_LABEL,
  SORT_DIR_LABEL,
  VANTED_SORT_LABEL,
  directoryFilterChipLabel,
} from "./directoryLabels";

const en = (key: TranslationKey) => translations.en[key];
const es = (key: TranslationKey) => translations.es[key];

describe("directoryFilterChipLabel", () => {
  const filters = {
    mazmo: "unlinked",
    instagram: "with",
    pronoun: "NEUTRAL",
    vantedOnly: true,
    mazmoFlaggedOnly: true,
  } as const;

  it("names each active filter in English", () => {
    expect(directoryFilterChipLabel("mazmo", filters, en)).toBe(
      "Without Mazmo",
    );
    expect(directoryFilterChipLabel("instagram", filters, en)).toBe(
      "With Instagram",
    );
    expect(directoryFilterChipLabel("pronoun", filters, en)).toBe(
      "Pronouns: they/them",
    );
    expect(directoryFilterChipLabel("vantedOnly", filters, en)).toBe("Vanted");
    expect(directoryFilterChipLabel("mazmoFlaggedOnly", filters, en)).toBe(
      "Flagged by Mazmo",
    );
  });

  it("uses the short Spanish pronoun", () => {
    expect(directoryFilterChipLabel("pronoun", filters, es)).toBe(
      "Pronombres: elle",
    );
  });

  it("has no pronoun label while no pronoun is picked", () => {
    expect(
      directoryFilterChipLabel("pronoun", DEFAULT_DIRECTORY_FILTERS, en),
    ).toBe("");
  });
});

describe("label maps", () => {
  it("point at keys with an English and a Spanish string", () => {
    const keys = [
      ...Object.values(DIRECTORY_SORT_LABEL),
      ...Object.values(VANTED_SORT_LABEL),
      ...Object.values(MAZMO_FILTER_LABEL),
      ...Object.values(INSTAGRAM_FILTER_LABEL),
      ...Object.values(SORT_DIR_LABEL).flatMap((d) => [d.asc, d.desc]),
    ];
    for (const key of keys) {
      expect(en(key)).toBeTruthy();
      expect(es(key)).toBeTruthy();
    }
  });
});
