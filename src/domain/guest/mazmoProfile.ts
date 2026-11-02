import type { TranslationKey } from "@/lib/i18n";

// Mazmo stores gender and pronoun as enum codes (MALE, WOMAN_CIS, NOT_BINARY,
// ...) and translates them in its own frontend. The backend keeps the raw
// code, so map it to a label here. The full catalog, taken from the mazmo.net
// bundle, is documented in docs/business-logic/mazmo.md.

export const MAZMO_GENDER_LABEL: Record<string, TranslationKey> = {
  MALE: "mazmoGenderMale",
  FEMALE: "mazmoGenderFemale",
  CROSSDRESSER: "mazmoGenderCrossdresser",
  TRAVESTI: "mazmoGenderTravesti",
  TRANS: "mazmoGenderTrans",
  INTERSEX: "mazmoGenderIntersex",
  INTERSEXUAL: "mazmoGenderIntersexual",
  UNDEFINED: "mazmoGenderUndefined",
  WOMAN_CIS: "mazmoGenderWomanCis",
  MALE_CIS: "mazmoGenderMaleCis",
  ANDROGYNOUS: "mazmoGenderAndrogynous",
  MALE_TRANS: "mazmoGenderMaleTrans",
  FEMALE_TRANS: "mazmoGenderFemaleTrans",
  TRANSEXUAL: "mazmoGenderTransexual",
  TRANSGENDER: "mazmoGenderTransgender",
  FEMALE_TRANSGENDER: "mazmoGenderFemaleTransgender",
  MALE_TRANSGENDER: "mazmoGenderMaleTransgender",
  QUEER: "mazmoGenderQueer",
  NEUTRAL: "mazmoGenderNeutral",
  NOT_BINARY: "mazmoGenderNotBinary",
  FLUID: "mazmoGenderFluid",
};

export const MAZMO_PRONOUN_LABEL: Record<string, TranslationKey> = {
  MALE: "mazmoPronounMale",
  FEMALE: "mazmoPronounFemale",
  NEUTRAL: "mazmoPronounNeutral",
};

// Short form for the profile header ("él", "ella", "elle").
export const MAZMO_PRONOUN_SHORT: Record<string, TranslationKey> = {
  MALE: "mazmoPronounShortMale",
  FEMALE: "mazmoPronounShortFemale",
  NEUTRAL: "mazmoPronounShortNeutral",
};

/**
 * Translates a Mazmo enum code with the given label map. Codes this app does
 * not know yet (Mazmo can add new ones) fall back to the raw code instead of
 * hiding the value.
 */
export function mazmoLabel(
  labels: Record<string, TranslationKey>,
  code: string,
  t: (key: TranslationKey) => string,
): string {
  const key = Object.hasOwn(labels, code) ? labels[code] : undefined;
  return key ? t(key) : code;
}
