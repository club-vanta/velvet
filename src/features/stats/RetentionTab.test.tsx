import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { LanguageProvider } from "@/lib/i18n";
import { RetentionTab } from "./RetentionTab";
import type { StatsTabProps } from "./statsTab";
import type { components } from "@/api/types";

const mockApiGet = vi.fn();
vi.mock("@/api/client", () => ({
  api: { GET: (...a: unknown[]) => mockApiGet(...a) },
}));

type Retention = components["schemas"]["RetentionStatsPublic"];
type Summary = components["schemas"]["RetentionSummaryPublic"];
type Lapsed = components["schemas"]["LapsedRegularPublic"];

const SUMMARY: Summary = {
  attendees: 120,
  new_guests: 49,
  returning: 71,
  new_share: 0.4083,
  first_timer_return_rate: 0.35,
};

const NOBODY: Summary = {
  attendees: 0,
  new_guests: 0,
  returning: 0,
  new_share: null,
  first_timer_return_rate: null,
};

const LAPSED: Lapsed[] = [
  {
    guest_id: "g-ana",
    displayname: "Ana",
    attended_before: 7,
    // 22:30 on Jan 9 in Buenos Aires.
    last_attended: "2026-01-10T01:30:00",
  },
  {
    guest_id: "g-beto",
    displayname: "Beto",
    attended_before: 3,
    last_attended: "2025-12-20T02:00:00Z",
  },
];

function stats(overrides: Partial<Retention> = {}): Retention {
  return {
    summary: SUMMARY,
    meetups: [
      {
        meetup_id: "m1",
        name: "Alter Marzo",
        date: "2026-03-10T01:00:00Z",
        new: 20,
        returning: 40,
      },
      {
        meetup_id: "m2",
        name: "Alter Abril",
        date: "2026-04-10T01:00:00Z",
        new: 0,
        returning: 0,
      },
    ],
    cohorts: [
      { month: "2026-02", size: 40, retention: [0.5, 0.25] },
      { month: "2026-03", size: 4, retention: [0.25] },
    ],
    frequency: [
      { bucket: "ONE", guests: 70 },
      { bucket: "TWO", guests: 30 },
      { bucket: "THREE_FIVE", guests: 15 },
      { bucket: "SIX_PLUS", guests: 5 },
    ],
    lapsed: LAPSED,
    lapsed_total: 5,
    comparison_kind: null,
    comparison: null,
    ...overrides,
  };
}

/** What the API sends for one event: only the summary. */
function eventStats(overrides: Partial<Retention> = {}): Retention {
  return stats({
    meetups: [],
    cohorts: [],
    frequency: [],
    lapsed: [],
    lapsed_total: null,
    ...overrides,
  });
}

const PERIOD = { from: "2026-01-15", to: "2026-04-16" };

function renderTab(props: Partial<StatsTabProps> = {}) {
  const onShowAll = vi.fn();
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <LanguageProvider>
        <MemoryRouter>
          <RetentionTab
            orgId="org-1"
            query={PERIOD}
            onShowAll={onShowAll}
            {...props}
          />
        </MemoryRouter>
      </LanguageProvider>
    </QueryClientProvider>,
  );
  return { onShowAll };
}

const ok = (data: Retention) => Promise.resolve({ data, error: undefined });
const respond = (result: unknown) =>
  mockApiGet.mockImplementation(() => result);

function headline(label: string): HTMLElement {
  const card = Array.from(
    document.querySelectorAll<HTMLElement>("[data-headline]"),
  ).find(
    (el) => el.querySelector('[data-slot="label"]')?.textContent === label,
  );
  if (!card) throw new Error(`No headline ${label}`);
  return card;
}

function slot(label: string, name: string): string | null {
  return (
    headline(label).querySelector(`[data-slot="${name}"]`)?.textContent ?? null
  );
}

function lapsedRow(name: string): HTMLElement {
  const row = screen.getByRole("link", { name }).closest("li");
  if (!row) throw new Error(`No lapsed row ${name}`);
  return row;
}

const part = (el: HTMLElement, name: string) =>
  el.querySelector(`[data-slot="${name}"]`)?.textContent ?? null;

const statsCalls = () =>
  mockApiGet.mock.calls.filter(
    ([path]) => path === "/organizations/{org_id}/stats/retention",
  );

const headlinesReady = () => waitFor(() => headline("Personas"));

const AGGREGATE_HEADINGS = [
  "Nuevas y conocidas por evento",
  "Cada cuánto vienen",
  "Cohortes",
  "Dejaron de venir",
];

