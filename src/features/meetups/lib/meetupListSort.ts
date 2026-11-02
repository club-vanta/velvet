import type { SortDir } from "@/lib/sortNames";
import type { components } from "@/api/types";

type Meetup = components["schemas"]["MeetupPublic"];

export type MeetupSortCol = "name" | "date";

/** A picked sort, or null for the default grouping by timing. */
export type MeetupSort = { col: MeetupSortCol; dir: SortDir } | null;

/**
 * A sort button click: a new column sorts ascending, the active one flips to
 * descending, and a second flip goes back to no sort.
 */
export function nextMeetupSort(
  prev: MeetupSort,
  col: MeetupSortCol,
): MeetupSort {
  if (prev?.col !== col) return { col, dir: "asc" };
  return prev.dir === "asc" ? { col, dir: "desc" } : null;
}

/** The meetups in the picked order, without touching the input array. */
export function sortMeetups(
  meetups: readonly Meetup[],
  sort: NonNullable<MeetupSort>,
): Meetup[] {
  const sign = sort.dir === "asc" ? 1 : -1;
  return meetups
    .slice()
    .sort((a, b) => sign * a[sort.col].localeCompare(b[sort.col]));
}
