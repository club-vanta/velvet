// Letters that NFKC and accent stripping leave alone: small caps, which
// Mazmo names use for decoration, and letters with a stroke or ligature.
// prettier-ignore
const EXTRA_FOLDS: Record<string, string> = {
  ᴀ: "a", ʙ: "b", ᴄ: "c", ᴅ: "d", ᴇ: "e", ꜰ: "f", ɢ: "g", ʜ: "h", ɪ: "i",
  ᴊ: "j", ᴋ: "k", ʟ: "l", ᴍ: "m", ɴ: "n", ᴏ: "o", ᴘ: "p", ʀ: "r",
  ꞯ: "q", ꜱ: "s", ᴛ: "t", ᴜ: "u", ᴠ: "v", ᴡ: "w", ʏ: "y", ᴢ: "z",
  ø: "o", ł: "l", đ: "d", ħ: "h", ı: "i", ß: "ss", æ: "ae", œ: "oe", þ: "th",
};

/**
 * Folds text so a search matches the way staff type: styled Mazmo letters
 * ("𝑩𝑨𝑹𝑴𝑨𝑵", "ʙᴀʀᴍᴀɴ") become plain ones, accents are dropped ("Pérez"
 * matches "perez"), and case is ignored.
 */
export function foldForSearch(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{ASCII}]/gu, (ch) => EXTRA_FOLDS[ch] ?? ch);
}

/**
 * Splits a query into folded words. A leading "@" is dropped, since staff
 * often type handles the way Mazmo shows them.
 */
export function searchWords(query: string): string[] {
  return foldForSearch(query)
    .split(/\s+/)
    .map((word) => word.replace(/^@/, ""))
    .filter(Boolean);
}

/** True when every word appears somewhere in the folded text, in any order. */
export function matchesWords(
  folded: string,
  words: readonly string[],
): boolean {
  return words.every((word) => folded.includes(word));
}
