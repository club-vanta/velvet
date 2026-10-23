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
 * Turns styled letters into plain ones ("𝑩𝑨𝑹𝑴𝑨𝑵", "ʙᴀʀᴍᴀɴ" become
 * "barman") and lowercases, but keeps accents and ñ. Sorting uses this, so
 * the collator can still order "Ñandú" after "Nicolás".
 */
export function foldStyles(text: string): string {
  return text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{ASCII}]/gu, (ch) => EXTRA_FOLDS[ch] ?? ch);
}

/**
 * Folds text so a search matches the way staff type: styled letters become
 * plain ones (see foldStyles) and accents are dropped ("perez" finds
 * "Pérez", "nandu" finds "Ñandú").
 */
export function foldForSearch(text: string): string {
  return foldStyles(text).normalize("NFD").replace(/\p{M}/gu, "");
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
