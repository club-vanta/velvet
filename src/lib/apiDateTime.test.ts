import { describe, expect, it } from "vitest";
import { parseApiDateTime } from "./apiDateTime";

const INSTANT = Date.UTC(2026, 3, 5, 1, 30);

describe("parseApiDateTime", () => {
  it("reads a naive datetime as UTC", () => {
    expect(parseApiDateTime("2026-04-05T01:30:00").getTime()).toBe(INSTANT);
  });

  it("keeps a Z suffix", () => {
    expect(parseApiDateTime("2026-04-05T01:30:00Z").getTime()).toBe(INSTANT);
    expect(parseApiDateTime("2026-04-05T01:30:00z").getTime()).toBe(INSTANT);
  });

  it("keeps an explicit offset", () => {
    expect(parseApiDateTime("2026-04-04T22:30:00-03:00").getTime()).toBe(
      INSTANT,
    );
    expect(parseApiDateTime("2026-04-05T03:30:00+02:00").getTime()).toBe(
      INSTANT,
    );
  });
});
