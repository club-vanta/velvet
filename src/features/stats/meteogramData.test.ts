import { describe, expect, it } from "vitest";
import type { components } from "@/api/types";
import {
  arrivalsInDomain,
  hourRows,
  meteogramDomain,
  startHourOffset,
} from "./meteogramData";

type Hour = components["schemas"]["WeatherHourPublic"];
type Bucket = components["schemas"]["ArrivalBucketPublic"];

function hour(offset: number, overrides: Partial<Hour> = {}): Hour {
  return {
    time: "2026-04-05T22:00:00Z",
    offset_minutes: offset,
    temperature: 12,
    apparent_temperature: 10,
    precipitation_mm: 0,
    weather_code: 3,
    is_day: false,
    ...overrides,
  };
}

const bucket = (start_minute: number, arrivals: number): Bucket => ({
  start_minute,
  arrivals,
});

describe("meteogramDomain", () => {
  it("runs from the first hour to the end of the last for a start on the hour", () => {
    const hours = [-180, -120, -60, 0, 60, 120, 180, 240, 300].map((o) =>
      hour(o),
    );
    expect(meteogramDomain(hours)).toEqual([-180, 360]);
  });

  it("keeps whole hours for a start at half past", () => {
    const hours = [-210, -150, -90, -30, 30, 90, 150, 210, 270, 330].map((o) =>
      hour(o),
    );
    expect(meteogramDomain(hours)).toEqual([-210, 390]);
  });
});

describe("startHourOffset", () => {
  it("is the hour that contains the start", () => {
    expect(startHourOffset([-120, -60, 0, 60].map((o) => hour(o)))).toBe(0);
    expect(startHourOffset([-90, -30, 30].map((o) => hour(o)))).toBe(-30);
  });
});

describe("arrivalsInDomain", () => {
  it("keeps buckets that start inside the domain and drops the rest", () => {
    const curve = [
      bucket(-240, 1),
      bucket(-210, 2),
      bucket(375, 3),
      bucket(390, 4),
    ];
    expect(arrivalsInDomain(curve, [-210, 390])).toEqual([
      bucket(-210, 2),
      bucket(375, 3),
    ]);
  });
});

describe("hourRows", () => {
  it("sums the four quarter hours of each hour", () => {
    const hours = [hour(-30), hour(30)];
    const curve = [
      bucket(-45, 9),
      bucket(-30, 1),
      bucket(-15, 2),
      bucket(0, 3),
      bucket(15, 4),
      bucket(30, 5),
    ];
    expect(hourRows(hours, curve).map((r) => r.arrivals)).toEqual([10, 5]);
  });

  it("leaves arrivals null when there is no curve", () => {
    expect(hourRows([hour(0)], null).map((r) => r.arrivals)).toEqual([null]);
  });
});
