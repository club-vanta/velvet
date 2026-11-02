import type { components } from "@/api/types";
import { StatsNote } from "@/components/StatsNote";
import { formatApiDate, formatDecimal } from "@/lib/format";
import { useLanguage } from "@/lib/i18n";
import { ChartCard } from "../../components/ChartCard";
import { ChartEmptyNote } from "../../components/ChartEmptyNote";
import { ChartTextTable } from "../../components/ChartTextTable";
import { StatsEmptyState } from "../../components/StatsEmptyState";
import { ViewToggle } from "../../components/ViewToggle";
import { useUrlView } from "../../hooks/useUrlView";
import { formatCount } from "../../lib/statsFormat";
import { BandsChart } from "./BandsChart";
import { BandsTable } from "./BandsTable";
import { TemperatureScatter } from "./TemperatureScatter";
import { scatterPoints, WINDOWS } from "./temperatureBands";

type Weather = components["schemas"]["WeatherStatsPublic"];

/** Fewer points than this and a scatter says nothing. */
const MIN_POINTS = 2;

/** The weather of a period: attendance by temperature band and per event. */
export function WeatherAggregate({ data }: { data: Weather }) {
  const { t, lang } = useLanguage();
  const [weatherWindow, setWeatherWindow] = useUrlView(
    "weather_window",
    WINDOWS,
    "during",
  );
  const { meetups } = data;
  if (meetups.length === 0) {
    return <StatsEmptyState />;
  }

  const points = scatterPoints(meetups, weatherWindow);
  const bands =
    weatherWindow === "before"
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
        value={weatherWindow}
        onChange={setWeatherWindow}
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
            <ChartEmptyNote>{t("statsNoTempPoints")}</ChartEmptyNote>
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
