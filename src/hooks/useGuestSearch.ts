import { useDeferredValue, useState } from "react";

export function useGuestSearch<T>(
  items: T[] | undefined,
  getFields: (item: T) => { displayname: string; mazmoHandle: string | null },
): {
  search: string;
  setSearch: (v: string) => void;
  filtered: T[] | undefined;
} {
  const [search, setSearch] = useState("");
  const q = useDeferredValue(search).trim().toLowerCase();

  // When items is undefined the data is still loading — pass it through as-is
  // so callers can distinguish "loading" (undefined) from "no results" (empty array).
  // Only run the filter once we have actual data and a non-empty query.
  const filtered = q
    ? (items ?? []).filter((item) => {
        const { displayname, mazmoHandle } = getFields(item);
        return (
          displayname.toLowerCase().includes(q) ||
          (mazmoHandle ?? "").toLowerCase().includes(q)
        );
      })
    : items;

  return { search, setSearch, filtered };
}
