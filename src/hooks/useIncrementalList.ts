import { useState } from "react";

/**
 * Renders a long list a page at a time. Mounting a thousand rows takes
 * seconds on a phone, while the first page shows up at once and the rest
 * follow as the user scrolls (see ShowMoreButton).
 *
 * A new `items` array (another search, filter, or sort) starts again from the
 * first page, so pass a memoized array: one rebuilt on every render would
 * never get past the first page.
 */
export function useIncrementalList<T>(
  items: T[] | undefined,
  pageSize = 100,
): {
  visible: T[] | undefined;
  /** How many rows showMore adds; 0 once everything is shown. */
  nextCount: number;
  showMore: () => void;
} {
  const [limit, setLimit] = useState(pageSize);
  const [source, setSource] = useState(items);
  if (items !== source) {
    setSource(items);
    setLimit(pageSize);
  }

  return {
    visible: items?.slice(0, limit),
    nextCount: Math.max(0, Math.min(pageSize, (items?.length ?? 0) - limit)),
    showMore: () => setLimit((l) => l + pageSize),
  };
}
