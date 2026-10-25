import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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
  peak: { start_minute: 30, local_time: null, arrivals: 40 },
  median_minutes: 45,
  p90_minutes: 90,
  median_local_time: null,
  p90_local_time: null,
  first_hour_share: 0.86,
};

const NOBODY: Summary = {
  arrivals: 0,
  excluded_arrivals: 0,
  peak: null,
  median_minutes: null,
  p90_minutes: null,
  median_local_time: null,
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
      { start_minute: 15, local_time: null, arrivals: 20 },
      { start_minute: 30, local_time: null, arrivals: 40 },
    ],
    summary: SUMMARY,
    lead_time: LEAD,
    comparison_kind: null,
    comparison: null,
    ...overrides,
  };
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
        <ArrivalsTab
          orgId="org-1"
          query={PERIOD}
          onShowAll={onShowAll}
          {...props}
        />
      </LanguageProvider>
    </QueryClientProvider>,
  );
  return { onShowAll };
}

const ok = (data: Arrivals) => Promise.resolve({ data, error: undefined });
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

const headlinesReady = () => waitFor(() => headline("Pico de llegada"));

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
            median_minutes: 40,
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
    expect(slot("Pico de llegada", "value")).toBe("+0:30");
    expect(slot("Pico de llegada", "comparison")).toBeNull();
    expect(slot("Llegó el 50%", "value")).toBe("+0:45");
    expect(slot("Llegó el 50%", "comparison")).toBe(
      "+5 min vs. período anterior",
    );
    expect(slot("Llegó el 90%", "value")).toBe("+1:30");
    expect(slot("Llegó el 90%", "comparison")).toBe(
      "0 min vs. período anterior",
    );
    expect(slot("En la primera hora", "value")).toBe("86%");
    expect(slot("En la primera hora", "comparison")).toBe(
      "+6 pts vs. período anterior",
    );
    expect(slot("En la primera hora", "sample")).toBeNull();
  });

  it("uses clock times and the period average for one event", async () => {
    respond(
      ok(
        stats({
          curve: [{ start_minute: 30, local_time: "23:30", arrivals: 40 }],
          summary: {
            ...SUMMARY,
            peak: { start_minute: 30, local_time: "23:30", arrivals: 40 },
            median_local_time: "23:45",
            p90_local_time: "00:30",
          },
          comparison_kind: "PERIOD_AVERAGE",
          comparison: { ...SUMMARY, median_minutes: 65, p90_minutes: 95 },
        }),
      ),
    );
    renderTab({ query: { meetupId: "m1" } });
    await headlinesReady();
    expect(slot("Pico de llegada", "value")).toBe("23:30-23:45");
    expect(slot("Llegó el 50%", "value")).toBe("23:45");
    expect(slot("Llegó el 50%", "comparison")).toBe(
      "+0:45 desde el inicio · promedio: +1:05",
    );
    expect(slot("Llegó el 90%", "value")).toBe("00:30");
    expect(slot("Llegó el 90%", "comparison")).toBe(
      "+1:30 desde el inicio · promedio: +1:35",
    );
    expect(slot("En la primera hora", "comparison")).toBe("promedio: 86%");
  });

  it("shows dashes and says nobody checked in when there are no arrivals", async () => {
    respond(ok(stats({ curve: [], summary: NOBODY })));
    renderTab();
    await headlinesReady();
    expect(slot("Pico de llegada", "value")).toBe("–");
    expect(slot("Llegó el 50%", "value")).toBe("–");
    expect(slot("Llegó el 90%", "value")).toBe("–");
    expect(slot("En la primera hora", "value")).toBe("–");
    expect(slot("En la primera hora", "sample")).toBeNull();
    expect(screen.getByText("Nadie ingresó")).toBeInTheDocument();
    expect(leadRow("El mismo día")).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent("NaN");
  });

  it("heads the English lead-time table like its tooltip series", async () => {
    localStorage.setItem("lang", "en");
    respond(ok(stats()));
    renderTab();
    await waitFor(() => screen.getAllByRole("columnheader"));
    expect(
      screen.getAllByRole("columnheader").map((th) => th.textContent),
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
    expect(slot("En la primera hora", "sample")).toBe("n = 5");
  });

  it("lists the lead times in a table with exact counts and dims small rates", async () => {
    respond(ok(stats()));
    renderTab();
    await headlinesReady();

    expect(
      screen.getAllByRole("columnheader").map((th) => th.textContent),
    ).toEqual(["Anticipación", "Anotados", "No-show"]);

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
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("explains what the numbers leave out", async () => {
    respond(ok(stats()));
    renderTab();
    await headlinesReady();
    const arrivals = screen.getByText(/^Los horarios salen del ingreso/);
    expect(arrivals.tagName).toBe("BLOCKQUOTE");
    expect(arrivals).toHaveTextContent(
      "Los horarios salen del ingreso en la puerta. En el agregado, los minutos se cuentan desde el inicio de cada evento para que eventos a distintas horas se puedan comparar.",
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
});
