import type { components } from "@/api/types";
import { formatApiDate } from "@/lib/format";
import { useLanguage } from "@/lib/i18n";
import { StatsLink } from "../../components/StatsLink";
import { StatsListMore } from "../../components/StatsListMore";
import { formatCount } from "../../lib/statsFormat";

type Retention = components["schemas"]["RetentionStatsPublic"];

/** Regulars who did not come in the period, each linked to their guest page. */
export function LapsedList({
  lapsed,
  total,
}: {
  lapsed: Retention["lapsed"];
  total: number;
}) {
  const { t, lang } = useLanguage();
  const more = total - lapsed.length;

  return (
    <>
      <ul className="divide-y text-sm">
        {lapsed.map((guest) => (
          <li
            key={guest.guest_id}
            data-cy={`stats-lapsed-${guest.guest_id}`}
            className="flex flex-wrap items-baseline justify-between gap-x-3 py-1.5"
          >
            <StatsLink to={`/guests/${guest.guest_id}`}>
              {guest.displayname}
            </StatsLink>
            <span className="text-muted-foreground tabular-nums">
              <span data-cy="stats-lapsed-times">
                {t("statsLapsedCame").replace(
                  "{0}",
                  formatCount(guest.attended_before, lang),
                )}
              </span>
              {" · "}
              <span data-cy="stats-lapsed-last">
                {formatApiDate(guest.last_attended)}
              </span>
            </span>
          </li>
        ))}
      </ul>
      <StatsListMore count={more} data-cy="stats-lapsed-more" />
    </>
  );
}
