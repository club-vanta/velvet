import { describe, expect, it } from "vitest";
import { makeMeetupWeather } from "@/tests/factories";
import { WINDY_KMH, weatherSummary } from "./weatherSummary";

const dry = (overrides: Parameters<typeof makeMeetupWeather>[0] = {}) =>
  makeMeetupWeather({ rained: false, total_precipitation_mm: 0, ...overrides });

describe("weatherSummary", () => {
  it.each([
    [5, "weatherNightCold"],
    [9.9, "weatherNightCold"],
    [10, "weatherNightCool"],
    [15, "weatherNightMild"],
    [20, "weatherNightWarm"],
    [24.9, "weatherNightWarm"],
    [25, "weatherNightHot"],
  ] as const)("names %f °C with the stats band %s", (temp, key) => {
    expect(weatherSummary(dry({ avg_temperature: temp })).parts[0]).toBe(key);
  });

  it("says whether it rained, then the wind when it is windy", () => {
    expect(
      weatherSummary(
        makeMeetupWeather({ avg_temperature: 18, max_wind_kmh: WINDY_KMH }),
      ),
    ).toEqual({
      icon: "rain",
      parts: ["weatherNightMild", "weatherWithRain", "weatherWithWind"],
    });
    expect(weatherSummary(dry({ avg_temperature: 18 })).parts).toEqual([
      "weatherNightMild",
      "weatherWithoutRain",
    ]);
  });

  it("leaves out the wind just below the threshold", () => {
    const { parts, icon } = weatherSummary(
      dry({ avg_temperature: 18, max_wind_kmh: WINDY_KMH - 0.1 }),
    );
    expect(parts).not.toContain("weatherWithWind");
    expect(icon).toBe("thermometer");
  });

  it("shows wind on a dry, windy night", () => {
    expect(
      weatherSummary(dry({ avg_temperature: 18, max_wind_kmh: 40 })).icon,
    ).toBe("wind");
  });

  it.each([
    [12, "thermometer-colder"],
    [17, "thermometer"],
    [22, "thermometer-warmer"],
  ] as const)("shows a thermometer for a calm dry %i °C", (temp, icon) => {
    expect(weatherSummary(dry({ avg_temperature: temp })).icon).toBe(icon);
  });

  it("drops a part whose value is missing", () => {
    expect(
      weatherSummary(dry({ avg_temperature: 18, rained: null })).parts,
    ).toEqual(["weatherNightMild"]);
  });

  it("has no words without a temperature, but still shows the rain", () => {
    expect(
      weatherSummary(makeMeetupWeather({ avg_temperature: null })),
    ).toEqual({ icon: "rain", parts: [] });
  });

  it("has nothing to show without any value", () => {
    expect(
      weatherSummary(
        makeMeetupWeather({
          avg_temperature: null,
          rained: null,
          max_wind_kmh: null,
        }),
      ),
    ).toEqual({ icon: null, parts: [] });
  });
});
