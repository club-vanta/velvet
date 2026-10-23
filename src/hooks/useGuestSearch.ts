import { useDeferredValue, useMemo, useState } from "react";
import { foldForSearch, matchesWords, searchWords } from "@/lib/searchText";

/**
 * Filters a loaded guest list by name or Mazmo handle, in the browser.
 *
 * Folding every name is the costly part, so it runs once per list rather
 * than once per keystroke; matching a query is then a plain substring check.
 * The query is deferred, so the input stays responsive while a long list
 * re-renders. `filtered` keeps its identity until the list or the query
 * changes (useIncrementalList relies on that).
 */
export function useGuestSearch<T>(
  items: T[] | undefined,
  getFields: (item: T) => { displayname: string; mazmoHandle: string | null },
): {
  search: string;
  setSearch: (v: string) => void;
  filtered: T[] | undefined;
} {
  const [search, setSearch] = useState("");
  const query = useDeferredValue(search);

  const folded = useMemo(
    () =>
      items?.map((item) => {
        const { displayname, mazmoHandle } = getFields(item);
        return foldForSearch(`${displayname} ${mazmoHandle ?? ""}`);
      }),
    [items, getFields],
  );

  const filtered = useMemo(() => {
    const words = searchWords(query);
    // When items is undefined the data is still loading. Pass it through
    // as-is so callers can tell "loading" (undefined) from "no results" ([]).
    if (words.length === 0 || !items || !folded) return items;
    return items.filter((_, i) => matchesWords(folded[i], words));
  }, [items, folded, query]);

  return { search, setSearch, filtered };
}
