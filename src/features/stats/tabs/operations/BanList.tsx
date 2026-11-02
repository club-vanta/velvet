import type { components } from "@/api/types";
import { formatApiDate } from "@/lib/format";
import { StatsLink } from "../../components/StatsLink";
import { StatsListMore } from "../../components/StatsListMore";
import { NO_VALUE } from "../../lib/statsFormat";

type Operations = components["schemas"]["OperationsStatsPublic"];

/** The newest bans, each guest linked to their page. */
export function BanList({
  bans,
  total,
}: {
  bans: Operations["ban_list"];
  total: number;
}) {
  const more = total - bans.length;

  return (
    <>
      <ul className="divide-y text-sm">
        {bans.map((ban) => (
          <li
            key={`${ban.guest_id}-${ban.timestamp}`}
            className="space-y-0.5 py-1.5"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <StatsLink to={`/guests/${ban.guest_id}`}>
                {ban.displayname}
              </StatsLink>
              <span
                data-slot="date"
                className="text-muted-foreground tabular-nums"
              >
                {formatApiDate(ban.timestamp)}
              </span>
            </div>
            <p className="text-muted-foreground break-words">
              <span data-slot="reason">{ban.reason ?? NO_VALUE}</span>
              {" · "}
              <span data-slot="actor">{ban.actor_username ?? NO_VALUE}</span>
            </p>
          </li>
        ))}
      </ul>
      <StatsListMore count={more} slot="bans-more" />
    </>
  );
}
