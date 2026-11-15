import { describe, expect, it } from "vitest";
import { makeWeatherMeetupRow } from "@/tests/factories";
import { roundAverage, scatterPoints } from "./temperatureBands";

describe("scatterPoints", () => {
  const meetups = [
    makeWeatherMeetupRow({
      meetup_id: "m-mar",
      name: "Alter Marzo",
      date: "2026-03-10T01:00:00Z",
      attended: 100,
      avg_temperature: 18.2,
      before_avg_temperature: 21.6,
    }),
    makeWeatherMeetupRow({
      meetup_id: "m-feb",
      name: "Alter Febrero",
      date: "2026-02-10T01:00:00Z",
      attended: 90,
      avg_temperature: 25.4,
      before_avg_temperature: null,
    }),
  ];

  it("plots the temperature during each event, in date order", () => {
    expect(scatterPoints(meetups, "during")).toEqual([
      {
        id: "m-feb",
        name: "Alter Febrero",
        date: "2026-02-10T01:00:00Z",
        temperature: 25.4,
        attended: 90,
      },
      {
        id: "m-mar",
        name: "Alter Marzo",
        date: "2026-03-10T01:00:00Z",
        temperature: 18.2,
        attended: 100,
      },
    ]);
  });

  it("plots the temperature before the start, leaving out events without one", () => {
    expect(
      scatterPoints(meetups, "before").map((p) => [p.id, p.temperature]),
    ).toEqual([["m-mar", 21.6]]);
  });
});

describe("roundAverage", () => {
  it("rounds to whole people and keeps a missing average missing", () => {
    expect(roundAverage(95.5)).toBe(96);
    expect(roundAverage(null)).toBeNull();
  });
});
