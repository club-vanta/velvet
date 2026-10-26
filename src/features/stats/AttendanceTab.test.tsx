import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LanguageProvider } from "@/lib/i18n";
import { statsAttendanceKey } from "@/lib/queryKeys";
import { AttendanceTab } from "./AttendanceTab";
import type { StatsTabProps } from "./statsTab";
import type { components } from "@/api/types";

const mockApiGet = vi.fn();
vi.mock("@/api/client", () => ({
  api: { GET: (...a: unknown[]) => mockApiGet(...a) },
}));

type Attendance = components["schemas"]["AttendanceStatsPublic"];
type Totals = components["schemas"]["AttendanceTotalsPublic"];

const TOTALS: Totals = {
  events: 5,
  signed_up: 500,
  cancelled: 50,
  attended: 412,
  walkin: 12,
  no_show: 40,
  cancellation_rate: 0.1,
  no_show_rate: 0.18,
  avg_signed_up_per_event: 100,
  avg_attended_per_event: 82.4,
};

const ROW: Attendance["meetups"][number] = {
  meetup_id: "m1",
  name: "Alter Marzo",
  date: "2026-03-10T22:00:00Z",
  signed_up: 100,
  cancelled: 10,
  attended: 80,
  walkin: 2,
  no_show: 10,
};

function stats(overrides: Partial<Attendance> = {}): Attendance {
  return {
    meetups: [ROW],
    totals: TOTALS,
    comparison_kind: null,
    comparison: null,
    ...overrides,
  };
}

function respond(statsResult: unknown) {
  mockApiGet.mockImplementation(() => statsResult);
}

const PERIOD = { from: "2026-01-15", to: "2026-04-16" };

function renderTab(
  props: Partial<StatsTabProps> = {},
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } }),
) {
  const onShowAll = vi.fn();
  render(
    <QueryClientProvider client={client}>
      <LanguageProvider>
        <AttendanceTab
          orgId="org-1"
          query={PERIOD}
          period={{ preset: "3m" }}
          onShowAll={onShowAll}
          {...props}
        />
      </LanguageProvider>
    </QueryClientProvider>,
  );
  return { onShowAll };
}

const ok = (data: Attendance) => Promise.resolve({ data, error: undefined });

/** Headline cards only, since the chart legend repeats the same labels. */
function headline(label: string): HTMLElement {
  const card = Array.from(
    document.querySelectorAll<HTMLElement>("[data-headline]"),
  ).find((el) => el.querySelector("p")?.textContent === label);
  if (!card) throw new Error(`No headline ${label}`);
  return card;
}

/** The text of one part of a headline card, or null when it has none. */
function slot(label: string, name: string): string | null {
  return (
    headline(label).querySelector(`[data-slot="${name}"]`)?.textContent ?? null
  );
}

const statsCalls = () =>
  mockApiGet.mock.calls.filter(
    ([path]) => path === "/organizations/{org_id}/stats/attendance",
  );

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

async function headlinesReady() {
  await waitFor(() => headline("Vinieron"));
}

