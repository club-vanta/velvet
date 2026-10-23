import { foldForSearch } from "@/lib/searchText";

export type SortDir = "asc" | "desc";

const collator = new Intl.Collator(undefined, {
  sensitivity: "base",
  numeric: true,
});

// Sorting compares each name about log2(n) times, so a thousand guests would
// fold the same names tens of thousands of times. Names repeat across
// renders and lists, so their keys are kept, up to a cap (names, handles,
// and Instagram users run a few per guest).
const sortKeys = new Map<string, string>();
const MAX_SORT_KEYS = 20_000;

/**
 * Mazmo names are often decorated: styled Unicode letters ("𝑩𝑨𝑹𝑴𝑨𝑵",
 * "ʙᴀʀᴍᴀɴ") and leading emoji or symbols ("☆ selene ☆"). They are folded
 * the same way search folds them, and the leading decoration is skipped, so
 * "☆ selene" files under S. A name with no letters or digits at all keeps
 * its folded form.
 */
function nameSortKey(name: string): string {
  let key = sortKeys.get(name);
  if (key === undefined) {
    const folded = foldForSearch(name);
    key = folded.replace(/^[^\p{L}\p{N}]+/u, "") || folded;
    if (sortKeys.size >= MAX_SORT_KEYS) sortKeys.clear();
    sortKeys.set(name, key);
  }
  return key;
}

/** Compares names the way staff read them; see nameSortKey. */
export function compareNames(a: string, b: string): number {
  return (
    collator.compare(nameSortKey(a), nameSortKey(b)) || collator.compare(a, b)
  );
}

/**
 * Compares optional text (handles, Instagram users). Missing values sort
 * last whatever the direction, so pass the direction in.
 */
export function compareOptional(
  a: string | number | null | undefined,
  b: string | number | null | undefined,
  dir: SortDir,
): number {
  const aNone = a == null || a === "";
  const bNone = b == null || b === "";
  if (aNone || bNone) return aNone === bNone ? 0 : aNone ? 1 : -1;
  const cmp =
    typeof a === "number" && typeof b === "number"
      ? a - b
      : compareNames(String(a), String(b));
  return dir === "asc" ? cmp : -cmp;
}
