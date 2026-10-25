import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Scatter,
  ScatterChart,
  XAxis,
  YAxis,
} from "recharts";
import type { components } from "@/api/types";
import { WeatherDetails } from "@/components/WeatherDetails";
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart";
import { StatCard } from "@/components/StatCard";
import { StatsNote } from "@/components/StatsNote";
import { useWeatherStats } from "@/hooks/useWeatherStats";
import { parseApiDateTime } from "@/lib/apiDateTime";
import { formatDate } from "@/lib/format";
import { useLanguage, type TranslationKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { ChartCard } from "./ChartCard";
import { HeadlineStat } from "./HeadlineStat";
import { headlineGrid } from "./headlineGrid";
import { RateCell } from "./RateCell";
import { StatsEmptyState, StatsTabGate } from "./StatsTabState";
import { formatCount, formatRate, sortByDate } from "./statsFormat";
import type { StatsTabProps } from "./statsTab";

type Weather = components["schemas"]["WeatherStatsPublic"];
type Row = components["schemas"]["WeatherMeetupRowPublic"];
type Band = components["schemas"]["TemperatureBandRowPublic"];
type Group = components["schemas"]["WeatherGroupPublic"];
type Event = components["schemas"]["WeatherEventPublic"];

const BAND_LABEL: Record<Band["band"], TranslationKey> = {
  BELOW_10: "statsBandBelow10",
  FROM_10_TO_15: "statsBandFrom10",
  FROM_15_TO_20: "statsBandFrom15",
  FROM_20_TO_25: "statsBandFrom20",
  FROM_25: "statsBandFrom25",
};

const LINK_CLASS =
  "min-w-0 rounded-sm font-medium break-words underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50";

/** Fewer points than this and a scatter says nothing. */
const MIN_POINTS = 2;

const roundAverage = (value: number | null) =>
  value === null ? null : Math.round(value);

type Point = {
  name: string;
  date: string;
  temperature: number;
  attended: number;
};

/** One point per meetup with a temperature, in date order. */
function scatterPoints(meetups: Row[]): Point[] {
  return sortByDate(meetups).flatMap((m) =>
    m.avg_temperature === null
      ? []
      : [
          {
            name: m.name,
            date: m.date,
            temperature: m.avg_temperature,
            attended: m.attended,
          },
        ],
  );
}

const hasNoWeather = (m: Row) =>
  m.avg_temperature === null &&
  m.rained === null &&
  m.total_precipitation_mm === null;

/** A rainy or dry group: its average turnout, with its no-show rate under it. */
function GroupStat({ label, group }: { label: string; group: Group }) {
  const { t, lang } = useLanguage();
  return (
    <HeadlineStat
      label={label}
      value={formatCount(roundAverage(group.avg_attended), lang)}
      subline={
        group.no_show_rate === null
          ? undefined
          : t("statsNoShowLine").replace(
              "{0}",
              formatRate(group.no_show_rate, lang),
            )
      }
      n={group.avg_attended === null ? undefined : group.events}
    />
  );
}

function TooltipBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid gap-1 rounded-lg border bg-background px-2.5 py-1.5 text-xs shadow-xl">
      {children}
    </div>
  );
}

function BandsChart({ rows }: { rows: Band[] }) {
  const { t, lang } = useLanguage();
  const config: ChartConfig = {
    avg_attended: { label: t("statsAvgAttended"), color: "var(--chart-1)" },
  };
  const data = rows.map((r) => ({
    label: t(BAND_LABEL[r.band]),
    // An empty band leaves its slot empty instead of drawing a zero.
    avg_attended: r.avg_attended === null ? null : roundAverage(r.avg_attended),
    events: r.events,
  }));

  return (
    <ChartContainer config={config} className="aspect-auto h-56 w-full">
      <BarChart data={data}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} />
        <YAxis
          width={32}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <ChartTooltip
          content={({ active, payload }) => {
            const item = payload?.[0]?.payload as
              | (typeof data)[number]
              | undefined;
            if (!active || !item) return null;
            return (
              <TooltipBox>
                <p className="font-medium">{item.label}</p>
                <p className="tabular-nums">
                  {t("statsAvgAttended")}:{" "}
                  {formatCount(item.avg_attended, lang)}
                </p>
                <p className="tabular-nums text-muted-foreground">
                  {t("statsEvents")}: {formatCount(item.events, lang)}
                </p>
              </TooltipBox>
            );
          }}
        />
        <Bar dataKey="avg_attended" fill="var(--color-avg_attended)" />
      </BarChart>
    </ChartContainer>
  );
}