describe("AttendanceTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("explains what the numbers leave out", async () => {
    respond(ok(stats()));
    renderTab();
    await headlinesReady();
    const note = screen.getByText(/^Solo cuentan los eventos finalizados/);
    expect(note.tagName).toBe("BLOCKQUOTE");
    expect(note).toHaveTextContent(
      "Solo cuentan los eventos finalizados. El staff y los vendors no se cuentan. Un discreto que nunca ingresó no cuenta.",
    );
  });

  it("shows a skeleton while loading", () => {
    respond(new Promise(() => {}));
    renderTab();
    expect(screen.getByTestId("attendance-skeleton")).toBeInTheDocument();
  });

  it('shows the error with retry, and "Ver todos los eventos" when an event is selected', async () => {
    const user = userEvent.setup();
    respond(Promise.resolve({ data: undefined, error: { detail: "nope" } }));
    const { onShowAll } = renderTab({ query: { meetupId: "m1" } });
    expect(
      await screen.findByText("No se pudieron cargar las estadísticas."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeVisible();
    await user.click(
      screen.getByRole("button", { name: "Ver todos los eventos" }),
    );
    expect(onShowAll).toHaveBeenCalledTimes(1);
  });

  it("announces the error and retries the request", async () => {
    const user = userEvent.setup();
    respond(Promise.resolve({ data: undefined, error: { detail: "nope" } }));
    renderTab();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No se pudieron cargar las estadísticas.",
    );
    expect(statsCalls()).toHaveLength(1);
    await user.click(screen.getByRole("button", { name: "Reintentar" }));
    await waitFor(() => expect(statsCalls()).toHaveLength(2));
  });

  it("offers no way back to all events on an error without a selected event", async () => {
    respond(Promise.resolve({ data: undefined, error: { detail: "nope" } }));
    renderTab();
    await screen.findByRole("button", { name: "Reintentar" });
    expect(
      screen.queryByRole("button", { name: "Ver todos los eventos" }),
    ).not.toBeInTheDocument();
  });

  it("shows the empty state for a period without finalized events", async () => {
    respond(ok(stats({ meetups: [] })));
    renderTab();
    expect(
      await screen.findByText("No hay eventos finalizados en este período"),
    ).toBeInTheDocument();
  });

  it("shows exact headline values in aggregate mode", async () => {
    respond(
      ok(
        stats({
          comparison_kind: "PREVIOUS_PERIOD",
          comparison: { ...TOTALS, attended: 381, no_show_rate: 0.15 },
        }),
      ),
    );
    renderTab();
    await headlinesReady();
    expect(
      screen.getByRole("heading", { level: 2, name: "Asistencia por evento" }),
    ).toBeInTheDocument();
    expect(slot("Vinieron", "value")).toBe("412");
    expect(slot("Vinieron", "comparison")).toBe(
      "+8% respecto al período anterior",
    );
    expect(slot("No vinieron", "value")).toBe("18%");
    expect(slot("No vinieron", "comparison")).toBe(
      "+3 puntos respecto al período anterior",
    );
    expect(slot("Se bajaron", "value")).toBe("10%");
    expect(slot("Se bajaron", "comparison")).toBe(
      "0 puntos respecto al período anterior",
    );
    expect(slot("Discretos", "value")).toBe("12");
    expect(slot("Eventos", "value")).toBe("5");
    expect(slot("Promedio por evento", "value")).toBe("82,4");
  });

  it("compares a single event with the period average", async () => {
    respond(
      ok(
        stats({
          totals: { ...TOTALS, events: 1, attended: 80 },
          comparison_kind: "PERIOD_AVERAGE",
          comparison: { ...TOTALS, no_show_rate: 0.2 },
        }),
      ),
    );
    renderTab({ query: { meetupId: "m1" } });
    await headlinesReady();
    expect(slot("Vinieron", "comparison")).toBe(
      "En todos los eventos de los últimos 3 meses: 82,4",
    );
    expect(slot("No vinieron", "comparison")).toBe(
      "En todos los eventos de los últimos 3 meses: 20%",
    );
    expect(slot("Discretos", "comparison")).toBeNull();
    expect(() => headline("Eventos")).toThrow();
  });

  it("dims a rate computed from fewer than 10 people and shows n", async () => {
    respond(
      ok(
        stats({
          totals: { ...TOTALS, signed_up: 7, cancelled: 0, no_show_rate: 0.14 },
        }),
      ),
    );
    renderTab();
    await headlinesReady();
    const noShow = headline("No vinieron");
    expect(slot("No vinieron", "sample")).toBe("n = 7");
    expect(noShow).toHaveClass("text-muted-foreground");
    expect(headline("Vinieron")).not.toHaveClass("text-muted-foreground");
  });

  it("shows a dash for null rates", async () => {
    respond(
      ok(
        stats({
          totals: {
            ...TOTALS,
            signed_up: 0,
            cancelled: 0,
            attended: 0,
            walkin: 0,
            no_show: 0,
            cancellation_rate: null,
            no_show_rate: null,
            avg_attended_per_event: null,
          },
        }),
      ),
    );
    renderTab();
    await headlinesReady();
    expect(slot("No vinieron", "value")).toBe("–");
    expect(slot("Se bajaron", "value")).toBe("–");
    expect(slot("Promedio por evento", "value")).toBe("–");
    expect(document.body).not.toHaveTextContent("NaN");
  });

  it("sends from, to and meetup_id to the API", async () => {
    respond(ok(stats()));
    renderTab({
      query: { from: "2026-03-01", to: "2026-04-01", meetupId: "m1" },
    });
    await headlinesReady();
    expect(mockApiGet).toHaveBeenCalledWith(
      "/organizations/{org_id}/stats/attendance",
      {
        params: {
          path: { org_id: "org-1" },
          query: { from: "2026-03-01", to: "2026-04-01", meetup_id: "m1" },
        },
      },
    );
  });

  it("waits without fetching or showing cached numbers while the query is null", () => {
    const client = new QueryClient();
    client.setQueryData(statsAttendanceKey("org-1", {}), stats());
    respond(ok(stats()));
    renderTab({ query: null }, client);
    expect(screen.getByTestId("attendance-skeleton")).toBeInTheDocument();
    expect(mockApiGet).not.toHaveBeenCalled();
  });

  it("lists the chart's numbers in a text table, in date order", async () => {
    respond(
      ok(
        stats({
          meetups: [
            {
              ...ROW,
              meetup_id: "m2",
              name: "Alter Abril",
              date: "2026-04-14T22:00:00Z",
              attended: 70,
              no_show: 5,
              cancelled: 3,
            },
            ROW,
          ],
        }),
      ),
    );
    renderTab();
    await headlinesReady();
    expect(tableText("Asistencia por evento")).toEqual({
      header: ["Evento", "Fecha", "Vinieron", "No vinieron", "Se bajaron"],
      body: [
        ["Alter Marzo", "10 de mar de 2026", "80", "10", "10"],
        ["Alter Abril", "14 de abr de 2026", "70", "5", "3"],
      ],
    });
  });
});
