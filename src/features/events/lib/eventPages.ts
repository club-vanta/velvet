import type { components } from "@/api/types";

type EventLog = components["schemas"]["EventLogPublic"];

/**
 * The loaded pages as one list, each event once. The log is paged by offset
 * over a newest-first list, so events written after a page loaded push older
 * ones into the next page, which then repeats them.
 */
export function mergeEventPages(
  pages: readonly { events: readonly EventLog[] }[],
): EventLog[] {
  const seen = new Set<number>();
  const merged: EventLog[] = [];
  for (const page of pages) {
    for (const event of page.events) {
      if (seen.has(event.id)) continue;
      seen.add(event.id);
      merged.push(event);
    }
  }
  return merged;
}
