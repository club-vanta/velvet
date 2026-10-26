import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { LanguageProvider } from "@/lib/i18n";
import { NoShowsTab } from "./NoShowsTab";
import type { StatsTabProps } from "./statsTab";
import type { components } from "@/api/types";

const mockApiGet = vi.fn();
vi.mock("@/api/client", () => ({
  api: { GET: (...a: unknown[]) => mockApiGet(...a) },
}));

type NoShows = components["schemas"]["NoShowStatsPublic"];
type Summary = components["schemas"]["NoShowSummaryPublic"];
type Guest = components["schemas"]["NoShowGuestPublic"];
type AgeBucket = components["schemas"]["StatsAgeBucket"];
type LeadBucket = components["schemas"]["StatsLeadTimeBucket"];

const rate = (noShow: number, expected: number) =>
  expected === 0 ? null : Math.round((noShow / expected) * 10000) / 10000;

/** A group of `expected` people of whom `noShow` did not come. */
function group<K>(key: K, expected: number, noShow: number) {
  return {
    key,
    expected,
    no_show: noShow,
    no_show_rate: rate(noShow, expected),
  };
}

const SUMMARY: Summary = {
  expected: 80,
  no_show: 12,
  no_show_rate: 0.15,
  repeat_guests: 3,
};

const AGES: AgeBucket[] = [
  "AGE_18_24",
  "AGE_25_29",
  "AGE_30_34",
  "AGE_35_39",
  "AGE_40_49",
  "AGE_50_PLUS",
  "UNKNOWN",
];

const LEADS: LeadBucket[] = [
  "SAME_DAY",
  "ONE_DAY",
  "TWO_THREE",
  "FOUR_SEVEN",
  "EIGHT_FOURTEEN",
  "FIFTEEN_PLUS",
];

const GUESTS: Guest[] = [
  {
    guest_id: "g-luna",
    displayname: "Luna",
    expected: 3,
    attended: 0,
    no_show: 3,
    last_no_show: "2026-04-18T23:00:00Z",
  },
  {
    guest_id: "g-tomi",
    displayname: "Tomi",
    expected: 4,
    attended: 2,
    no_show: 2,
    last_no_show: "2026-04-04T23:00:00Z",
  },
];

function stats(overrides: Partial<NoShows> = {}): NoShows {
  return {
    summary: SUMMARY,
    meetups: [
      {
        meetup_id: "m-27",
        name: "Alter #27",
        date: "2026-04-04T23:00:00Z",
        expected: 40,
        no_show: 4,
        no_show_rate: 0.1,
      },
      {
        meetup_id: "m-28",
        name: "Alter #28",
        date: "2026-04-18T23:00:00Z",
        expected: 40,
        no_show: 8,
        no_show_rate: 0.2,
      },
    ],
    gender: [group("MALE", 50, 5), group("NEW_CODE", 4, 2), group(null, 26, 5)],
    age: AGES.map((b) =>
      b === "AGE_18_24" ? group(b, 80, 12) : group(b, 0, 0),
    ),
    history: [group("FIRST_TIME", 30, 9), group("RETURNING", 50, 3)],
    lead_time: LEADS.map((b) => ({
      bucket: b,
      signed_up: b === "SAME_DAY" ? 85 : 0,
      cancelled: b === "SAME_DAY" ? 5 : 0,
      no_show: b === "SAME_DAY" ? 12 : 0,
      no_show_rate: b === "SAME_DAY" ? 0.15 : null,
    })),
    guests: GUESTS,
    guests_total: 2,
    comparison_kind: null,
    comparison: null,
    ...overrides,
  };
}

const PERIOD = { from: "2026-04-01", to: "2026-05-01" };

