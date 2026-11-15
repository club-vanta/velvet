import type { TranslationKey } from "@/lib/i18n";

/** The backend rejects shorter passwords; the forms check it first. */
export const MIN_PASSWORD_LENGTH = 15;

/**
 * Characters as the backend counts them (code points), so an emoji counts
 * once, not as the two UTF-16 units of `string.length`.
 */
export function passwordLength(value: string): number {
  return Array.from(value).length;
}

/** "Minimum 15 characters.", with the rule's actual length. */
export function minCharsMessage(t: (key: TranslationKey) => string): string {
  return t("minChars").replace("{0}", String(MIN_PASSWORD_LENGTH));
}
