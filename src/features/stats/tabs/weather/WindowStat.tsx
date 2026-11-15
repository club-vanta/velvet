import type { components } from "@/api/types";
import { formatDecimal } from "@/lib/format";
import { useLanguage } from "@/lib/i18n";
import { HeadlineStat } from "../../components/HeadlineStat";

/** The fields a before or during summary share. */
type WindowSummary = Pick<
  components["schemas"]["WeatherWindowPublic"],
  | "avg_temperature"
  | "avg_apparent_temperature"
  | "total_precipitation_mm"
  | "rained"
>;

/** One window's rain as the big value and its temperatures under it. */
export function WindowStat({
  label,
  summary,
  "data-cy": dataCy,
}: {
  label: string;
  summary: WindowSummary | null;
  "data-cy": string;
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

  return (
    <HeadlineStat
      data-cy={dataCy}
      label={label}
      value={value}
      subline={subline}
    />
  );
}
