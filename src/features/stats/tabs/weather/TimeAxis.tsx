import { XAxis } from "recharts";
import type { components } from "@/api/types";
import { formatTime } from "@/lib/format";
import type { Domain } from "./meteogramData";

type Hour = components["schemas"]["WeatherHourPublic"];

/** The x axis of a strip: the shared domain, a tick per hour, labels only on the last strip. */
export function TimeAxis({
  domain,
  hours,
  labelled,
}: {
  domain: Domain;
  hours: Hour[];
  labelled: boolean;
}) {
  const label = new Map(
    hours.map((h) => [h.offset_minutes, formatTime(h.time)]),
  );
  return (
    <XAxis
      type="number"
      dataKey="x"
      domain={domain}
      allowDataOverflow
      ticks={hours.map((h) => h.offset_minutes)}
      tickFormatter={(offset: number) => label.get(offset) ?? ""}
      tickLine={false}
      axisLine={labelled}
      hide={!labelled}
      interval={0}
    />
  );
}
