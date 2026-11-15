import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { MeetupSort, MeetupSortCol } from "../lib/meetupListSort";
import { SortIcon } from "./SortIcon";

const COLUMNS = [
  { col: "name", label: "name" },
  { col: "date", label: "date" },
] as const;

/** "Sort by Name / Date": toggle buttons that cycle each column's order. */
export function MeetupSortBar({
  sort,
  onSort,
}: {
  sort: MeetupSort;
  onSort: (col: MeetupSortCol) => void;
}) {
  const { t } = useLanguage();
  return (
    <div className="flex items-center gap-1 text-sm">
      <span className="mr-1 text-muted-foreground">{t("sortBy")}</span>
      {COLUMNS.map(({ col, label }) => {
        const active = sort?.col === col;
        return (
          <button
            key={col}
            type="button"
            onClick={() => onSort(col)}
            aria-pressed={active}
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-2 py-1 transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              active ? "bg-muted text-foreground" : "text-muted-foreground",
            )}
            data-cy={`meetups-sort-${col}`}
          >
            {t(label)}
            <SortIcon active={active} dir={sort?.dir ?? "asc"} />
          </button>
        );
      })}
    </div>
  );
}
