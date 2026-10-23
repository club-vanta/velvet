import { useDeferredValue, useMemo, useState } from "react";
import { foldForSearch, matchesWords, searchWords } from "@/lib/searchText";

/**
 * Filters a loaded guest list by name or Mazmo handle, in the browser.
 *
 * Folding every name is the costly part, so it runs once per list while a
 * query is active rather than once per keystroke, and not at all before
 * anyone types. The query is deferred, so the input stays responsive while
 * a long list re-renders.
 *
 * `query` is the normalized query the results reflect ("" when nothing is
 * searched); use it for "is a search active" checks and as a reset key.
 */
export function useGuestSearch<T>(
  items: T[] | undefined,
  getFields: (item: T) => { displayname: string; mazmoHandle: string | null },
): {
  search: string;
  setSearch: (v: string) => void;
  filtered: T[] | undefined;
  query: string;
} {
  const [search, setSearch] = useState("");
  const query = searchWords(useDeferredValue(search)).join(" ");
  const active = query !== "";

  const folded = useMemo(
    () =>
      active
        ? items?.map((item) => {
            const { displayname, mazmoHandle } = getFields(item);
            return foldForSearch(`${displayname} ${mazmoHandle ?? ""}`);
          })
        : undefined,
    [items, getFields, active],
  );

  // When items is undefined the data is still loading. Pass it through as-is
  // so callers can tell "loading" (undefined) from "no results" ([]).
  const filtered = useMemo(() => {
    if (!items || !folded) return items;
    const words = query.split(" ");
    return items.filter((_, i) => matchesWords(folded[i], words));
  }, [items, folded, query]);

  return { search, setSearch, filtered, query };
}
