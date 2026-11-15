import { useState } from "react";
import { useGuestSearch } from "@/domain/guest";
import type { components } from "@/api/types";
import {
  DEFAULT_GUEST_FILTERS,
  DEFAULT_GUEST_SORT,
  toggleGuestSort,
  viewGuestList,
  type GuestFilters,
  type GuestSort,
  type GuestSortKey,
} from "../lib/guestListView";

type MeetupGuest = components["schemas"]["MeetupGuestPublic"];

// Module level, so useGuestSearch folds the names once per list.
const rsvpGuest = (mg: MeetupGuest) => mg.guest;

/** The guest list as the door sees it: filtered, sorted, then searched. */
export function useGuestListView(
  guests: MeetupGuest[],
  requiresPayment: boolean,
) {
  const [sort, setSort] = useState<GuestSort>(DEFAULT_GUEST_SORT);
  const [filters, setFilters] = useState<GuestFilters>(DEFAULT_GUEST_FILTERS);
  const viewed = viewGuestList(guests, filters, sort, requiresPayment);
  const { search, setSearch, filtered } = useGuestSearch(viewed, rsvpGuest);

  return {
    sort,
    setSort,
    toggleSort: (key: GuestSortKey) =>
      setSort((prev) => toggleGuestSort(prev, key)),
    filters,
    setFilters,
    search,
    setSearch,
    shown: filtered ?? [],
  };
}
