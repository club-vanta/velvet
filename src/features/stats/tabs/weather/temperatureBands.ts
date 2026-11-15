import type { components } from "@/api/types";
import type { TranslationKey } from "@/lib/i18n";
import { sortByDate } from "../../lib/statsFormat";

type Row = components["schemas"]["WeatherMeetupRowPublic"];
type Band = components["schemas"]["TemperatureBandRowPublic"];

/** Which temperature the charts use: the event itself, or the 3 hours before the start. */
export const WINDOWS = ["during", "before"] as const;

export type WeatherWindow = (typeof WINDOWS)[number];

export const BAND_LABEL: Record<Band["band"], TranslationKey> = {
  BELOW_10: "statsBandBelow10",
  FROM_10_TO_15: "statsBandFrom10",
  FROM_15_TO_20: "statsBandFrom15",
  FROM_20_TO_25: "statsBandFrom20",
  FROM_25: "statsBandFrom25",
};

/** A band's average attendance as a whole number of people. */
export const roundAverage = (value: number | null) =>
  value === null ? null : Math.round(value);

export type TemperaturePoint = {
  id: string;
  name: string;
  date: string;
  temperature: number;
  attended: number;
};

/** One point per meetup with a temperature in the window, in date order. */
export function scatterPoints(
  meetups: Row[],
  weatherWindow: WeatherWindow,
): TemperaturePoint[] {
  return sortByDate(meetups).flatMap((m) => {
    const temperature =
      weatherWindow === "before" ? m.before_avg_temperature : m.avg_temperature;
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
