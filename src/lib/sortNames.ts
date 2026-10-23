import { foldStyles } from "@/lib/searchText";

export type SortDir = "asc" | "desc";

/** Compares two strings; see nameComparer. */
export type TextCompare = (a: string, b: string) => number;

// Spanish rules for every viewer, so "Ñ" files after "N" and a list reads the
// same on every device. Accents and case are ignored ("base").
const collator = new Intl.Collator("es", {
  sensitivity: "base",
  numeric: true,
});

/**
 * Mazmo names are often decorated: styled Unicode letters ("𝑩𝑨𝑹𝑴𝑨𝑵",
 * "ʙᴀʀᴍᴀɴ") and leading emoji or symbols ("☆ selene ☆"). Styled letters
 * become plain ones and the leading decoration is skipped, so "☆ selene"
 * files under S. A name with no letters or digits at all keeps its form.
 */
function nameSortKey(name: string): string {
  const plain = foldStyles(name);
  return plain.replace(/^[^\p{L}\p{N}]+/u, "") || plain;
}

/**
 * Makes a comparer that orders names the way staff read them (see
 * nameSortKey). Make one per sort: it folds each distinct name once and
 * reuses the key, since a sort compares every name many times.
 */
export function nameComparer(): TextCompare {
  const keys = new Map<string, string>();
  const keyOf = (name: string) => {
    let key = keys.get(name);
    if (key === undefined) {
      key = nameSortKey(name);
      keys.set(name, key);
    }
    return key;
  };
  return (a, b) =>
    collator.compare(keyOf(a), keyOf(b)) || collator.compare(a, b);
}

/**
 * Compares optional text (handles, Instagram users) or numbers. Missing
 * values sort last whatever the direction, so pass the direction in.
 */
export function compareOptional(
  a: string | number | null | undefined,
  b: string | number | null | undefined,
  dir: SortDir,
  byText: TextCompare,
): number {
  const aNone = a == null || a === "";
  const bNone = b == null || b === "";
  if (aNone || bNone) return aNone === bNone ? 0 : aNone ? 1 : -1;
  const cmp =
    typeof a === "number" && typeof b === "number"
      ? a - b
      : byText(String(a), String(b));
  return dir === "asc" ? cmp : -cmp;
}
