import type { components } from "@/api/types";
import type { StatsQuery } from "@/api/statsQuery";
import { useArrivalsStats } from "../../api/useArrivalsStats";
import { WeatherMeteogram } from "./WeatherMeteogram";

type Hour = components["schemas"]["WeatherHourPublic"];

/** The meteogram with the event's arrivals, asked for with the same filters. */
export function EventMeteogram({
  hours,
  orgId,
  query,
  labelledBy,
}: {
  hours: Hour[];
  orgId: string;
  query: StatsQuery | null;
  labelledBy: string;
}) {
  const arrivalsQ = useArrivalsStats(orgId, query);
  const arrivals = arrivalsQ.isError
    ? null
    : arrivalsQ.data
      ? arrivalsQ.data.curve
      : undefined;
  return (
    <WeatherMeteogram
      hours={hours}
      arrivals={arrivals}
      labelledBy={labelledBy}
    />
  );
}
