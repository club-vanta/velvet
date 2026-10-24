import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, useLocation } from "react-router-dom";
import { LanguageProvider } from "@/lib/i18n";
import { AttendanceTab } from "./AttendanceTab";
import type { components } from "@/api/types";

const mockApiGet = vi.fn();
vi.mock("@/api/client", () => ({
  api: { GET: (...a: unknown[]) => mockApiGet(...a) },
}));
vi.mock("@/lib/org", () => ({
  useOrg: () => ({
    activeOrg: { org_id: "org-1", org_name: "Club Vanta", role: "ADMIN" },
  }),
}));

type Attendance = components["schemas"]["AttendanceStatsPublic"];
type Totals = components["schemas"]["AttendanceTotalsPublic"];
type Meetup = components["schemas"]["MeetupPublic"];

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
  date: "2026-03-10T22:00:00",
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

const M1: Meetup = {
  id: "m1",
  name: "Alter Marzo",
  mazmo_meetup_url: "https://mazmo.net/+eventos/m1",
  date: "2026-03-10T22:00:00Z",
  is_finalized: true,
  finalized_at: null,
  requires_payment: false,
};

function respond(statsResult: unknown, meetups: Meetup[] = [M1]) {
  mockApiGet.mockImplementation((path: string) =>
    path === "/organizations/{org_id}/stats/attendance"
      ? statsResult
      : Promise.resolve({
          data: { total: meetups.length, meetups },
          error: undefined,
        }),
  );
}

function Probe() {
  const { search } = useLocation();
  return <div data-testid="search">{search}</div>;
}

function renderTab(url = "/stats") {
  return render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <LanguageProvider>
        <MemoryRouter initialEntries={[url]}>
          <AttendanceTab orgId="org-1" />
          <Probe />
        </MemoryRouter>
      </LanguageProvider>
    </QueryClientProvider>,
  );
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

async function headlinesReady() {
  await waitFor(() => headline("Vinieron"));
}

describe("AttendanceTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("shows a skeleton while loading", () => {
    respond(new Promise(() => {}));
    renderTab();
    expect(screen.getByTestId("attendance-skeleton")).toBeInTheDocument();
  });

  it('shows the error with retry, and "Ver todos los eventos" when an event is selected', async () => {
    const user = userEvent.setup();
    respond(Promise.resolve({ data: undefined, error: { detail: "nope" } }));
    renderTab("/stats?range=all&meetup=m1");
    expect(
      await screen.findByText("Error al cargar las estadísticas del evento."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeVisible();
    await user.click(
      screen.getByRole("button", { name: "Ver todos los eventos" }),
    );
    await waitFor(() =>
      expect(screen.getByTestId("search").textContent).toBe("?range=all"),
    );
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
          comparison: { ...TOTALS, attended: 381 },
        }),
      ),
    );
    renderTab();
    await headlinesReady();
    expect(headline("Vinieron")).toHaveTextContent("412");
    expect(headline("No-show")).toHaveTextContent("18%");
    expect(headline("Se bajaron")).toHaveTextContent("10%");
    expect(headline("Discretos")).toHaveTextContent("12");
    expect(headline("Eventos")).toHaveTextContent("5");
    expect(headline("Promedio por evento")).toHaveTextContent("82.4");
    expect(screen.getByText("+8% vs. período anterior")).toBeInTheDocument();
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
    renderTab("/stats?range=all&meetup=m1");
    await headlinesReady();
    expect(screen.getByText("promedio: 82.4")).toBeInTheDocument();
    expect(screen.getByText("promedio: 20%")).toBeInTheDocument();
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
    const noShow = headline("No-show");
    expect(noShow).toHaveTextContent("n = 7");
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
    expect(headline("No-show")).toHaveTextContent("–");
    expect(headline("Se bajaron")).toHaveTextContent("–");
    expect(document.body).not.toHaveTextContent("NaN");
  });

  it("sends from, to and meetup_id to the API", async () => {
    respond(ok(stats()));
    renderTab("/stats?range=custom&from=2026-03-01&to=2026-03-31&meetup=m1");
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
});
