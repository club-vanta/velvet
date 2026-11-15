import type { Lang } from "./translations";

const LANG_KEY = "lang";
const DEFAULT_LANG: Lang = "es";

function isLang(value: string | null): value is Lang {
  return value === "en" || value === "es";
}

/**
 * The UI language the viewer picked last, or Spanish. A value that is not a
 * known language (an old or hand-edited entry) falls back too, so `t()` never
 * reads a table that does not exist.
 */
export function readStoredLang(): Lang {
  const stored = localStorage.getItem(LANG_KEY);
  return isLang(stored) ? stored : DEFAULT_LANG;
}

export function storeLang(lang: Lang): void {
  localStorage.setItem(LANG_KEY, lang);
}
