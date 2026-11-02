import { useDeferredValue, useMemo, useState } from "react";
import { foldForSearch, matchesWords, searchWords } from "@/lib/searchText";

type SearchableGuest = { displayname: string; mazmo_handle: string | null };

const itself = (item: unknown) => item as SearchableGuest;

/**
 * Filters a loaded guest list by name or Mazmo handle, in the browser.
 *
 * Folding every name is the costly part, so it runs once per list while a
 * query is active rather than once per keystroke, and not at all before
 * anyone types. The query is deferred, so the input stays responsive while
 * a long list re-renders.
 *
 * Items are guests unless `getGuest` says where the guest is (for example
 * an RSVP's `guest`); pass a module-level function so it stays stable.
 * `query` is the normalized query the results reflect ("" when nothing is
 * searched); use it for "is a search active" checks and as a reset key.
 */
export function useGuestSearch<T>(
  items: T[] | undefined,
  getGuest: (item: T) => SearchableGuest = itself,
): {
  search: string;
  setSearch: (v: string) => void;
  filtered: T[] | undefined;
  query: string;
} {
  const [search, setSearch] = useState("");
  const deferred = useDeferredValue(search);
  const words = useMemo(() => searchWords(deferred), [deferred]);
  const active = words.length > 0;

  const folded = useMemo(
    () =>
      active
        ? items?.map((item) => {
            const { displayname, mazmo_handle } = getGuest(item);
            return foldForSearch(`${displayname} ${mazmo_handle ?? ""}`);
          })
        : undefined,
    [items, getGuest, active],
  );

  // When items is undefined the data is still loading. Pass it through as-is
  // so callers can tell "loading" (undefined) from "no results" ([]).
  const filtered = useMemo(
    () =>
      items && folded
        ? items.filter((_, i) => matchesWords(folded[i], words))
        : items,
    [items, folded, words],
  );

  return { search, setSearch, filtered, query: words.join(" ") };
}