/** The chart's numbers for screen readers and anyone who cannot hover. */
function BandsTable({
  rows,
  labelledBy,
}: {
  rows: Band[];
  labelledBy: string;
}) {
  const { t, lang } = useLanguage();
  const head = "py-1.5 text-xs font-medium text-muted-foreground";

  return (
    <table
      aria-labelledby={labelledBy}
      className="mt-3 w-full text-sm tabular-nums"
    >
      <thead>
        <tr className="border-b">
          <th scope="col" className={cn(head, "text-left")}>
            {t("statsBandHeader")}
          </th>
          <th scope="col" className={cn(head, "text-right")}>
            {t("statsEvents")}
          </th>
          <th scope="col" className={cn(head, "text-right")}>
            {t("statsAvgAttended")}
          </th>
          <th scope="col" className={cn(head, "text-right")}>
            {t("statsNoShowRate")}
          </th>
        </tr>
      </thead>
      <tbody className="divide-y">
        {rows.map((r) => (
          <tr key={r.band}>
            <th
              scope="row"
              data-slot="band"
              className="py-1.5 text-left font-normal"
            >
              {t(BAND_LABEL[r.band])}
            </th>
            <td data-slot="events" className="py-1.5 text-right">
              {formatCount(r.events, lang)}
            </td>
            <td data-slot="avg" className="py-1.5 text-right">
              {formatCount(roundAverage(r.avg_attended), lang)}
            </td>
            <RateCell rate={r.no_show_rate} n={r.events} />
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function TemperatureScatter({ points }: { points: Point[] }) {
  const { t, lang } = useLanguage();
  const config: ChartConfig = {
    attended: { label: t("statsAttended"), color: "var(--chart-1)" },
  };

  return (
    <ChartContainer config={config} className="aspect-auto h-64 w-full">
      <ScatterChart>
        <CartesianGrid />
        <XAxis
          type="number"
          dataKey="temperature"
          name={t("statsTemperatureAxis")}
          domain={["auto", "auto"]}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          type="number"
          dataKey="attended"
          name={t("statsAttended")}
          width={32}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <ChartTooltip
          cursor={false}
          content={({ active, payload }) => {
            const point = payload?.[0]?.payload as Point | undefined;
            if (!active || !point) return null;
            return (
              <TooltipBox>
                <p className="font-medium">{point.name}</p>
                <p className="text-muted-foreground">
                  {formatDate(parseApiDateTime(point.date).toISOString())}
                </p>
                <p className="tabular-nums">
                  {t("statsTemperatureAxis")}:{" "}
                  {point.temperature.toLocaleString(lang)}
                </p>
                <p className="tabular-nums">
                  {t("statsAttended")}: {formatCount(point.attended, lang)}
                </p>
              </TooltipBox>
            );
          }}
        />
        <Scatter data={points} fill="var(--color-attended)" />
      </ScatterChart>
    </ChartContainer>
  );
}

/** Events that have no weather yet, each linked to its page. */
function WithoutWeatherList({ meetups }: { meetups: Row[] }) {
  return (
    <ul className="divide-y text-sm">
      {meetups.map((m) => (
        <li
          key={m.meetup_id}
          className="flex flex-wrap items-baseline justify-between gap-x-3 py-1.5"
        >
          <Link
            to={`/meetups/${m.meetup_id}`}
            data-slot="name"
            className={LINK_CLASS}
          >
            {m.name}
          </Link>
          <span data-slot="date" className="text-muted-foreground tabular-nums">
            {formatDate(parseApiDateTime(m.date).toISOString())}
          </span>
        </li>
      ))}
    </ul>
  );
}

function WeatherAggregate({ data }: { data: Weather }) {
  const { t, lang } = useLanguage();
  const { meetups, rainy, dry, temperature_bands, without_weather } = data;
  if (meetups.length === 0) {
    return <StatsEmptyState />;
  }

  const points = scatterPoints(meetups);
  const missing = sortByDate(meetups.filter(hasNoWeather));

  return (
    <div className="space-y-3">
      <div className={headlineGrid(3)}>
        {rainy && <GroupStat label={t("statsRainy")} group={rainy} />}
        {dry && <GroupStat label={t("statsDryEvents")} group={dry} />}
        <HeadlineStat
          label={t("statsWithoutWeather")}
          value={formatCount(without_weather, lang)}
        />
      </div>
      <StatsNote>{t("statsNoteWeather")}</StatsNote>
      <StatsNote>{t("statsNoteWeatherSample")}</StatsNote>
      <ChartCard title={t("statsTempBands")}>
        {(headingId) => (
          <>
            <BandsChart rows={temperature_bands} />
            <BandsTable rows={temperature_bands} labelledBy={headingId} />
          </>
        )}
      </ChartCard>
      <ChartCard title={t("statsTempVsAttendance")}>
        {points.length < MIN_POINTS ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {t("statsNoTempPoints")}
          </p>
        ) : (
          <TemperatureScatter points={points} />
        )}
      </ChartCard>
      {missing.length > 0 && (
        <ChartCard title={t("statsWithoutWeatherList")}>
          <WithoutWeatherList meetups={missing} />
        </ChartCard>
      )}
    </div>
  );
}

function WeatherEvent({ event }: { event: Event }) {
  const { t, lang } = useLanguage();

  return (
    <div className="space-y-3">
      <div className={headlineGrid(2)}>
        <HeadlineStat
          label={t("statsAttended")}
          value={formatCount(event.attended, lang)}
        />
        <HeadlineStat
          label={t("statsNoShowRate")}
          value={formatRate(event.no_show_rate, lang)}
        />
      </div>
      <StatCard title={t("weatherTitle")}>
        {/* Stats are read-only, so the advice is the one for staff. */}
        <WeatherDetails
          status={event.status}
          weather={event.weather}
          canSetLocation={false}
        />
      </StatCard>
      <StatsNote>{t("statsNoteWeather")}</StatsNote>
    </div>
  );
}

export function WeatherTab({ orgId, query, onShowAll }: StatsTabProps) {
  const statsQ = useWeatherStats(orgId, query);
  const single = !!query?.meetupId;

  return (
    <StatsTabGate
      statsQ={statsQ}
      single={single}
      cards={single ? 2 : 3}
      testId="weather-skeleton"
      onShowAll={onShowAll}
    >
      {(data) =>
        data.event ? (
          <WeatherEvent event={data.event} />
        ) : (
          <WeatherAggregate data={data} />
        )
      }
    </StatsTabGate>
  );
}
