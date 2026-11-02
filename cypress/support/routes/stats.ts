// Stub sets and readers for the stats page (/stats) and its tabs, shared by
// the E2E specs in e2e/stats/ and the stats component specs.
import {
  makeArrivalStats,
  makeAttendanceStats,
  makeDemographicStats,
  makeGuest,
  makeMeetup,
  makeNoShowStats,
  makeOperationsStats,
  makeRetentionStats,
  makeWeatherStats,
} from "../../../src/tests/factories";
import type { Schema } from "../../../src/tests/factories";

type StubExtras = { statusCode?: number; delay?: number };

/**
 * The day every stats spec runs on: Apr 15, 2026, noon local time. The
 * default period (the last 3 months) is then Jan 15 to Apr 15.
 */
export const STATS_TODAY = new Date(2026, 3, 15, 12);

/** The default period as the API receives it: `to` is exclusive. */
export const LAST_3_MONTHS = { from: "2026-01-15", to: "2026-04-16" };

/** Freezes the date (not the timers) on STATS_TODAY. Call before visiting. */
export function freezeStatsToday(): void {
  cy.clock(STATS_TODAY.getTime(), ["Date"]);
}

/**
 * The org's meetups: two finalized ones inside the default period, one
 * still open, and one finalized before the period.
 */
export const STATS_MEETUPS = [
  makeMeetup({
    id: "m-april",
    name: "Alter Abril",
    date: "2026-04-04T23:00:00Z",
    is_finalized: true,
  }),
  makeMeetup({
    id: "m-open",
    name: "Alter Abierto",
    date: "2026-03-20T23:00:00Z",
  }),
  makeMeetup({
    id: "m-march",
    name: "Alter Marzo",
    date: "2026-03-10T23:00:00Z",
    is_finalized: true,
  }),
  makeMeetup({
    id: "m-old",
    name: "Alter Viejo",
    date: "2025-11-01T23:00:00Z",
    is_finalized: true,
  }),
];

/**
 * The stats page title, once the page is there. App lazy-loads the page in
 * its own chunk (it carries recharts), which the dev server builds on the
 * first visit of a run, so this waits longer than a plain query.
 */
export function statsTitle() {
  return cy.getByRole("heading", { name: "Statistics", timeout: 20000 });
}

/**
 * Opens `path` signed in as an org admin on the stats day, with the org's
 * meetups stubbed. Stub the tabs' requests before calling it.
 */
export function visitStats(path = "/stats"): void {
  cy.loginAs("orgAdmin");
  freezeStatsToday();
  stubStatsMeetups();
  cy.visit(path);
  statsTitle();
}

/** Picks `option` (its data-cy) from the period or event select. */
export function pick(select: "stats-period" | "stats-event", option: string) {
  cy.getBySel(select).click();
  cy.getBySel(option).click();
}

/** The meetups the event filter picks from, as `@getMeetups`. */
export function stubStatsMeetups(meetups = STATS_MEETUPS) {
  return cy
    .stubApi("GET", "/organizations/{org_id}/meetups/", {
      body: { total: meetups.length, meetups },
    })
    .as("getMeetups");
}

export function stubAttendance(
  body: Schema<"AttendanceStatsPublic"> = makeAttendanceStats(),
  extras: StubExtras = {},
) {
  return cy
    .stubApi("GET", "/organizations/{org_id}/stats/attendance", {
      body,
      ...extras,
    })
    .as("getAttendance");
}

export function stubArrivals(
  body: Schema<"ArrivalStatsPublic"> = makeArrivalStats(),
  extras: StubExtras = {},
) {
  return cy
    .stubApi("GET", "/organizations/{org_id}/stats/arrivals", {
      body,
      ...extras,
    })
    .as("getArrivals");
}

export function stubNoShows(
  body: Schema<"NoShowStatsPublic"> = makeNoShowStats(),
  extras: StubExtras = {},
) {
  return cy
    .stubApi("GET", "/organizations/{org_id}/stats/no-shows", {
      body,
      ...extras,
    })
    .as("getNoShows");
}

export function stubDemographics(
  body: Schema<"DemographicStatsPublic"> = makeDemographicStats(),
  extras: StubExtras = {},
) {
  return cy
    .stubApi("GET", "/organizations/{org_id}/stats/demographics", {
      body,
      ...extras,
    })
    .as("getDemographics");
}

