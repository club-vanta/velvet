import { compareNames, compareOptional, type SortDir } from "@/lib/sortNames";
import type { components } from "@/api/types";

type Guest = components["schemas"]["GuestPublic"];
type BannedGuest = components["schemas"]["BannedGuestPublic"];

// The Guests page: every known guest, and the ones vanted in this org.
// Same columns the old tables could sort by, alphabetical by default.

export type DirectorySortKey = "name" | "handle" | "mazmoId" | "instagram";
export const DIRECTORY_SORT_KEYS: readonly DirectorySortKey[] = [
  "name",
  "handle",
  "mazmoId",
  "instagram",
];

export type VantedSortKey = "name" | "handle" | "bannedAt" | "reason";
export const VANTED_SORT_KEYS: readonly VantedSortKey[] = [
  "name",
  "handle",
  "bannedAt",
  "reason",
];

export type ListSort<K extends string> = { key: K; dir: SortDir };

export type DirectoryFilters = {
  mazmo: "all" | "linked" | "unlinked";
  instagram: "all" | "with" | "without";
  pronoun: "all" | "MALE" | "FEMALE" | "NEUTRAL";
  vantedOnly: boolean;
  mazmoFlaggedOnly: boolean;
};

export const DEFAULT_DIRECTORY_FILTERS: DirectoryFilters = {
  mazmo: "all",
  instagram: "all",
  pronoun: "all",
  vantedOnly: false,
  mazmoFlaggedOnly: false,
};

export function activeDirectoryFilters(
  filters: DirectoryFilters,
): (keyof DirectoryFilters)[] {
  return (Object.keys(filters) as (keyof DirectoryFilters)[]).filter(
    (key) => filters[key] !== DEFAULT_DIRECTORY_FILTERS[key],
  );
}

function matches(
  g: Guest,
  f: DirectoryFilters,
  vantedIds: ReadonlySet<string>,
): boolean {
  if (f.mazmo === "linked" && !g.mazmo_handle) return false;
  if (f.mazmo === "unlinked" && g.mazmo_handle) return false;
  if (f.instagram === "with" && !g.instagram_username) return false;
  if (f.instagram === "without" && g.instagram_username) return false;
  if (f.pronoun !== "all" && g.mazmo_profile?.pronoun !== f.pronoun)
    return false;
  if (f.vantedOnly && !vantedIds.has(g.id)) return false;
  if (
    f.mazmoFlaggedOnly &&
    !g.mazmo_profile?.mazmo_banned &&
    !g.mazmo_profile?.mazmo_suspended
  )
    return false;
  return true;
}

/** Filters, then sorts; empty values sort last, ties go by name, then id. */
export function viewDirectory(
  guests: readonly Guest[],
  filters: DirectoryFilters,
  sort: ListSort<DirectorySortKey>,
  vantedIds: ReadonlySet<string>,
): Guest[] {
  const sign = sort.dir === "asc" ? 1 : -1;
  const byKey = (a: Guest, b: Guest) => {
    switch (sort.key) {
      case "name":
        return sign * compareNames(a.displayname, b.displayname);
      case "handle":
        return compareOptional(a.mazmo_handle, b.mazmo_handle, sort.dir);
      case "mazmoId":
        return compareOptional(a.mazmo_user_id, b.mazmo_user_id, sort.dir);
      case "instagram":
        return compareOptional(
          a.instagram_username,
          b.instagram_username,
          sort.dir,
        );
    }
  };
  return guests
    .filter((g) => matches(g, filters, vantedIds))
    .sort(
      (a, b) =>
        byKey(a, b) ||
        compareNames(a.displayname, b.displayname) ||
        a.id.localeCompare(b.id),
    );
}

export function viewVanted(
  guests: readonly BannedGuest[],
  sort: ListSort<VantedSortKey>,
): BannedGuest[] {
  const sign = sort.dir === "asc" ? 1 : -1;
  const byKey = (a: BannedGuest, b: BannedGuest) => {
    switch (sort.key) {
      case "name":
        return sign * compareNames(a.displayname, b.displayname);
      case "handle":
        return compareOptional(a.mazmo_handle, b.mazmo_handle, sort.dir);
      case "bannedAt":
        return sign * a.banned_at.localeCompare(b.banned_at);
      case "reason":
        return compareOptional(a.banned_reason, b.banned_reason, sort.dir);
    }
  };
  return guests
    .slice()
    .sort(
      (a, b) =>
        byKey(a, b) ||
        compareNames(a.displayname, b.displayname) ||
        a.id.localeCompare(b.id),
    );
}
