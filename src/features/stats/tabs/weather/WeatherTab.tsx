import { useWeatherStats } from "../../api/useWeatherStats";
import { StatsTabGate } from "../../components/StatsTabGate";
import type { StatsTabProps } from "../../lib/statsTab";
import { WeatherAggregate } from "./WeatherAggregate";
import { EVENT_CARDS, WeatherEventView } from "./WeatherEventView";

export function WeatherTab({ orgId, query, onShowAll }: StatsTabProps) {
  const statsQ = useWeatherStats(orgId, query);
  const single = !!query?.meetupId;

  return (
    <StatsTabGate
      statsQ={statsQ}
      single={single}
      // The aggregate has no headline cards, only its charts.
      cards={single ? EVENT_CARDS : 0}
      tab="weather"
      onShowAll={onShowAll}
    >
      {(data) =>
        data.event ? (
          <WeatherEventView event={data.event} orgId={orgId} query={query} />
        ) : (
          <WeatherAggregate data={data} />
        )
      }
    </StatsTabGate>
  );
}
