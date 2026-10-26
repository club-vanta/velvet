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
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart";
import { StatsNote } from "@/components/StatsNote";
import { useWeatherStats } from "@/hooks/useWeatherStats";
import { formatApiDate, formatDecimal } from "@/lib/format";
import { useLanguage, type TranslationKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { ChartCard } from "./ChartCard";
import { BAR_END_UP } from "./chartMarks";
import { ChartTextTable } from "./ChartTextTable";
import { RateCell } from "./RateCell";
import { StatsEmptyState, StatsTabGate } from "./StatsTabState";
import { formatCount, sortByDate } from "./statsFormat";
import type { StatsTabProps } from "./statsTab";
import { useUrlView } from "./useUrlView";
import { ViewToggle } from "./ViewToggle";
import { EVENT_CARDS, WeatherEventView } from "./WeatherEventView";

type Weather = components["schemas"]["WeatherStatsPublic"];
type Row = components["schemas"]["WeatherMeetupRowPublic"];
type Band = components["schemas"]["TemperatureBandRowPublic"];

/** Which temperature the charts use: the 3 hours before the start, or the event itself. */
const WINDOWS = ["during", "before"] as const;
type WeatherWindow = (typeof WINDOWS)[number];

const BAND_LABEL: Record<Band["band"], TranslationKey> = {
  BELOW_10: "statsBandBelow10",
  FROM_10_TO_15: "statsBandFrom10",
  FROM_15_TO_20: "statsBandFrom15",
  FROM_20_TO_25: "statsBandFrom20",
  FROM_25: "statsBandFrom25",
};

/** Fewer points than this and a scatter says nothing. */
const MIN_POINTS = 2;

const roundAverage = (value: number | null) =>
  value === null ? null : Math.round(value);

type Point = {
  id: string;
  name: string;
  date: string;
  temperature: number;
  attended: number;
};

/** One point per meetup with a temperature in the window, in date order. */
function scatterPoints(meetups: Row[], window: WeatherWindow): Point[] {
  return sortByDate(meetups).flatMap((m) => {
    const temperature =
      window === "before" ? m.before_avg_temperature : m.avg_temperature;
    return temperature === null
      ? []
      : [
          {
            id: m.meetup_id,
            name: m.name,
            date: m.date,
            temperature,
            attended: m.attended,
          },
        ];
  });
}

// The charts use their own tooltip because ChartTooltipContent shows only the
// series value, not the events count or the meetup name and date.
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
        <Bar
          dataKey="avg_attended"
          fill="var(--color-avg_attended)"
          radius={BAR_END_UP}
        />
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
                  {formatApiDate(point.date)}
                </p>
                <p className="tabular-nums">
                  {t("statsTemperatureAxis")}:{" "}
                  {formatDecimal(point.temperature, lang)}
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

function WeatherAggregate({ data }: { data: Weather }) {
  const { t, lang } = useLanguage();
  const [window, setWindow] = useUrlView("weather_window", WINDOWS, "during");
  const { meetups } = data;
  if (meetups.length === 0) {
    return <StatsEmptyState />;
  }

  const points = scatterPoints(meetups, window);
  const bands =
    window === "before"
      ? data.temperature_bands_before
      : data.temperature_bands;

  return (
    <div className="space-y-3">
      <ViewToggle
        label={t("statsWeatherWindow")}
        options={[
          { value: "during", label: t("statsWeatherDuring") },
          { value: "before", label: t("statsWeatherBefore") },
        ]}
        value={window}
        onChange={setWindow}
      />
      <StatsNote>{t("statsNoteWeather")}</StatsNote>
      <StatsNote>{t("statsNoteWeatherSample")}</StatsNote>
      <ChartCard title={t("statsTempBands")}>
        {(headingId) => (
          <>
            <BandsChart rows={bands} />
            <BandsTable rows={bands} labelledBy={headingId} />
          </>
        )}
      </ChartCard>
      <ChartCard title={t("statsTempVsAttendance")}>
        {(headingId) =>
          points.length < MIN_POINTS ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {t("statsNoTempPoints")}
            </p>
          ) : (
            <>
              <TemperatureScatter points={points} />
              <ChartTextTable
                labelledBy={headingId}
                headers={[
                  t("statsEventHeader"),
                  t("statsDateHeader"),
                  t("statsTemperatureAxis"),
                  t("statsAttended"),
                ]}
                rows={points.map((p) => ({
                  key: p.id,
                  cells: [
                    p.name,
                    formatApiDate(p.date),
                    formatDecimal(p.temperature, lang),
                    formatCount(p.attended, lang),
                  ],
                }))}
              />
            </>
          )
        }
      </ChartCard>
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
      // The aggregate has no headline cards, only its charts.
      cards={single ? EVENT_CARDS : 0}
      testId="weather-skeleton"
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