export function stubRetention(
  body: Schema<"RetentionStatsPublic"> = makeRetentionStats(),
  extras: StubExtras = {},
) {
  return cy
    .stubApi("GET", "/organizations/{org_id}/stats/retention", {
      body,
      ...extras,
    })
    .as("getRetention");
}

export function stubOperations(
  body: Schema<"OperationsStatsPublic"> = makeOperationsStats(),
  extras: StubExtras = {},
) {
  return cy
    .stubApi("GET", "/organizations/{org_id}/stats/operations", {
      body,
      ...extras,
    })
    .as("getOperations");
}

export function stubWeather(
  body: Schema<"WeatherStatsPublic"> = makeWeatherStats(),
  extras: StubExtras = {},
) {
  return cy
    .stubApi("GET", "/organizations/{org_id}/stats/weather", {
      body,
      ...extras,
    })
    .as("getWeather");
}

/**
 * The requests of a guest's page, where the stats link to: the guest, the
 * name history, the org's meetups of the guest and the org's ban list.
 */
export function stubGuestPage(guestId: string, displayname: string): void {
  cy.stubApi("GET", "/guests/{guest_id}", {
    params: { guest_id: guestId },
    body: makeGuest({ id: guestId, displayname }),
  }).as("getGuest");
  cy.stubApi("GET", "/guests/{guest_id}/displayname-history", {
    body: { total: 0, history: [] },
  });
  cy.stubApi("GET", "/organizations/{org_id}/guests/{guest_id}/meetups", {
    body: {
      total: 0,
      summary: {
        attended: 0,
        walkin: 0,
        no_show: 0,
        cancelled: 0,
        upcoming: 0,
      },
      meetups: [],
    },
  });
  cy.stubApi("GET", "/organizations/{org_id}/guests/banned", {
    body: { total: 0, guests: [] },
  });
}

/** Every stats endpoint with its default payload, for flows that switch tabs. */
export function stubAllStats(): void {
  stubAttendance();
  stubArrivals();
  stubNoShows();
  stubDemographics();
  stubRetention();
  stubOperations();
  stubWeather();
}

/** The query string `alias` was requested with, as an object. */
export function requestQuery(alias: `@${string}`) {
  return cy
    .wait(alias)
    .its("request.url")
    .then((url: string) => Object.fromEntries(new URL(url).searchParams));
}

type HeadlinePart = "label" | "value" | "subline" | "comparison" | "sample";

/**
 * Checks the parts of the headline card `stats-headline-<name>`: a string
 * is its exact text, null means the card has no such part.
 */
export function shouldShowHeadline(
  name: string,
  parts: Partial<Record<HeadlinePart, string | null>>,
): void {
  cy.getBySel(`stats-headline-${name}`).within(() => {
    for (const [part, text] of Object.entries(parts)) {
      if (text === null) {
        cy.getBySel(`stats-headline-${part}`).should("not.exist");
      } else {
        cy.getBySel(`stats-headline-${part}`).should("have.text", text);
      }
    }
  });
}

/** Each row of a table as the text of its cells, header row included. */
export function tableText(table: HTMLTableElement): string[][] {
  return Array.from(table.rows, (row) =>
    Array.from(row.cells, (cell) => cell.textContent ?? ""),
  );
}

/** Checks every row of the table named `name` (header first), cell by cell. */
export function shouldHaveTable(name: string, rows: string[][]): void {
  cy.getByRole("table", { name }).should(($table) => {
    expect(tableText($table[0] as HTMLTableElement)).to.deep.equal(rows);
  });
}

/** Checks the text of every note (StatsNote) on screen, in order. */
export function shouldHaveNotes(notes: string[]): void {
  cy.getBySel("stats-note").should(($notes) => {
    expect($notes.toArray().map((n) => n.textContent)).to.deep.equal(notes);
  });
}

/**
 * Waits for the CSS entrance animations (cards rising, faces popping in) to
 * end, so an accessibility scan sees the final colours, not a fade.
 */
export function waitForAnimations(): void {
  cy.document().should((doc) => {
    const running = doc
      .getAnimations()
      .filter((animation) => animation.playState === "running");
    expect(running, "running animations").to.have.length(0);
  });
}
