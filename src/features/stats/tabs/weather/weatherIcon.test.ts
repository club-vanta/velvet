import { describe, expect, it } from "vitest";
import { weatherIcon } from "./weatherIcon";

describe("weatherIcon", () => {
  it.each([
    [0, true, "clear-day", "weatherClear"],
    [0, false, "clear-night", "weatherClear"],
    [1, true, "partly-cloudy-day", "weatherPartlyCloudy"],
    [2, false, "partly-cloudy-night", "weatherPartlyCloudy"],
    [3, true, "overcast", "weatherOvercast"],
    [3, false, "overcast", "weatherOvercast"],
    [45, false, "fog", "weatherFog"],
    [48, true, "fog", "weatherFog"],
    [51, false, "drizzle", "weatherDrizzle"],
    [57, false, "drizzle", "weatherDrizzle"],
    [61, false, "rain", "weatherRain"],
    [65, false, "rain", "weatherRain"],
    [67, false, "rain", "weatherRain"],
    [80, true, "rain", "weatherRain"],
    [82, true, "rain", "weatherRain"],
    [71, false, "snow", "weatherSnow"],
    [77, false, "snow", "weatherSnow"],
    [86, false, "snow", "weatherSnow"],
    [95, false, "thunderstorms", "weatherStorm"],
    [99, false, "thunderstorms", "weatherStorm"],
  ] as const)("maps code %i (day %s) to %s", (code, isDay, name, label) => {
    expect(weatherIcon(code, isDay)).toEqual({ name, label });
  });

  it("treats an unknown day flag as night, since meetups happen at night", () => {
    expect(weatherIcon(0, null)).toEqual({
      name: "clear-night",
      label: "weatherClear",
    });
  });

  it("returns null without a code", () => {
    expect(weatherIcon(null, true)).toBeNull();
  });

  it("returns null for a code outside the WMO table", () => {
    expect(weatherIcon(42, true)).toBeNull();
  });
});