function renderTab(props: Partial<StatsTabProps> = {}, url = "/stats") {
  const onShowAll = vi.fn();
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <LanguageProvider>
        <MemoryRouter initialEntries={[url]}>
          <NoShowsTab
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

const ok = (data: NoShows) => Promise.resolve({ data, error: undefined });
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

/** Each row of a rate-bars card as [group, rate, n]. */
function rateRows(card: string) {
  const table = screen.getByRole("table", { name: card });
  return within(table)
    .getAllByRole("row")
    .slice(1)
    .map((row) => [
      row.querySelector('[data-slot="group"]')?.textContent,
      row.querySelector('[data-slot="rate-value"]')?.textContent,
      row.querySelector('[data-slot="sample"]')?.textContent ?? null,
    ]);
}

/** The text of a guest row and its filled and hollow dots. */
function guestRow(name: string) {
  const row = screen.getByRole("link", { name }).closest("li")!;
  return {
    missed: row.querySelector('[data-slot="missed"]')?.textContent,
    last: row.querySelector('[data-slot="last"]')?.textContent,
    dots: [
      row.querySelectorAll('[data-slot="dot-missed"]').length,
      row.querySelectorAll('[data-slot="dot-came"]').length,
    ],
  };
}

const statsCalls = () =>
  mockApiGet.mock.calls.filter(
    ([path]) => path === "/organizations/{org_id}/stats/no-shows",
  );

const RATE = "No vinieron";
const COUNT = "Se anotaron y no vinieron";
const REPEAT = "Faltaron 2 veces o más";

const headlinesReady = () => waitFor(() => headline(RATE));

describe("NoShowsTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("shows a skeleton while loading", () => {
    respond(new Promise(() => {}));
    renderTab();
    expect(screen.getByTestId("no-shows-skeleton")).toBeInTheDocument();
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

  it("shows the empty state when nobody was expected", async () => {
    respond(
      ok(
        stats({
          summary: { ...SUMMARY, expected: 0, no_show: 0, no_show_rate: null },
          meetups: [],
          guests: [],
          guests_total: 0,
        }),
      ),
    );
    renderTab();
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
            expected: 60,
            no_show: 6,
            no_show_rate: 0.1,
            repeat_guests: 2,
          },
        }),
      ),
    );
    renderTab();
    await headlinesReady();
    expect(slot(RATE, "value")).toBe("15%");
    expect(slot(RATE, "comparison")).toBe(
      "+5 puntos respecto al período anterior",
    );
    expect(slot(COUNT, "value")).toBe("12");
    expect(slot(COUNT, "subline")).toBe("de 80 anotados");
    expect(slot(COUNT, "comparison")).toBe(
      "+100% respecto al período anterior",
    );
    expect(slot(REPEAT, "value")).toBe("3");
    expect(slot(REPEAT, "subline")).toBe("personas, en el período");
    expect(slot(REPEAT, "comparison")).toBe(
      "+50% respecto al período anterior",
    );
  });

  it("compares one event with the period rate only", async () => {
    respond(
      ok(
        stats({
          meetups: [],
          comparison_kind: "PERIOD_AVERAGE",
          comparison: {
            expected: 400,
            no_show: 40,
            no_show_rate: 0.1,
            repeat_guests: 9,
          },
        }),
      ),
    );
    renderTab({ query: { meetupId: "m1" } });
    await headlinesReady();
    expect(slot(RATE, "comparison")).toBe("Todos los eventos del período: 10%");
    expect(slot(COUNT, "comparison")).toBeNull();
    expect(slot(REPEAT, "comparison")).toBeNull();
    expect(slot(REPEAT, "subline")).toBe(
      "de los que faltaron a este evento, contando toda su historia",
    );
    expect(
      screen.queryByRole("heading", {
        name: "Los que no vinieron, evento por evento",
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Quiénes no vinieron a este evento",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Los números de cada persona cubren toda su historia en la organización, no solo este evento.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/pestaña Clima/)).not.toBeInTheDocument();
  });

  it("leaves out the period average when the period has no rate", async () => {
    respond(
      ok(
        stats({
          meetups: [],
          comparison_kind: "PERIOD_AVERAGE",
          comparison: {
            expected: 0,
            no_show: 0,
            no_show_rate: null,
            repeat_guests: 0,
          },
        }),
      ),
    );
    renderTab({ query: { meetupId: "m1" } });
    await headlinesReady();
    expect(slot(RATE, "comparison")).toBeNull();
  });

  it("shows n under the rate when few people were expected", async () => {
    respond(ok(stats({ summary: { ...SUMMARY, expected: 6 } })));
    renderTab();
    await headlinesReady();
    expect(slot(RATE, "sample")).toBe("n = 6");
  });

  it("lists the rate of each event in a text table", async () => {
    respond(ok(stats()));
    renderTab();
    await headlinesReady();
    const table = screen.getByRole("table", {
      name: "Los que no vinieron, evento por evento",
      hidden: true,
    });
    const rows = within(table)
      .getAllByRole("row", { hidden: true })
      .map((row) => Array.from(row.children).map((c) => c.textContent));
    expect(rows).toEqual([
      ["Evento", "Fecha", "Anotados", "No vinieron"],
      ["Alter #27", "04/04", "40", "10%"],
      ["Alter #28", "18/04", "40", "20%"],
    ]);
  });

  it("draws a rate bar per group, dimming and counting small groups", async () => {
    respond(ok(stats()));
    renderTab();
    await headlinesReady();
    expect(rateRows("Según el género")).toEqual([
      ["Hombre", "10%", null],
      ["NEW_CODE", "50%", "n = 4"],
      ["Sin dato", "19%", null],
    ]);
    const small = screen
      .getByRole("table", { name: "Según el género" })
      .querySelectorAll('[data-slot="rate-row"]')[1];
    expect(small).toHaveClass("text-muted-foreground");
    expect(rateRows("Primera vez o ya habían venido")).toEqual([
      ["Primera vez", "30%", null],
      ["Ya habían venido", "6%", null],
    ]);
  });

  it("draws each bar as long as its rate and none for a missing rate", async () => {
    respond(ok(stats()));
    renderTab();
    await headlinesReady();
    const bars = (card: string) =>
      Array.from(
        screen.getByRole("table", { name: card }).querySelectorAll("tr"),
      )
        .slice(1)
        .map((row) => {
          const bar = row.querySelector<HTMLElement>('[data-slot="bar"]');
          return bar ? Math.round(parseFloat(bar.style.width)) : null;
        });
    // 10%, 50% and 5/26 (19%) on a 0 to 100% track.
    expect(bars("Según el género")).toEqual([10, 50, 19]);
    expect(rateRows("Según la edad")[1]).toEqual(["25-29", "–", null]);
    expect(bars("Según la edad").slice(0, 2)).toEqual([15, null]);
  });

  const CARDS = [
    "Según el género",
    "Según la edad",
    "Primera vez o ya habían venido",
    "Según cuánto antes se anotaron",
  ];
  const valueHeader = (card: string) =>
    screen.getByRole("table", { name: card }).querySelectorAll("th")[1]!
      .textContent;

  it("shows each group's rate by default", async () => {
    respond(ok(stats()));
    renderTab();
    await headlinesReady();
    expect(screen.getByRole("button", { name: "Tasa" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(CARDS.map(valueHeader)).toEqual(CARDS.map(() => "No vinieron"));
  });

  it("switches every breakdown card to the share of no-shows", async () => {
    respond(ok(stats()));
    renderTab();
    await headlinesReady();
    await userEvent.click(screen.getByRole("button", { name: "Composición" }));

    expect(CARDS.map(valueHeader)).toEqual(CARDS.map(() => "De los ausentes"));
    // 5, 2 and 5 of the 12 no-shows, the unknown group included.
    expect(rateRows("Según el género")).toEqual([
      ["Hombre", "42%", null],
      ["NEW_CODE", "17%", null],
      ["Sin dato", "42%", null],
    ]);
    expect(rateRows("Primera vez o ya habían venido")).toEqual([
      ["Primera vez", "75%", null],
      ["Ya habían venido", "25%", null],
    ]);
    expect(rateRows("Según cuánto antes se anotaron")[0]).toEqual([
      "El mismo día",
      "100%",
      null,
    ]);
    expect(screen.getByRole("button", { name: "Tasa" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("does not dim small groups in share mode", async () => {
    respond(ok(stats()));
    renderTab({}, "/stats?noshow_view=share");
    await headlinesReady();
    const small = screen
      .getByRole("table", { name: "Según el género" })
      .querySelectorAll('[data-slot="rate-row"]')[1];
    expect(small).not.toHaveClass("text-muted-foreground");
  });

  it("keeps the view in the URL", async () => {
    respond(ok(stats()));
    renderTab({}, "/stats?noshow_view=share");
    await headlinesReady();
    expect(screen.getByRole("button", { name: "Composición" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(rateRows("Según el género")[0]).toEqual(["Hombre", "42%", null]);
  });

  it("falls back to rates for an unknown view", async () => {
    respond(ok(stats()));
    renderTab({}, "/stats?noshow_view=bogus");
    await headlinesReady();
    expect(rateRows("Según el género")[0]).toEqual(["Hombre", "10%", null]);
  });

  it("shows no share when nobody missed", async () => {
    respond(
      ok(
        stats({
          gender: [group("MALE", 50, 0), group(null, 26, 0)],
        }),
      ),
    );
    renderTab({}, "/stats?noshow_view=share");
    await headlinesReady();
    expect(rateRows("Según el género")).toEqual([
      ["Hombre", "–", null],
      ["Sin dato", "–", null],
    ]);
  });

  it("rates the lead time over the sign-ups that were not cancelled", async () => {
    respond(ok(stats()));
    renderTab();
    await headlinesReady();
    expect(rateRows("Según cuánto antes se anotaron")[0]).toEqual([
      "El mismo día",
      "15%",
      null,
    ]);
  });

  it("lists the guests who missed with a dot per sign-up and a link to each", async () => {
    respond(ok(stats()));
    renderTab();
    await headlinesReady();
    expect(guestRow("Luna")).toEqual({
      missed: "faltó 3 de 3",
      last: "la última el 18/04",
      dots: [3, 0],
    });
    expect(guestRow("Tomi")).toEqual({
      missed: "faltó 2 de 4",
      last: "la última el 04/04",
      dots: [2, 2],
    });
    expect(screen.getByRole("link", { name: "Luna" })).toHaveAttribute(
      "href",
      "/guests/g-luna",
    );
    expect(document.querySelector('[data-slot="guests-more"]')).toBeNull();
  });

  it("caps the dots and counts the rest", async () => {
    respond(
      ok(
        stats({
          guests: [{ ...GUESTS[0], expected: 15, attended: 10, no_show: 5 }],
          guests_total: 1,
        }),
      ),
    );
    renderTab();
    await headlinesReady();
    expect(guestRow("Luna").dots).toEqual([5, 7]);
    const row = screen.getByRole("link", { name: "Luna" }).closest("li")!;
    expect(row).toHaveTextContent("+3");
  });

  it("says how many more guests the list leaves out", async () => {
    respond(ok(stats({ guests_total: 52 })));
    renderTab();
    await headlinesReady();
    expect(
      document.querySelector('[data-slot="guests-more"]')?.textContent,
    ).toBe("y 50 más");
  });

  it("says when nobody missed twice in the period", async () => {
    respond(ok(stats({ guests: [], guests_total: 0 })));
    renderTab();
    await headlinesReady();
    expect(
      screen.getByText("Nadie faltó 2 veces o más en este período."),
    ).toBeInTheDocument();
  });

  it("says when everyone came to the one event", async () => {
    respond(ok(stats({ meetups: [], guests: [], guests_total: 0 })));
    renderTab({ query: { meetupId: "m1" } });
    await headlinesReady();
    expect(
      screen.getByText("Vinieron todos los que se anotaron."),
    ).toBeInTheDocument();
  });

  it("explains what counts as not coming", async () => {
    respond(ok(stats()));
    renderTab();
    await headlinesReady();
    const note = screen.getByText(/^No vino quien se anotó/);
    expect(note.tagName).toBe("BLOCKQUOTE");
    expect(note).toHaveTextContent(
      "No vino quien se anotó, no canceló y nunca ingresó por la puerta. Los discretos y los que cancelaron no cuentan. El porcentaje es sobre los anotados que no cancelaron.",
    );
    expect(
      screen.getByText(
        "Cómo influye la lluvia en los que no vienen está en la pestaña Clima.",
      ),
    ).toBeInTheDocument();
  });

  it("names the cards in English", async () => {
    localStorage.setItem("lang", "en");
    respond(ok(stats()));
    renderTab();
    await waitFor(() => headline("No-show"));
    expect(slot("Missed 2 or more times", "value")).toBe("3");
    expect(
      screen.getByRole("heading", { name: "Who signs up and doesn't come" }),
    ).toBeInTheDocument();
    expect(guestRow("Luna").missed).toBe("missed 3 of 3");
  });

  it("sends from, to and meetup_id to the API", async () => {
    respond(ok(stats()));
    renderTab({
      query: { from: "2026-03-01", to: "2026-04-01", meetupId: "m1" },
    });
    await headlinesReady();
    expect(mockApiGet).toHaveBeenCalledWith(
      "/organizations/{org_id}/stats/no-shows",
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
    expect(screen.getByTestId("no-shows-skeleton")).toBeInTheDocument();
    expect(mockApiGet).not.toHaveBeenCalled();
  });
});
