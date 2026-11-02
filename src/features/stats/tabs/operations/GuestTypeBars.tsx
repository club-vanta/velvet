import type { components } from "@/api/types";
import { GUEST_TYPE_LABEL } from "@/domain/guest";
import { useLanguage } from "@/lib/i18n";
import { formatCount, formatRate } from "../../lib/statsFormat";

type GuestTypeRow = components["schemas"]["GuestTypeRowPublic"];

/** One chart color per guest type, so a type keeps its color in any order. */
const TYPE_COLORS: Record<GuestTypeRow["guest_type"], string> = {
  NORMAL: "var(--chart-1)",
  INVITED: "var(--chart-2)",
  STAFF: "var(--chart-3)",
  VENDOR: "var(--chart-4)",
};

/** Everyone who came in by guest type: a bar sized by its share of all. */
export function GuestTypeBars({ rows }: { rows: GuestTypeRow[] }) {
  const { t, lang } = useLanguage();

  return (
    <ul className="space-y-2 text-sm">
      {rows.map((row) => (
        <li key={row.guest_type} className="space-y-1">
          <div className="flex items-baseline justify-between gap-3">
            <span data-slot="name" className="min-w-0 break-words">
              {t(GUEST_TYPE_LABEL[row.guest_type])}
            </span>
            <span className="text-muted-foreground tabular-nums">
              <span data-slot="count">{formatCount(row.attended, lang)}</span>
              {" · "}
              <span data-slot="share">{formatRate(row.share, lang)}</span>
            </span>
          </div>
          <div
            aria-hidden
            className="h-2 rounded-full bg-muted"
            data-slot="bar-track"
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${(row.share ?? 0) * 100}%`,
                backgroundColor: TYPE_COLORS[row.guest_type],
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
