/**
 * Folds text so a search matches the way staff type: styled Mazmo letters
 * ("𝑩𝑨𝑹𝑴𝑨𝑵") become plain ones (NFKC), accents are dropped ("Pérez"
 * matches "perez"), and case is ignored.
 */
export function foldForSearch(text: string): string {
  return text
    .normalize("NFKC")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
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
