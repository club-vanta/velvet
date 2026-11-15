import { useState } from "react";
import { useGuestSearch } from "@/domain/guest";
import { useIncrementalList } from "@/hooks/useIncrementalList";
import type { components } from "@/api/types";
import {
  viewVanted,
  type ListSort,
  type VantedSortKey,
} from "../lib/guestDirectoryView";

type BannedGuest = components["schemas"]["BannedGuestPublic"];

/** What the Vanted tab shows: the org's vants sorted, searched and paged. */
export function useVantedView(guests: BannedGuest[] | undefined) {
  const [sort, setSort] = useState<ListSort<VantedSortKey>>({
    key: "name",
    dir: "asc",
  });
  const sorted = guests ? viewVanted(guests, sort) : undefined;
  const { search, setSearch, filtered, query } = useGuestSearch(sorted);
  const { visible, nextCount, showMore } = useIncrementalList(
    filtered,
    JSON.stringify([query, sort]),
  );

  return {
    sort,
    setSort,
    search,
    setSearch,
    searching: query !== "",
    shown: filtered?.length ?? 0,
    visible,
    nextCount,
    showMore,
  };
}
