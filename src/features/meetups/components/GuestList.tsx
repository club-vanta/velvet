import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useLanguage } from "@/lib/i18n";
import type { components } from "@/api/types";
import type { GuestSort, GuestSortKey } from "../lib/guestListView";
import type { GuestRowContext } from "../lib/guestRow";
import { GuestCardList } from "./GuestCardList";
import { GuestTable } from "./GuestTable";

type MeetupGuest = components["schemas"]["MeetupGuestPublic"];

/**
 * The meetup's guests as a table on wide screens and as cards below that,
 * with what to say when there is nobody to show.
 */
export function GuestList({
  guests,
  total,
  loading,
  searching,
  ctx,
  sort,
  onSort,
}: {
  /** The guests left after filters and search. */
  guests: MeetupGuest[];
  /** Every guest of the meetup, before filters and search. */
  total: number;
  loading: boolean;
  searching: boolean;
  ctx: GuestRowContext;
  sort: GuestSort;
  onSort: (col: GuestSortKey) => void;
}) {
  const { t } = useLanguage();
  // The table needs about 1000px; below xl (with the sidebar open) it would
  // need sideways scrolling to reach "Check in", so cards are used instead.
  const isDesktop = useMediaQuery("(min-width: 1280px)");

  function emptyMessage() {
    if (loading || guests.length > 0) return null;
    if (total === 0) return t("noGuestsSyncMazmo");
    return searching ? t("noGuestsMatchSearch") : t("noGuestsMatchFilters");
  }

  return isDesktop ? (
    <GuestTable
      guests={guests}
      loading={loading}
      emptyMessage={emptyMessage()}
      ctx={ctx}
      sort={sort}
      onSort={onSort}
    />
  ) : (
    <GuestCardList
      guests={guests}
      loading={loading}
      emptyMessage={emptyMessage()}
      ctx={ctx}
    />
  );
}
