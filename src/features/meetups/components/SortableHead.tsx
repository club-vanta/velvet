import { TableHead } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { GuestSort, GuestSortKey } from "../lib/guestListView";
import { SortIcon } from "./SortIcon";

/** A column header that sorts the guest list by its column. */
export function SortableHead({
  col,
  label,
  sort,
  onSort,
  className,
}: {
  col: GuestSortKey;
  label: string;
  sort: GuestSort;
  onSort: (col: GuestSortKey) => void;
  className?: string;
}) {
  const active = col === sort.key;
  return (
    <TableHead
      className={className}
      aria-sort={
        active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"
      }
      data-cy={`guest-sort-${col}`}
    >
      <button
        type="button"
        onClick={() => onSort(col)}
        className={cn(
          "flex items-center gap-1 hover:text-foreground transition-colors",
          active ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {label}
        <SortIcon active={active} dir={sort.dir} />
      </button>
    </TableHead>
  );
}
