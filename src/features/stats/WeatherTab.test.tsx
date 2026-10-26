import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { LanguageProvider } from "@/lib/i18n";
import { WeatherTab } from "./WeatherTab";
import type { StatsTabProps } from "./statsTab";
import type { components } from "@/api/types";

const mockApiGet = vi.fn();
vi.mock("@/api/client", () => ({
  api: { GET: (...a: unknown[]) => mockApiGet(...a) },
}));

let mockOrgRole = "USER";
let mockSiteRole = "USER";
vi.mock("@/lib/org", () => ({
  useOrg: () => ({
    activeOrg: { org_id: "org-1", org_name: "Club Vanta", role: mockOrgRole },
  }),
  useIsOrgAdmin: () => mockSiteRole === "SITE_ADMIN" || mockOrgRole === "ADMIN",
}));
vi.mock("@/auth/AuthContext", () => ({
  useAuth: () => ({
    user: { id: 1, username: "u", role: { name: mockSiteRole } },
  }),
}));

type Weather = components["schemas"]["WeatherStatsPublic"];
type Row = components["schemas"]["WeatherMeetupRowPublic"];
type Band = components["schemas"]["TemperatureBandRowPublic"];
type Group = components["schemas"]["WeatherGroupPublic"];
type Event = components["schemas"]["WeatherEventPublic"];
type MeetupWeather = components["schemas"]["MeetupWeatherPublic"];

function row(overrides: Partial<Row> = {}): Row {
  return {
    meetup_id: "m1",
    name: "Alter Marzo",
    date: "2026-03-10T01:00:00Z",
    has_weather: true,
    attended: 100,
    no_show_rate: 0.2,
    avg_temperature: 18.2,
    rained: false,
    total_precipitation_mm: 0,
    ...overrides,
  };
}

const NO_WEATHER = {
  has_weather: false,
  avg_temperature: null,
  rained: null,
  total_precipitation_mm: null,
} as const;

const RAINY: Group = { events: 12, avg_attended: 80.4, no_show_rate: 0.31 };
const DRY: Group = { events: 3, avg_attended: 120, no_show_rate: 0.18 };

function bands(overrides: Partial<Record<Band["band"], Partial<Band>>> = {}) {
  const base: Band[] = [
    { band: "BELOW_10", events: 2, avg_attended: 70, no_show_rate: 0.4 },
    {
      band: "FROM_10_TO_15",
      events: 0,
      avg_attended: null,
      no_show_rate: null,
    },
    {
      band: "FROM_15_TO_20",
      events: 5,
      avg_attended: 95.5,
      no_show_rate: 0.25,
    },
    { band: "FROM_20_TO_25", events: 6, avg_attended: 110, no_show_rate: 0.2 },
    { band: "FROM_25", events: 2, avg_attended: 60, no_show_rate: 0.5 },
  ];
  return base.map((b) => ({ ...b, ...overrides[b.band] }));
}

function stats(overrides: Partial<Weather> = {}): Weather {
  return {
    event: null,
    meetups: [
      row(),
      row({
        meetup_id: "m0",
        name: "Alter Febrero",
        date: "2026-02-10T01:00:00Z",
        attended: 90,
        avg_temperature: 25.4,
      }),
      row({
        meetup_id: "m2",
        name: "Alter Abril",
        date: "2026-04-02T01:00:00Z",
        ...NO_WEATHER,
      }),
    ],
    rainy: RAINY,
    dry: DRY,
    temperature_bands: bands(),
    without_weather: 1,
    comparison_kind: null,
    comparison: null,
    ...overrides,
  };
}

const MEETUP_WEATHER: MeetupWeather = {
  avg_temperature: 21.5,
  avg_apparent_temperature: 20,
  total_precipitation_mm: 0,
  max_wind_kmh: 12,
  rained: false,
  fetched_at: "2026-03-10T10:00:00Z",
  source: "open-meteo-historical-forecast",
};

