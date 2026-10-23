import { useCallback, useState } from "react";

/**
 * Renders a long list a page at a time. Mounting a thousand rows takes
 * seconds on a phone, while the first page shows up at once and the rest
 * follow as the user scrolls (see ShowMoreButton).
 *
 * `resetKey` describes what the list shows (query, filters, sort): when it
 * changes, the list starts again from the first page. A refetch that only
 * updates rows keeps the pages already shown, so editing a guest far down
 * the list doesn't throw the user back to the top.
 */
export function useIncrementalList<T>(
  items: T[] | undefined,
  resetKey: string,
  pageSize = 100,
): {
  visible: T[] | undefined;
  /** How many rows showMore adds; 0 once everything is shown. */
  nextCount: number;
  showMore: () => void;
} {
  const [limit, setLimit] = useState(pageSize);
  const [shownKey, setShownKey] = useState(resetKey);
  if (resetKey !== shownKey) {
    setShownKey(resetKey);
    setLimit(pageSize);
  }

  const showMore = useCallback(() => setLimit((l) => l + pageSize), [pageSize]);

  return {
    visible: items?.slice(0, limit),
    nextCount: Math.max(0, Math.min(pageSize, (items?.length ?? 0) - limit)),
    showMore,
  };
}
