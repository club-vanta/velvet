import type { components } from "@/api/types";
import { StatCard } from "@/components/StatCard";
import { StatsNote } from "@/components/StatsNote";
import { WeatherDetails } from "@/components/WeatherDetails";
import { useArrivalsStats } from "@/hooks/useArrivalsStats";
import { formatDecimal, formatTime } from "@/lib/format";
import { useLanguage } from "@/lib/i18n";
import { useIsOrgAdmin } from "@/lib/org";
import type { StatsQuery } from "@/lib/statsQuery";
import { ChartCard } from "./ChartCard";
import { HeadlineStat } from "./HeadlineStat";
import { headlineGrid } from "./headlineGrid";
import { WeatherMeteogram } from "./WeatherMeteogram";

type Event = components["schemas"]["WeatherEventPublic"];
type Hour = components["schemas"]["WeatherHourPublic"];

/** The fields a before or during summary share. */
type WindowSummary = Pick<
  components["schemas"]["WeatherWindowPublic"],
  | "avg_temperature"
  | "avg_apparent_temperature"
  | "total_precipitation_mm"
  | "rained"
>;

/** Headline cards of the loaded event; the skeleton shows the same count. */
export const EVENT_CARDS = 2;

const HOUR_MS = 60 * 60 * 1000;

/** One window's rain as the big value and its temperatures under it. */
function WindowStat({
  label,
  summary,
}: {
  label: string;
  summary: WindowSummary | null;
}) {
  const { t, lang } = useLanguage();
  const degrees = (value: number | null) =>
    value === null ? null : `${formatDecimal(value, lang)} °C`;
  const rained = summary?.rained ?? null;
  const precipitation = summary?.total_precipitation_mm ?? null;
  const value =
    rained === null || precipitation === null
      ? t("weatherNoData")
      : rained
        ? t("statsWeatherRainMm").replace(
            "{0}",
            formatDecimal(precipitation, lang),
          )
        : t("weatherDry");
  const temperature = degrees(summary?.avg_temperature ?? null);
  const felt = degrees(summary?.avg_apparent_temperature ?? null);
  const subline =
    temperature && felt
      ? t("statsWeatherFeltLike")
          .replace("{0}", temperature)
          .replace("{1}", felt)
      : (temperature ?? felt ?? undefined);

  return <HeadlineStat label={label} value={value} subline={subline} />;
}

/** "Antes del inicio · 19:00 a 22:00": a window's name with the hours it covers. */
function windowLabel(title: string, hours: Hour[], template: string): string {
  if (hours.length === 0) return title;
  const end = new Date(new Date(hours.at(-1)!.time).getTime() + HOUR_MS);
  return template
    .replace("{0}", title)
    .replace("{1}", formatTime(hours[0]!.time))
    .replace("{2}", formatTime(end.toISOString()));
}

/**
 * The weather of one event: before and during its start, then hour by hour
 * against its arrivals. Without a weather row it says why, as on the meetup page.
 */
export function WeatherEventView({
  event,
  orgId,
  query,
}: {
  event: Event;
  orgId: string;
  query: StatsQuery | null;
}) {
  const { t } = useLanguage();
  // As on the meetup page: site admins and org admins can set the location.
  const canSetLocation = useIsOrgAdmin();

  if (event.status !== "OK" || event.hours.length === 0) {
    return (
      <StatCard title={t("weatherTitle")}>
        <WeatherDetails
          status={event.status}
          weather={event.weather}
          canSetLocation={canSetLocation}
        />
      </StatCard>
    );
  }

  // The hour that contains the start opens the during window.
  const before = event.hours.filter((h) => h.offset_minutes <= -60);
  const during = event.hours.filter((h) => h.offset_minutes > -60);
  const range = t("statsWeatherRange");

  return (
    <div className="space-y-3">
      <div className={headlineGrid(EVENT_CARDS)}>
        <WindowStat
          label={windowLabel(t("statsWeatherBefore"), before, range)}
          summary={event.before}
        />
        <WindowStat
          label={windowLabel(t("statsWeatherDuring"), during, range)}
          summary={event.weather}
        />
      </div>
      <StatsNote>{t("statsNoteWeatherEvent")}</StatsNote>
      <ChartCard title={t("statsWeatherByHour")}>
        {(headingId) => (
          <EventMeteogram
            hours={event.hours}
            orgId={orgId}
            query={query}
            labelledBy={headingId}
          />
        )}
      </ChartCard>
    </div>
  );
}

/** The meteogram with the event's arrivals, asked for with the same filters. */
function EventMeteogram({
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
