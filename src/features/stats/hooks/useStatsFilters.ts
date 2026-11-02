import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useOrgMeetups } from "@/domain/meetup";
import { useOrg } from "@/domain/session";
import type { StatsQuery } from "@/api/statsQuery";
import {
  clampCustom,
  customSeed,
  localDay,
  parsePeriod,
  resolveRange,
  type CustomRange,
  type RangePreset,
} from "../lib/statsPeriod";
import { offeredEvents } from "../lib/offeredEvents";
import { isStatsTab, type StatsTab } from "../statsTabs";

/**
 * The stats filters, kept in the URL so a view can be shared and survives a
 * reload.
 */
export function useStatsFilters() {
  const { activeOrg } = useOrg();
  const meetups = useOrgMeetups(activeOrg?.org_id ?? "");
  const [searchParams, setSearchParams] = useSearchParams();
  // Once per render, so every range in this render shares one "today".
  const today = localDay(new Date());

  const period = parsePeriod(
    searchParams.get("range"),
    searchParams.get("from"),
    searchParams.get("to"),
  );
  const { preset } = period;
  const custom = period.preset === "custom" ? period.custom : undefined;

  const tabParam = searchParams.get("tab");
  const tab: StatsTab = isStatsTab(tabParam) ? tabParam : "attendance";

  const range = resolveRange(preset, today, custom);

  // Finalized events inside the period: what the event filter offers.
  const events = offeredEvents(meetups.data?.meetups ?? [], range);

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
      writePeriod(next, p, customSeed(preset, today, custom));
    });
  }

  /**
   * A typed `from` past `to` moves `to` along, and the reverse. Each date pick
   * replaces the entry, so Back leaves the custom range instead of undoing
   * one keystroke at a time.
   */
  function setCustom(r: CustomRange, changed: keyof CustomRange) {
    update((next) => writePeriod(next, "custom", clampCustom(r, changed)), {
      replace: true,
    });
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
    /** The picked period by name, for text such as "the last 3 months". */
    period,
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
