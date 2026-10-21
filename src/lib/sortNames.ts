export type SortDir = "asc" | "desc";

const collator = new Intl.Collator(undefined, {
  sensitivity: "base",
  numeric: true,
});

/**
 * Mazmo names are often decorated: styled Unicode letters ("𝑩𝑨𝑹𝑴𝑨𝑵") and
 * leading emoji or symbols ("☆ selene ☆"). NFKC folds the styled letters to
 * plain ones and the leading decoration is skipped, so "☆ selene" files
 * under S. A name with no letters or digits at all keeps its raw form.
 */
function nameSortKey(name: string): string {
  const folded = name.normalize("NFKC");
  return folded.replace(/^[^\p{L}\p{N}]+/u, "") || folded;
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