function event(overrides: Partial<Event> = {}): Event {
  return {
    status: "OK",
    ready: true,
    attended: 140,
    no_show_rate: 0.15,
    weather: MEETUP_WEATHER,
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
        <MemoryRouter>
          <WeatherTab
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

const ok = (data: Weather) => Promise.resolve({ data, error: undefined });
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

const part = (el: Element, name: string) =>
  el.querySelector(`[data-slot="${name}"]`)?.textContent ?? null;

const statsCalls = () =>
  mockApiGet.mock.calls.filter(
    ([path]) => path === "/organizations/{org_id}/stats/weather",
  );

const ready = () => waitFor(() => headline("Con lluvia"));

const notes = () =>
  Array.from(document.querySelectorAll("blockquote")).map(
    (el) => el.textContent,
  );

describe("WeatherTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.stubEnv("TZ", "America/Argentina/Buenos_Aires");
    mockOrgRole = "USER";
    mockSiteRole = "USER";
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("shows a skeleton while loading", () => {
    respond(new Promise(() => {}));
    renderTab();
    expect(screen.getByTestId("weather-skeleton")).toBeInTheDocument();
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

  it("shows the empty state when the period has no finalized events", async () => {
    respond(
      ok(
        stats({
          meetups: [],
          rainy: { events: 0, avg_attended: null, no_show_rate: null },
          dry: { events: 0, avg_attended: null, no_show_rate: null },
          temperature_bands: bands({
            BELOW_10: { events: 0, avg_attended: null, no_show_rate: null },
            FROM_15_TO_20: {
              events: 0,
              avg_attended: null,
              no_show_rate: null,
            },
            FROM_20_TO_25: {
              events: 0,
              avg_attended: null,
              no_show_rate: null,
            },
            FROM_25: { events: 0, avg_attended: null, no_show_rate: null },
          }),
          without_weather: 0,
        }),
      ),
    );
    renderTab();
    expect(
      await screen.findByText("No hay eventos finalizados en este período"),
    ).toBeInTheDocument();
    expect(document.querySelector("[data-headline]")).toBeNull();
  });

  it("shows exact headline values for rainy, dry and without weather", async () => {
    respond(ok(stats()));
    renderTab();
    await ready();
    expect(slot("Con lluvia", "value")).toBe("80");
    expect(slot("Con lluvia", "subline")).toBe("31% no vinieron");
    // The rainy group has 12 events, at or above the small-sample threshold.
    expect(slot("Con lluvia", "sample")).toBeNull();
    expect(slot("Sin lluvia", "value")).toBe("120");
    expect(slot("Sin lluvia", "subline")).toBe("18% no vinieron");
    // 12 events is not a small sample, so no n; 3 events is.
    expect(slot("Sin lluvia", "sample")).toBe("n = 3");
    expect(slot("Sin clima", "value")).toBe("1");
    expect(slot("Sin clima", "comparison")).toBeNull();
    expect(document.querySelectorAll("[data-headline]")).toHaveLength(3);
  });

  it("shows a dash and no n for a group with no events", async () => {
    respond(
      ok(
        stats({
          dry: { events: 0, avg_attended: null, no_show_rate: null },
        }),
      ),
    );
    renderTab();
    await ready();
    expect(slot("Sin lluvia", "value")).toBe("–");
    expect(slot("Sin lluvia", "subline")).toBeNull();
    expect(slot("Sin lluvia", "sample")).toBeNull();
  });

  it("lists the five bands in order with events, average and no-show", async () => {
    respond(ok(stats()));
    renderTab();
    await ready();
    const card = screen.getByRole("region", {
      name: "Asistencia según temperatura",
    });
    const rows = within(card).getAllByRole("row").slice(1);
    expect(rows.map((r) => part(r, "band"))).toEqual([
      "< 10°",
      "10-15°",
      "15-20°",
      "20-25°",
      "25°+",
    ]);
    expect(rows.map((r) => part(r, "events"))).toEqual([
      "2",
      "0",
      "5",
      "6",
      "2",
    ]);
    expect(rows.map((r) => part(r, "avg"))).toEqual([
      "70",
      "–",
      "96",
      "110",
      "60",
    ]);
    expect(rows.map((r) => part(r, "rate-value"))).toEqual([
      "40%",
      "–",
      "25%",
      "20%",
      "50%",
    ]);
  });

  it("explains the scatter is too thin with fewer than two points", async () => {
    respond(
      ok(
        stats({
          meetups: [row(), row({ meetup_id: "m2", ...NO_WEATHER })],
        }),
      ),
    );
    renderTab();
    await ready();
    const card = screen.getByRole("region", {
      name: "Asistencia y temperatura",
    });
    expect(
      within(card).getByText("Hay pocos eventos con temperatura para graficar"),
    ).toBeInTheDocument();
  });

  it("charts the scatter and lists its points in date order", async () => {
    respond(ok(stats()));
    renderTab();
    await ready();
    const card = screen.getByRole("region", {
      name: "Asistencia y temperatura",
    });
    expect(card).not.toHaveTextContent("para graficar");
    const table = within(card).getByRole("table", { hidden: true });
    // A table ignores a width limit, so the sr-only class sits on its wrapper.
    expect(table).not.toHaveClass("sr-only");
    expect(table.parentElement).toHaveClass("sr-only");
    const [header, ...body] = within(table).getAllByRole("row", {
      hidden: true,
    });
    const texts = (row: HTMLElement) =>
      Array.from(row.children).map((c) => c.textContent);
    expect(texts(header!)).toEqual([
      "Evento",
      "Fecha",
      "Temperatura (°C)",
      "Vinieron",
    ]);
    expect(body.map(texts)).toEqual([
      ["Alter Febrero", "9 de feb de 2026", "25,4", "90"],
      ["Alter Marzo", "9 de mar de 2026", "18,2", "100"],
    ]);
  });

  it("defines a color for every series the charts paint", async () => {
    respond(ok(stats()));
    renderTab();
    await ready();
    // jsdom cannot see the paint, so check the CSS variables the marks use.
    const css = Array.from(document.querySelectorAll("[data-chart] style"))
      .map((el) => el.textContent)
      .join("");
    expect(css).toContain("--color-avg_attended: var(--chart-1);");
    expect(css).toContain("--color-attended: var(--chart-1);");
  });

  it("lists the events without weather in date order, linked to the event", async () => {
    respond(
      ok(
        stats({
          meetups: [
            row({ meetup_id: "late", name: "Alter Tarde", ...NO_WEATHER }),
            row({
              meetup_id: "early",
              name: "Alter Temprano",
              date: "2026-01-20T01:00:00Z",
              ...NO_WEATHER,
            }),
            row(),
          ],
          without_weather: 2,
        }),
      ),
    );
    renderTab();
    await ready();
    const items = within(
      screen.getByRole("region", { name: "Eventos sin clima" }),
    ).getAllByRole("listitem");
    expect(items.map((li) => part(li, "name"))).toEqual([
      "Alter Temprano",
      "Alter Tarde",
    ]);
    expect(items.map((li) => part(li, "date"))).toEqual([
      "19 de ene de 2026",
      "9 de mar de 2026",
    ]);
    expect(screen.getByRole("link", { name: "Alter Tarde" })).toHaveAttribute(
      "href",
      "/meetups/late",
    );
  });

  it("lists only events with no weather row, not events whose values are null", async () => {
    respond(
      ok(
        stats({
          meetups: [
            row({
              meetup_id: "partial",
              name: "Alter Parcial",
              avg_temperature: null,
              rained: null,
            }),
            row({ meetup_id: "none", name: "Alter Sin Clima", ...NO_WEATHER }),
          ],
          without_weather: 1,
        }),
      ),
    );
    renderTab();
    await ready();
    const items = within(
      screen.getByRole("region", { name: "Eventos sin clima" }),
    ).getAllByRole("listitem");
    expect(items.map((li) => part(li, "name"))).toEqual(["Alter Sin Clima"]);
  });

  it("hides the without-weather list when every event has weather", async () => {
    respond(ok(stats({ meetups: [row()], without_weather: 0 })));
    renderTab();
    await ready();
    expect(
      screen.queryByRole("region", { name: "Eventos sin clima" }),
    ).toBeNull();
  });

  it("always shows both notes in the aggregate", async () => {
    respond(ok(stats()));
    renderTab();
    await ready();
    expect(notes()).toEqual([
      "Clima de Open-Meteo para las 6 horas desde el inicio de cada evento, en su dirección. Los eventos sin ubicación o sin clima todavía quedan fuera de las comparaciones.",
      "Con pocos eventos por grupo, las diferencias pueden ser casualidad.",
    ]);
  });

  describe("one event", () => {
    const single = { meetupId: "m1" };

    function oneEvent(e: Event) {
      return stats({
        event: e,
        meetups: [],
        rainy: null,
        dry: null,
        temperature_bands: [],
        without_weather: 0,
      });
    }

    it("shows the weather card with the attended and no-show headlines", async () => {
      respond(ok(oneEvent(event())));
      renderTab({ query: single });
      await waitFor(() => headline("Vinieron"));
      expect(slot("Vinieron", "value")).toBe("140");
      expect(slot("No vinieron", "value")).toBe("15%");
      const card = screen.getByRole("region", { name: "Clima" });
      expect(part(card, "weather-temperature")).toBe("21,5 °C");
      expect(part(card, "weather-rain")).toBe("No llovió, 0,0 mm");
      expect(screen.queryByRole("button")).toBeNull();
      expect(notes()).toEqual([
        "Datos: Open-Meteo, las 6 horas desde el inicio",
      ]);
    });

    it.each([
      ["NO_LOCATION", "Un admin puede cargar la ubicación para ver el clima"],
      ["PENDING", "El clima se carga 2 horas después de que termina el evento"],
      ["NOT_FETCHED", "Todavía no se cargó el clima"],
    ] as const)("says why %s has no weather", async (status, text) => {
      respond(ok(oneEvent(event({ status, weather: null }))));
      renderTab({ query: single });
      await waitFor(() => headline("Vinieron"));
      const card = screen.getByRole("region", { name: "Clima" });
      expect(within(card).getByText(text)).toBeInTheDocument();
      expect(
        document.querySelector('[data-slot="weather-temperature"]'),
      ).toBeNull();
    });

    it.each([
      ["an org admin", "ADMIN", "USER"],
      ["a site admin", "USER", "SITE_ADMIN"],
    ])("tells %s to set the location", async (_who, orgRole, siteRole) => {
      mockOrgRole = orgRole;
      mockSiteRole = siteRole;
      respond(ok(oneEvent(event({ status: "NO_LOCATION", weather: null }))));
      renderTab({ query: single });
      await waitFor(() => headline("Vinieron"));
      expect(
        within(screen.getByRole("region", { name: "Clima" })).getByText(
          "Cargá la ubicación para ver el clima",
        ),
      ).toBeInTheDocument();
    });

    it("shows a dash when the event has no no-show rate", async () => {
      respond(ok(oneEvent(event({ no_show_rate: null }))));
      renderTab({ query: single });
      await waitFor(() => headline("Vinieron"));
      expect(slot("No vinieron", "value")).toBe("–");
    });
  });

  it("sends from, to and meetup_id to the API", async () => {
    respond(ok(stats()));
    renderTab({
      query: { from: "2026-03-01", to: "2026-04-01", meetupId: "m1" },
    });
    await waitFor(() => expect(statsCalls()).toHaveLength(1));
    expect(mockApiGet).toHaveBeenCalledWith(
      "/organizations/{org_id}/stats/weather",
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
    expect(screen.getByTestId("weather-skeleton")).toBeInTheDocument();
    expect(mockApiGet).not.toHaveBeenCalled();
  });
});
