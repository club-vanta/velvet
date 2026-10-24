import { useSearchParams } from "react-router-dom";
import {
  DEFAULT_RANGE,
  addDays,
  isRangePreset,
  isValidDay,
  localDay,
  resolveRange,
  type RangePreset,
  type StatsQuery,
} from "./statsPeriod";

export type StatsTab = "attendance";

type CustomRange = { from: string; to: string };

/** Range shown when "custom" is picked from "all time", which has no bounds. */
const CUSTOM_SEED_FROM_ALL: RangePreset = "3m";

/**
 * The stats filters, kept in the URL so a view can be shared and survives a
 * reload. A missing, unknown, or malformed `range` falls back to the default.
 */
export function useStatsFilters() {
  const [searchParams, setSearchParams] = useSearchParams();
  // Once per render, so every range in this render shares one "today".
  const today = localDay(new Date());

  const rangeParam = searchParams.get("range");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const customValid = isValidDay(from) && isValidDay(to) && from <= to;

  let preset: RangePreset = isRangePreset(rangeParam)
    ? rangeParam
    : DEFAULT_RANGE;
  if (preset === "custom" && !customValid) preset = DEFAULT_RANGE;
  const custom: CustomRange | undefined =
    preset === "custom" && customValid ? { from, to } : undefined;

  const meetupId = searchParams.get("meetup") ?? undefined;
  const tab: StatsTab = "attendance";

  const range = resolveRange(preset, today, custom);
  const query: StatsQuery = { ...range, ...(meetupId && { meetupId }) };

  function update(change: (next: URLSearchParams) => void) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        change(next);
        return next;
      },
      { replace: true },
    );
  }

  /** A new period drops the event, which may sit outside it. */
  function writePeriod(next: URLSearchParams, p: RangePreset, c?: CustomRange) {
    next.set("range", p);
    next.delete("meetup");
    if (c) {
      next.set("from", c.from);
      next.set("to", c.to);
    } else {
      next.delete("from");
      next.delete("to");
    }
  }

  function setPreset(p: RangePreset) {
    update((next) => {
      if (p !== "custom") return writePeriod(next, p);
      // Seed with what is on screen, with the inclusive end the pickers use.
      const shown =
        preset === "all" ? resolveRange(CUSTOM_SEED_FROM_ALL, today) : range;
      writePeriod(next, p, {
        from: shown.from ?? today,
        to: shown.to ? addDays(shown.to, -1) : today,
      });
    });
  }

  function setCustom(r: CustomRange) {
    update((next) => writePeriod(next, "custom", r));
  }

  function setMeetupId(id?: string) {
    update((next) => {
      if (id) next.set("meetup", id);
      else next.delete("meetup");
    });
  }

  function setTab(t: StatsTab) {
    update((next) => next.set("tab", t));
  }

  return {
    preset,
    custom,
    meetupId,
    tab,
    query,
    setPreset,
    setCustom,
    setMeetupId,
    setTab,
  };
}
