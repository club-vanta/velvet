import { useMemo, useState } from "react";
import { useGuestSearch } from "@/domain/guest";
import { useIncrementalList } from "@/hooks/useIncrementalList";
import type { components } from "@/api/types";
import {
  DEFAULT_DIRECTORY_FILTERS,
  viewDirectory,
  type DirectoryFilters,
  type DirectorySortKey,
  type ListSort,
} from "../lib/guestDirectoryView";

type Guest = components["schemas"]["GuestPublic"];

/**
 * What the directory shows: the loaded guests filtered, sorted, searched and
 * paged. The whole directory is loaded anyway, so all of it runs in the
 * browser: no request per query, and accents and styled names match.
 */
export function useDirectoryView(
  guests: Guest[] | undefined,
  vantedIds: ReadonlySet<string>,
) {
  const [sort, setSort] = useState<ListSort<DirectorySortKey>>({
    key: "name",
    dir: "asc",
  });
  const [filters, setFilters] = useState<DirectoryFilters>(
    DEFAULT_DIRECTORY_FILTERS,
  );

  // An explicit memo: `vantedIds` is a Set the rows read again after the
  // hook calls below, so the React Compiler can't cache this ahead of them.
  // Without it, every keystroke re-sorted a thousand guests (measured).
  // Sort first and search second, so typing doesn't re-sort.
  const viewed = useMemo(
    () =>
      guests ? viewDirectory(guests, filters, sort, vantedIds) : undefined,
    [guests, filters, sort, vantedIds],
  );
  const { search, setSearch, filtered, query } = useGuestSearch(viewed);
  const { visible, nextCount, showMore } = useIncrementalList(
    filtered,
    JSON.stringify([query, sort, filters]),
  );

  return {
    sort,
    setSort,
    filters,
    setFilters,
    search,
    setSearch,
    searching: query !== "",
    shown: filtered?.length ?? 0,
    visible,
    nextCount,
    showMore,
  };
}
