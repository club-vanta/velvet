import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { LanguageProvider } from "@/lib/i18n";
import { ArrivalsTab } from "./ArrivalsTab";
import type { StatsTabProps } from "./statsTab";
import type { components } from "@/api/types";

const mockApiGet = vi.fn();
vi.mock("@/api/client", () => ({
  api: { GET: (...a: unknown[]) => mockApiGet(...a) },
}));

type Arrivals = components["schemas"]["ArrivalStatsPublic"];
type Summary = components["schemas"]["ArrivalSummaryPublic"];
type LeadRow = components["schemas"]["LeadTimeRowPublic"];

const SUMMARY: Summary = {
  arrivals: 200,
  excluded_arrivals: 0,
  peak: { start_minute: 30, arrivals: 40 },
  peak_local_time: "22:30",
  mean_minutes: 45,
  p90_minutes: 90,
  mean_local_time: "22:45",
  p90_local_time: "23:30",
  first_hour_share: 0.86,
};

const NOBODY: Summary = {
  arrivals: 0,
  excluded_arrivals: 0,
  peak: null,
  peak_local_time: null,
  mean_minutes: null,
  p90_minutes: null,
  mean_local_time: null,
  p90_local_time: null,
  first_hour_share: null,
};

const LEAD: LeadRow[] = [
  {
    bucket: "SAME_DAY",
    signed_up: 120,
    cancelled: 20,
    no_show: 10,
    no_show_rate: 0.1,
  },
  {
    bucket: "ONE_DAY",
    signed_up: 60,
    cancelled: 5,
    no_show: 5,
    no_show_rate: 0.09,
  },
  {
    bucket: "TWO_THREE",
    signed_up: 12,
    cancelled: 4,
    no_show: 2,
    no_show_rate: 0.25,
  },
  {
    bucket: "FOUR_SEVEN",
    signed_up: 8,
    cancelled: 0,
    no_show: 4,
    no_show_rate: 0.5,
  },
  {
    bucket: "EIGHT_FOURTEEN",
    signed_up: 0,
    cancelled: 0,
    no_show: 0,
    no_show_rate: null,
  },
  {
    bucket: "FIFTEEN_PLUS",
    signed_up: 3,
    cancelled: 3,
    no_show: 0,
    no_show_rate: null,
  },
];

function stats(overrides: Partial<Arrivals> = {}): Arrivals {
  return {
    curve: [
      { start_minute: 15, arrivals: 20 },
      { start_minute: 30, arrivals: 40 },
    ],
    clock_curve: [
      { start_minute: 1335, local_time: "22:15", arrivals: 20 },
      { start_minute: 1350, local_time: "22:30", arrivals: 40 },
    ],
    summary: SUMMARY,
    lead_time: LEAD,
    comparison_kind: null,
    comparison: null,
    ...overrides,
  };
}

const PERIOD = { from: "2026-01-15", to: "2026-04-16" };

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
          <ArrivalsTab
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

const ok = (data: Arrivals) => Promise.resolve({ data, error: undefined });
const respond = (result: unknown) =>
  mockApiGet.mockImplementation(() => result);

/** The header and body rows of a sr-only chart table, as text. */
function tableText(name: string) {
  const table = screen.getByRole("table", { name, hidden: true });
  // sr-only sits on the wrapper: a table ignores a width limit.
  expect(table).not.toHaveClass("sr-only");
  expect(table.parentElement).toHaveClass("sr-only");
  const [header, ...body] = within(table).getAllByRole("row", { hidden: true });
  const texts = (row: HTMLElement) =>
    Array.from(row.children).map((c) => c.textContent);
  return { header: texts(header!), body: body.map(texts) };
}

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

/** One lead-time row by its bucket label. */
function leadRow(label: string): HTMLElement {
  const row = Array.from(
    document.querySelectorAll<HTMLElement>('[data-slot="lead-row"]'),
  ).find(
    (el) => el.querySelector('[data-slot="bucket"]')?.textContent === label,
  );
  if (!row) throw new Error(`No lead row ${label}`);
  return row;
}

const part = (row: HTMLElement, name: string) =>
  row.querySelector(`[data-slot="${name}"]`)?.textContent ?? null;

const statsCalls = () =>
  mockApiGet.mock.calls.filter(
    ([path]) => path === "/organizations/{org_id}/stats/arrivals",
  );

const MEAN = "Hora promedio de llegada";
const BUSIEST = "Franja con más llegadas";
const NINETY = "El 90% llegó antes de las";
const FIRST_HOUR = "Llegó en la primera hora";

