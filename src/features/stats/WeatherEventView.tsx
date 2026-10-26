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
import { startHourOffset } from "./meteogramData";
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

const MINUTE_MS = 60 * 1000;
/** The during window ends 6 hours after the start, as the backend summarizes it. */
const DURING_MINUTES = 6 * 60;

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

/** An hour's start moved by some minutes, as an ISO string. */
const shifted = (hour: Hour, minutes: number) =>
  new Date(new Date(hour.time).getTime() + minutes * MINUTE_MS).toISOString();

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

  // The hour that contains the start opens the during window, which ends 6
  // hours after the start: 22:00 to 04:30 for a 22:30 start.
  const first = event.hours[0]!;
  const startHour = shifted(
    first,
    startHourOffset(event.hours) - first.offset_minutes,
  );
  const end = shifted(first, DURING_MINUTES - first.offset_minutes);
  const label = (title: string, from: string, to: string) =>
    t("statsWeatherRange")
      .replace("{0}", title)
      .replace("{1}", formatTime(from))
      .replace("{2}", formatTime(to));

  return (
    <div className="space-y-3">
      <div className={headlineGrid(EVENT_CARDS)}>
        <WindowStat
          label={label(t("statsWeatherBefore"), first.time, startHour)}
          summary={event.before}
        />
        <WindowStat
          label={label(t("statsWeatherDuring"), startHour, end)}
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
