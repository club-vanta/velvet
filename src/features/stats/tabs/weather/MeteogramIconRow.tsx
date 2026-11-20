import type { components } from "@/api/types";
import { WeatherIcon } from "@/components/WeatherIcon";
import { Y_AXIS_WIDTH } from "./meteogramLayout";
import { weatherIcon } from "./weatherIcon";

type Hour = components["schemas"]["WeatherHourPublic"];

/**
 * One icon per hour over the plot area, still for viewers who ask for less
 * motion. Decorative: the text table names each hour's weather.
 */
export function MeteogramIconRow({ hours }: { hours: Hour[] }) {
  return (
    <div className="flex" style={{ paddingLeft: Y_AXIS_WIDTH }}>
      {hours.map((h) => {
        const icon = weatherIcon(h.weather_code, h.is_day);
        return (
          <div key={h.time} className="flex flex-1 justify-center">
            {icon ? (
              <WeatherIcon
                name={icon.name}
                data-cy="stats-weather-icon"
                className="size-7 sm:size-9"
              />
            ) : (
              <span className="size-7 sm:size-9" />
            )}
          </div>
        );
      })}
    </div>
  );
}