const headlinesReady = () => waitFor(() => headline(MEAN));

describe("ArrivalsTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("shows a skeleton while loading", () => {
    respond(new Promise(() => {}));
    renderTab();
    expect(screen.getByTestId("arrivals-skeleton")).toBeInTheDocument();
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

  it("shows the empty state when nobody arrived and nobody signed up", async () => {
    respond(
      ok(
        stats({
          curve: [],
          summary: NOBODY,
          lead_time: LEAD.map((r) => ({
            ...r,
            signed_up: 0,
            cancelled: 0,
            no_show: 0,
            no_show_rate: null,
          })),
        }),
      ),
    );
    renderTab();
    expect(
      await screen.findByText("No hay eventos finalizados en este período"),
    ).toBeInTheDocument();
    expect(document.querySelector("[data-headline]")).toBeNull();
    expect(screen.queryByRole("heading", { level: 2 })).not.toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("shows exact headline values in aggregate mode", async () => {
    respond(
      ok(
        stats({
          comparison_kind: "PREVIOUS_PERIOD",
          comparison: {
            ...SUMMARY,
            mean_minutes: 40,
            p90_minutes: 90,
            first_hour_share: 0.8,
          },
        }),
      ),
    );
    renderTab();
    await headlinesReady();
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Llegadas cada 15 minutos",
      }),
    ).toBeInTheDocument();
    expect(slot(MEAN, "value")).toBe("22:45");
    expect(slot(MEAN, "subline")).toBe("45 min después del inicio");
    expect(slot(MEAN, "comparison")).toBe("+5 min vs. período anterior");
    expect(slot(BUSIEST, "value")).toBe("22:30-22:45");
    expect(slot(BUSIEST, "subline")).toBe("30 min después del inicio");
    expect(slot(BUSIEST, "comparison")).toBeNull();
    expect(slot(NINETY, "value")).toBe("23:30");
    expect(slot(NINETY, "subline")).toBe("1 h 30 min después del inicio");
    expect(slot(NINETY, "comparison")).toBe("0 min vs. período anterior");
    expect(slot(FIRST_HOUR, "value")).toBe("86%");
    expect(slot(FIRST_HOUR, "subline")).toBeNull();
    expect(slot(FIRST_HOUR, "comparison")).toBe("+6 pts vs. período anterior");
    expect(slot(FIRST_HOUR, "sample")).toBeNull();
  });

  it("says when a time falls before or right at the start", async () => {
    respond(
      ok(
        stats({
          summary: {
            ...SUMMARY,
            peak: { start_minute: 0, arrivals: 40 },
            mean_minutes: -20,
          },
        }),
      ),
    );
    renderTab();
    await headlinesReady();
    expect(slot(MEAN, "subline")).toBe("20 min antes del inicio");
    expect(slot(BUSIEST, "subline")).toBe("justo al inicio");
  });

  it("uses clock times and the period average for one event", async () => {
    respond(
      ok(
        stats({
          curve: [{ start_minute: 30, arrivals: 40 }],
          summary: {
            ...SUMMARY,
            peak: { start_minute: 30, arrivals: 40 },
            peak_local_time: "23:30",
            mean_local_time: "23:45",
            p90_local_time: "00:30",
          },
          comparison_kind: "PERIOD_AVERAGE",
          comparison: {
            ...SUMMARY,
            mean_local_time: "00:05",
            p90_local_time: "00:35",
          },
        }),
      ),
    );
    renderTab({ query: { meetupId: "m1" } });
    await headlinesReady();
    expect(slot(BUSIEST, "value")).toBe("23:30-23:45");
    expect(slot(MEAN, "value")).toBe("23:45");
    expect(slot(MEAN, "subline")).toBe("45 min después del inicio");
    expect(slot(MEAN, "comparison")).toBe("promedio: 00:05");
    expect(slot(NINETY, "value")).toBe("00:30");
    expect(slot(NINETY, "comparison")).toBe("promedio: 00:35");
    expect(slot(FIRST_HOUR, "comparison")).toBe("promedio: 86%");
  });

  it("shows dashes and says nobody checked in when there are no arrivals", async () => {
    respond(ok(stats({ curve: [], clock_curve: [], summary: NOBODY })));
    renderTab();
    await headlinesReady();
    // Nothing to switch between without arrivals.
    expect(
      screen.queryByRole("group", { name: "Mostrar" }),
    ).not.toBeInTheDocument();
    for (const label of [MEAN, BUSIEST, NINETY, FIRST_HOUR]) {
      expect(slot(label, "value")).toBe("–");
    }
    expect(slot(MEAN, "subline")).toBeNull();
    expect(slot(FIRST_HOUR, "sample")).toBeNull();
    expect(screen.getByText("Nadie ingresó")).toBeInTheDocument();
    expect(leadRow("El mismo día")).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent("NaN");
  });

  it("heads the English lead-time table like its tooltip series", async () => {
    localStorage.setItem("lang", "en");
    respond(ok(stats()));
    renderTab();
    const table = await screen.findByRole("table", {
      name: "How early people sign up",
    });
    expect(
      within(table)
        .getAllByRole("columnheader")
        .map((th) => th.textContent),
    ).toEqual(["Lead time", "Signed up", "No-show"]);
  });

  it("names the lead-time table after its card", async () => {
    respond(ok(stats()));
    renderTab();
    await headlinesReady();
    expect(
      screen.getByRole("table", { name: "Con cuánta anticipación se anotan" }),
    ).toBeInTheDocument();
  });

  it("shows n under the first-hour share when few people arrived", async () => {
    respond(ok(stats({ summary: { ...SUMMARY, arrivals: 5 } })));
    renderTab();
    await headlinesReady();
    expect(slot(FIRST_HOUR, "sample")).toBe("n = 5");
  });

  it("lists the lead times in a table with exact counts and dims small rates", async () => {
    respond(ok(stats()));
    renderTab();
    await headlinesReady();

    expect(
      within(
        screen.getByRole("table", {
          name: "Con cuánta anticipación se anotan",
        }),
      )
        .getAllByRole("columnheader")
        .map((th) => th.textContent),
    ).toEqual(["Anticipación", "Anotados", "No vinieron"]);

    const sameDay = leadRow("El mismo día");
    expect(part(sameDay, "signed-up")).toBe("120");
    expect(part(sameDay, "rate-value")).toBe("10%");
    expect(part(sameDay, "sample")).toBeNull();
    expect(sameDay.querySelector('[data-slot="rate"]')).not.toHaveClass(
      "text-muted-foreground",
    );

    const fourSeven = leadRow("4-7 días");
    expect(part(fourSeven, "signed-up")).toBe("8");
    expect(part(fourSeven, "rate-value")).toBe("50%");
    expect(part(fourSeven, "sample")).toBe("n = 8");
    expect(fourSeven.querySelector('[data-slot="rate"]')).toHaveClass(
      "text-muted-foreground",
    );
    expect(part(leadRow("2-3 días"), "sample")).toBe("n = 8");

    const fifteen = leadRow("15+ días");
    expect(part(fifteen, "rate-value")).toBe("–");
    expect(part(fifteen, "sample")).toBeNull();
  });

  it("says there were no sign-ups instead of drawing an empty lead-time chart", async () => {
    respond(
      ok(
        stats({
          lead_time: LEAD.map((r) => ({
            ...r,
            signed_up: 0,
            cancelled: 0,
            no_show: 0,
            no_show_rate: null,
          })),
        }),
      ),
    );
    renderTab();
    await headlinesReady();
    expect(screen.getByText("No hubo inscripciones")).toBeInTheDocument();
    expect(
      screen.queryByRole("table", {
        name: "Con cuánta anticipación se anotan",
      }),
    ).not.toBeInTheDocument();
  });

  it("explains what the numbers leave out", async () => {
    respond(ok(stats()));
    renderTab();
    await headlinesReady();
    const arrivals = screen.getByText(/^Los horarios salen del ingreso/);
    expect(arrivals.tagName).toBe("BLOCKQUOTE");
    expect(arrivals).toHaveTextContent(
      "Los horarios salen del ingreso en la puerta. Cada tarjeta muestra la hora a la que llegó la gente y, debajo, cuánto después del inicio fue.",
    );
    expect(
      screen.getByText(/^Con varios eventos, la hora del día/).textContent,
    ).toBe(
      "Con varios eventos, la hora del día y el tiempo desde el inicio se calculan por separado. Si los eventos empiezan a distintas horas, pueden no coincidir del todo.",
    );
    expect(
      screen.getByText("Los discretos no se cuentan porque nunca se anotaron.")
        .tagName,
    ).toBe("BLOCKQUOTE");
  });

  it("says how many check-ins were left out of the curve", async () => {
    respond(ok(stats({ summary: { ...SUMMARY, excluded_arrivals: 12000 } })));
    renderTab();
    await headlinesReady();
    const note = screen.getByText(/^Ingresos dejados afuera/);
    expect(note.tagName).toBe("BLOCKQUOTE");
    expect(note).toHaveTextContent(
      "Ingresos dejados afuera: 12.000. Se registraron más de 2 horas antes o 12 horas después del inicio (suelen ser cargas tardías o errores).",
    );
  });

  it("reads right in English for a single left-out check-in", async () => {
    localStorage.setItem("lang", "en");
    respond(ok(stats({ summary: { ...SUMMARY, excluded_arrivals: 1 } })));
    renderTab();
    await waitFor(() => screen.getByText(/^Check-ins left out/));
    expect(screen.getByText(/^Check-ins left out/)).toHaveTextContent(
      "Check-ins left out: 1. They were recorded more than 2 hours before or 12 hours after the start (usually late entries or mistakes).",
    );
  });

  it("shows no left-out note when nothing was excluded", async () => {
    respond(ok(stats()));
    renderTab();
    await headlinesReady();
    expect(
      screen.queryByText(/^Ingresos dejados afuera/),
    ).not.toBeInTheDocument();
  });

  it("sends from, to and meetup_id to the API", async () => {
    respond(ok(stats()));
    renderTab({
      query: { from: "2026-03-01", to: "2026-04-01", meetupId: "m1" },
    });
    await headlinesReady();
    expect(mockApiGet).toHaveBeenCalledWith(
      "/organizations/{org_id}/stats/arrivals",
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
    expect(screen.getByTestId("arrivals-skeleton")).toBeInTheDocument();
    expect(mockApiGet).not.toHaveBeenCalled();
  });

  it("lists the arrival curve by clock time by default", async () => {
    respond(ok(stats()));
    renderTab();
    await screen.findByText("Llegadas cada 15 minutos");
    expect(screen.getByRole("button", { name: "Hora" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(tableText("Llegadas cada 15 minutos")).toEqual({
      header: ["Hora", "Llegadas"],
      body: [
        ["22:15", "20"],
        ["22:30", "40"],
      ],
    });
    expect(screen.getByText("Hora de llegada")).toBeInTheDocument();
    expect(
      screen.queryByText("Horas desde el inicio del evento"),
    ).not.toBeInTheDocument();
  });

  it("switches the curve to the time from the start", async () => {
    respond(ok(stats()));
    renderTab();
    await screen.findByText("Llegadas cada 15 minutos");
    await userEvent.click(
      screen.getByRole("button", { name: "Desde el inicio" }),
    );
    expect(tableText("Llegadas cada 15 minutos").body).toEqual([
      ["0:15", "20"],
      ["0:30", "40"],
    ]);
    expect(
      screen.getByText("Horas desde el inicio del evento"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Hora" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("keeps the curve view in the URL", async () => {
    respond(ok(stats()));
    renderTab({}, "/stats?arrivals_view=offset");
    await screen.findByText("Llegadas cada 15 minutos");
    expect(tableText("Llegadas cada 15 minutos").body[0]).toEqual([
      "0:15",
      "20",
    ]);
  });

  it("falls back to clock time for an unknown curve view", async () => {
    respond(ok(stats()));
    renderTab({}, "/stats?arrivals_view=bogus");
    await screen.findByText("Llegadas cada 15 minutos");
    expect(tableText("Llegadas cada 15 minutos").body[0]).toEqual([
      "22:15",
      "20",
    ]);
  });

  it("labels one event's curve by clock time, without the several-events note", async () => {
    respond(
      ok(
        stats({
          curve: [{ start_minute: 30, arrivals: 40 }],
          clock_curve: [
            { start_minute: 1410, local_time: "23:30", arrivals: 40 },
          ],
        }),
      ),
    );
    renderTab({ query: { meetupId: "m1" } });
    await screen.findByText("Llegadas cada 15 minutos");
    expect(tableText("Llegadas cada 15 minutos").body).toEqual([
      ["23:30", "40"],
    ]);
    expect(screen.queryByText(/^Con varios eventos/)).not.toBeInTheDocument();
  });

  it("shows one event's curve from the start in that view", async () => {
    respond(
      ok(
        stats({
          curve: [{ start_minute: 30, arrivals: 40 }],
        }),
      ),
    );
    renderTab({ query: { meetupId: "m1" } }, "/stats?arrivals_view=offset");
    await screen.findByText("Llegadas cada 15 minutos");
    expect(tableText("Llegadas cada 15 minutos").body).toEqual([
      ["0:30", "40"],
    ]);
  });
});
