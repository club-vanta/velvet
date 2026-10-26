import type { components } from "@/api/types";
import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useOrgMeetups } from "@/hooks/useOrgMeetups";
import { parseApiDateTime } from "@/lib/apiDateTime";
import { useOrg } from "@/lib/org";
import type { StatsQuery } from "@/lib/statsQuery";
import {
  DEFAULT_RANGE,
  addDays,
  isRangePreset,
  isValidDay,
  localDay,
  resolveRange,
  type RangePreset,
} from "./statsPeriod";
import { isStatsTab, type StatsTab } from "./statsTabs";

type Meetup = components["schemas"]["MeetupPublic"];

type OfferedEvent = { meetup: Meetup; date: Date };

type CustomRange = { from: string; to: string };

/** Range shown when "custom" is picked from "all time", which has no bounds. */
const CUSTOM_SEED_FROM_ALL: RangePreset = "3m";

/**
 * The stats filters, kept in the URL so a view can be shared and survives a
 * reload. A missing, unknown, or malformed `range` falls back to the default.
 */
export function useStatsFilters() {
  const { activeOrg } = useOrg();
  const meetups = useOrgMeetups(activeOrg?.org_id ?? "");
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

  const tabParam = searchParams.get("tab");
  const tab: StatsTab = isStatsTab(tabParam) ? tabParam : "attendance";

  const range = resolveRange(preset, today, custom);

  // Finalized events inside the period: what the event filter offers.
  const events: OfferedEvent[] = (meetups.data?.meetups ?? [])
    .filter((m) => m.is_finalized)
    .map((m) => ({ meetup: m, date: parseApiDateTime(m.date) }))
    .filter(({ date }) => {
      const day = localDay(date);
      return (
        (!range.from || day >= range.from) && (!range.to || day < range.to)
      );
    })
    .sort((a, b) => b.date.getTime() - a.date.getTime());

  // The URL param only counts once it is known to be one of the offered
  // events. A failed meetups request proves nothing, so the param stays.
  const meetupParam = searchParams.get("meetup") || undefined;
  const meetupId = events.some((e) => e.meetup.id === meetupParam)
    ? meetupParam
    : undefined;
  const staleMeetup = meetups.isSuccess && meetupParam && !meetupId;

  // null while the events are unknown, so a stats query waits for them.
  const query: StatsQuery | null =
    meetupParam && !meetups.isSuccess
      ? null
      : { ...range, ...(meetupId && { meetupId }) };

  /** A filter the user picked: a new history entry, so Back undoes it. */
  function update(
    change: (next: URLSearchParams) => void,
    options?: { replace: boolean },
  ) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      change(next);
      return next;
    }, options);
  }

  useEffect(() => {
    if (staleMeetup) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete("meetup");
          return next;
        },
        { replace: true },
      );
    }
  }, [staleMeetup, setSearchParams]);

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

  /**
   * A typed `from` past `to` moves `to` along, and the reverse. Each date pick
   * replaces the entry, so Back leaves the custom range instead of undoing
   * one keystroke at a time.
   */
  function setCustom(r: CustomRange, changed: keyof CustomRange) {
    const clamped =
      r.from <= r.to
        ? r
        : changed === "from"
          ? { from: r.from, to: r.from }
          : { from: r.to, to: r.to };
    update((next) => writePeriod(next, "custom", clamped), { replace: true });
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
    events,
    tab,
    query,
    /** The events behind a selected event could not be loaded. */
    eventsFailed: !!meetupParam && meetups.isError,
    retryEvents: () => void meetups.refetch(),
    setPreset,
    setCustom,
    setMeetupId,
    setTab,
  };
}
