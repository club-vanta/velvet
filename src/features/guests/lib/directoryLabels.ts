import { MAZMO_PRONOUN_SHORT, mazmoLabel } from "@/domain/guest";
import type { TranslationKey } from "@/lib/i18n";
import type { SortDir } from "@/lib/sortNames";
import {
  DEFAULT_DIRECTORY_FILTERS,
  type DirectoryFilters,
  type DirectorySortKey,
  type VantedSortKey,
} from "./guestDirectoryView";

type Translate = (key: TranslationKey) => string;

// Labels for the Guests page's sort and filter menus.

export const DIRECTORY_SORT_LABEL: Record<DirectorySortKey, TranslationKey> = {
  name: "sortName",
  handle: "sortHandle",
  mazmoId: "sortMazmoId",
  instagram: "sortInstagram",
};

export const VANTED_SORT_LABEL: Record<VantedSortKey, TranslationKey> = {
  name: "sortName",
  handle: "sortHandle",
  bannedAt: "sortBannedAt",
  reason: "sortReason",
};

// Text sorts read "A to Z"; numbers and dates say which end comes first.
export const SORT_DIR_LABEL: Record<
  DirectorySortKey | VantedSortKey,
  Record<SortDir, TranslationKey>
> = {
  name: { asc: "sortNameAsc", desc: "sortNameDesc" },
  handle: { asc: "sortNameAsc", desc: "sortNameDesc" },
  instagram: { asc: "sortNameAsc", desc: "sortNameDesc" },
  reason: { asc: "sortNameAsc", desc: "sortNameDesc" },
  mazmoId: { asc: "sortLowestFirst", desc: "sortHighestFirst" },
  bannedAt: { asc: "sortRsvpAsc", desc: "sortRsvpDesc" },
};

export const MAZMO_FILTER_LABEL: Record<
  DirectoryFilters["mazmo"],
  TranslationKey
> = {
  all: "filterAll",
  linked: "filterWithMazmo",
  unlinked: "filterWithoutMazmo",
};

export const INSTAGRAM_FILTER_LABEL: Record<
  DirectoryFilters["instagram"],
  TranslationKey
> = {
  all: "filterAll",
  with: "filterWithInstagram",
  without: "filterWithoutInstagram",
};

export const PRONOUN_FILTERS = ["MALE", "FEMALE", "NEUTRAL"] as const;

/** The label of an active filter's chip ("Pronouns: she/her"). */
export function directoryFilterChipLabel(
  key: keyof DirectoryFilters,
  filters: DirectoryFilters,
  t: Translate,
): string {
  switch (key) {
    case "mazmo":
      return t(MAZMO_FILTER_LABEL[filters.mazmo]);
    case "instagram":
      return t(INSTAGRAM_FILTER_LABEL[filters.instagram]);
    case "pronoun":
      return filters.pronoun === DEFAULT_DIRECTORY_FILTERS.pronoun
        ? ""
        : `${t("pronouns")}: ${mazmoLabel(MAZMO_PRONOUN_SHORT, filters.pronoun, t)}`;
    case "vantedOnly":
      return t("filterBanned");
    case "mazmoFlaggedOnly":
      return t("filterMazmoFlagged");
  }
}