describe("RetentionTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.stubEnv("TZ", "America/Argentina/Buenos_Aires");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("shows a skeleton while loading", () => {
    respond(new Promise(() => {}));
    renderTab();
    expect(screen.getByTestId("retention-skeleton")).toBeInTheDocument();
  });

  it("announces the error and retries the request", async () => {
    const user = userEvent.setup();
    respond(Promise.resolve({ data: undefined, error: { detail: "nope" } }));
    renderTab();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No se pudieron cargar las estadísticas.",
    );
    await user.click(screen.getByRole("button", { name: "Reintentar" }));
    await waitFor(() => expect(statsCalls()).toHaveLength(2));
  });

  it("shows the empty state when nobody attended in the period", async () => {
    respond(
      ok(
        stats({
          summary: NOBODY,
          meetups: [],
          cohorts: [],
          lapsed: [],
          lapsed_total: 0,
        }),
      ),
    );
    renderTab();
    expect(
      await screen.findByText("No hay eventos finalizados en este período"),
    ).toBeInTheDocument();
    expect(document.querySelector("[data-headline]")).toBeNull();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("shows the empty state when nobody attended the event", async () => {
    respond(ok(eventStats({ summary: NOBODY })));
    renderTab({ query: { meetupId: "m1" } });
    expect(
      await screen.findByText("No hay eventos finalizados en este período"),
    ).toBeInTheDocument();
    expect(document.querySelector("[data-headline]")).toBeNull();
  });

  it("shows exact headline values and compares with the previous period", async () => {
    respond(
      ok(
        stats({
          comparison_kind: "PREVIOUS_PERIOD",
          comparison: {
            ...SUMMARY,
            attendees: 100,
            first_timer_return_rate: 0.3,
          },
        }),
      ),
    );
    renderTab();
    await headlinesReady();
    expect(slot("Personas", "value")).toBe("120");
    expect(slot("Personas", "comparison")).toBe("+20% vs. período anterior");
    expect(slot("Primera vez", "value")).toBe("49");
    expect(slot("Primera vez", "comparison")).toBe("41% del total");
    expect(slot("Volvieron", "value")).toBe("35%");
    expect(slot("Volvieron", "comparison")).toBe("+5 pts vs. período anterior");
    expect(slot("Volvieron", "sample")).toBeNull();
  });

  it("formats the counts for the locale", async () => {
    respond(
      ok(
        stats({
          summary: { ...SUMMARY, attendees: 120000, new_guests: 49000 },
        }),
      ),
    );
    renderTab();
    await headlinesReady();
    expect(slot("Personas", "value")).toBe("120.000");
    expect(slot("Primera vez", "value")).toBe("49.000");
  });

  it("dims the return rate with n when there were few first-timers", async () => {
    respond(ok(stats({ summary: { ...SUMMARY, new_guests: 6 } })));
    renderTab();
    await headlinesReady();
    expect(slot("Volvieron", "sample")).toBe("n = 6");
  });

  it("shows dashes and no n when nobody came for the first time", async () => {
    respond(
      ok(
        stats({
          summary: {
            ...SUMMARY,
            new_guests: 0,
            returning: 120,
            new_share: 0,
            first_timer_return_rate: null,
          },
          cohorts: [],
        }),
      ),
    );
    renderTab();
    await headlinesReady();
    expect(slot("Primera vez", "value")).toBe("0");
    expect(slot("Volvieron", "value")).toBe("–");
    expect(slot("Volvieron", "sample")).toBeNull();
    expect(screen.queryByText("Cohortes")).not.toBeInTheDocument();
  });

  it("shows the aggregate sections for a period", async () => {
    respond(ok(stats()));
    renderTab();
    await headlinesReady();
    for (const heading of AGGREGATE_HEADINGS) {
      expect(screen.getByText(heading)).toBeInTheDocument();
    }
    expect(document.querySelector('[data-slot="event-came-back"]')).toBeNull();
  });

  it("shows only the headlines and the came-back line for one event", async () => {
    respond(
      ok(
        eventStats({
          comparison_kind: "PERIOD_AVERAGE",
          comparison: {
            ...SUMMARY,
            attendees: 4000,
            first_timer_return_rate: 0.3,
          },
        }),
      ),
    );
    renderTab({ query: { meetupId: "m1" } });
    await headlinesReady();
    expect(slot("Personas", "comparison")).toBeNull();
    expect(slot("Primera vez", "comparison")).toBe("41% del total");
    expect(slot("Volvieron", "comparison")).toBe("+5 pts vs. el período");
    expect(
      document.querySelector('[data-slot="event-came-back"]')?.textContent,
    ).toBe("De quienes vinieron por primera vez, volvieron 35%");
    for (const heading of AGGREGATE_HEADINGS) {
      expect(screen.queryByText(heading)).not.toBeInTheDocument();
    }
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("leaves out the came-back line when the event had no first-timers", async () => {
    respond(
      ok(
        eventStats({
          summary: {
            ...SUMMARY,
            new_guests: 0,
            new_share: 0,
            first_timer_return_rate: null,
          },
        }),
      ),
    );
    renderTab({ query: { meetupId: "m1" } });
    await headlinesReady();
    expect(document.querySelector('[data-slot="event-came-back"]')).toBeNull();
  });

  it("names the cohort table after its card and scrolls only the table", async () => {
    respond(ok(stats()));
    renderTab();
    await headlinesReady();
    const table = screen.getByRole("table", { name: "Cohortes" });
    expect(table.parentElement).toHaveClass("overflow-x-auto");
    expect(within(table).getAllByRole("row")).toHaveLength(3);
  });

  it("links each lapsed regular to their guest page", async () => {
    respond(ok(stats()));
    renderTab();
    await headlinesReady();
    expect(screen.getByRole("link", { name: "Ana" })).toHaveAttribute(
      "href",
      "/guests/g-ana",
    );
    expect(screen.getByRole("link", { name: "Beto" })).toHaveAttribute(
      "href",
      "/guests/g-beto",
    );
    const ana = lapsedRow("Ana");
    expect(part(ana, "times")).toBe("vino 7 veces");
    expect(part(ana, "last")).toBe("9 de ene de 2026");
    expect(
      document.querySelector('[data-slot="lapsed-more"]')?.textContent,
    ).toBe("y 3 más");
  });

  it("leaves out the more line when every lapsed regular is shown", async () => {
    respond(ok(stats({ lapsed_total: 2 })));
    renderTab();
    await headlinesReady();
    expect(screen.getByRole("link", { name: "Ana" })).toBeInTheDocument();
    expect(document.querySelector('[data-slot="lapsed-more"]')).toBeNull();
  });

  it("leaves out the lapsed list for a period without a start", async () => {
    respond(ok(stats({ lapsed: [], lapsed_total: null })));
    renderTab({ query: { to: "2026-04-16" } });
    await headlinesReady();
    expect(screen.queryByText("Dejaron de venir")).not.toBeInTheDocument();
    expect(
      screen.queryByText(/^Personas que vinieron 3 veces o más/),
    ).not.toBeInTheDocument();
  });

  it("explains first times, the return rate, cohorts and lapsed regulars", async () => {
    respond(ok(stats()));
    renderTab();
    await headlinesReady();
    const notes = Array.from(document.querySelectorAll("blockquote")).map(
      (el) => el.textContent,
    );
    expect(notes).toEqual([
      "Primera vez es el primer evento de esta organización al que la persona vino, desde siempre. Venir como staff no cuenta.",
      "Quienes vinieron por primera vez hace poco tuvieron poco tiempo para volver.",
      "Cada fila son las personas cuya primera vez fue ese mes; cada columna, qué parte volvió N meses después.",
      "Personas que vinieron 3 veces o más antes de este período y ninguna durante él.",
    ]);
  });

  it("explains first times and the return rate for one event", async () => {
    respond(ok(eventStats()));
    renderTab({ query: { meetupId: "m1" } });
    await headlinesReady();
    const notes = Array.from(document.querySelectorAll("blockquote")).map(
      (el) => el.textContent,
    );
    expect(notes).toEqual([
      "Primera vez es el primer evento de esta organización al que la persona vino, desde siempre. Venir como staff no cuenta.",
      "Quienes vinieron por primera vez hace poco tuvieron poco tiempo para volver.",
    ]);
  });

  it("sends from, to and meetup_id to the API", async () => {
    respond(ok(eventStats()));
    renderTab({
      query: { from: "2026-03-01", to: "2026-04-01", meetupId: "m1" },
    });
    await headlinesReady();
    expect(mockApiGet).toHaveBeenCalledWith(
      "/organizations/{org_id}/stats/retention",
      {
        params: {
          path: { org_id: "org-1" },
          query: { from: "2026-03-01", to: "2026-04-01", meetup_id: "m1" },
        },
      },
    );
  });

  it("waits without fetching while the query is null", () => {
    respond(ok(stats()));
    renderTab({ query: null });
    expect(screen.getByTestId("retention-skeleton")).toBeInTheDocument();
    expect(mockApiGet).not.toHaveBeenCalled();
  });
});
