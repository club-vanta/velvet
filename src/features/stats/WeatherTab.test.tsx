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
type Event = components["schemas"]["WeatherEventPublic"];
type Hour = components["schemas"]["WeatherHourPublic"];
type MeetupWeather = components["schemas"]["MeetupWeatherPublic"];
type Arrivals = components["schemas"]["ArrivalStatsPublic"];

function row(overrides: Partial<Row> = {}): Row {
  return {
    meetup_id: "m1",
    name: "Alter Marzo",
    date: "2026-03-10T01:00:00Z",
    has_weather: true,
    attended: 100,
    no_show_rate: 0.2,
    avg_temperature: 18.2,
    before_avg_temperature: 21.6,
    rained: false,
    total_precipitation_mm: 0,
    ...overrides,
  };
}

const NO_WEATHER = {
  has_weather: false,
  avg_temperature: null,
  before_avg_temperature: null,
  rained: null,
  total_precipitation_mm: null,
} as const;

const EMPTY_BAND = { events: 0, avg_attended: null, no_show_rate: null };

function bands(overrides: Partial<Record<Band["band"], Partial<Band>>> = {}) {
  const base: Band[] = [
    { band: "BELOW_10", events: 2, avg_attended: 70, no_show_rate: 0.4 },
    { band: "FROM_10_TO_15", ...EMPTY_BAND },
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

const BANDS_BEFORE = bands({
  BELOW_10: EMPTY_BAND,
  FROM_10_TO_15: { events: 3, avg_attended: 84, no_show_rate: 0.3 },
});

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
        before_avg_temperature: 27.1,
      }),
      row({
        meetup_id: "m2",
        name: "Alter Abril",
        date: "2026-04-02T01:00:00Z",
        ...NO_WEATHER,
      }),
    ],
    temperature_bands: bands(),
    temperature_bands_before: BANDS_BEFORE,
    comparison_kind: null,
    comparison: null,
    ...overrides,
  };
}

const MEETUP_WEATHER: MeetupWeather = {
  avg_temperature: 12,
  avg_apparent_temperature: 9,
  total_precipitation_mm: 0,
  max_wind_kmh: 12,
  rained: false,
  fetched_at: "2026-04-06T10:00:00Z",
  source: "open-meteo-historical-forecast",
};

// A 22:00 event in Buenos Aires (01:00 UTC): 19:00 through 03:00 local.
const TEMPS = [14, 13, 12, 12.5, 12, 11.5, 11, 10.5, 10];
const FEELS = [11, 10, 9.5, 9.5, 9, 8.5, 8, 8, 7.5];
const RAIN = [1.5, 2, 0.6, 0, 0, 0, 0, 0, 0];
const CODES = [63, 63, 51, 3, 2, 0, 0, 0, null];

const HOURS: Hour[] = TEMPS.map((temperature, i) => ({
  time: new Date(Date.UTC(2026, 3, 5, 22 + i)).toISOString(),
  offset_minutes: (i - 3) * 60,
  temperature,
  apparent_temperature: FEELS[i]!,
  precipitation_mm: RAIN[i]!,
  weather_code: CODES[i]!,
  is_day: false,
}));

function event(overrides: Partial<Event> = {}): Event {
  return {
    status: "OK",
    ready: true,
    weather: MEETUP_WEATHER,
    before: {
      avg_temperature: 13,
      avg_apparent_temperature: 10,
      total_precipitation_mm: 4.1,
      rained: true,
    },
    hours: HOURS,
    ...overrides,
  };
}

function arrivals(): Arrivals {
  const curve = [
    [-240, 3],
    [-150, 1],
    [-30, 2],
    [-15, 4],
    [0, 9],
    [15, 12],
    [30, 10],
    [45, 7],
    [60, 5],
    [400, 2],
  ].map(([start_minute, n]) => ({ start_minute: start_minute!, arrivals: n! }));
  return {
    curve,
    clock_curve: [],
    summary: {
      arrivals: 55,
      excluded_arrivals: 0,
      peak: { start_minute: 15, arrivals: 12 },
      peak_local_time: "22:15",
      mean_minutes: 20,
      p90_minutes: 50,
      mean_local_time: "22:20",
      p90_local_time: "22:50",
      first_hour_share: 0.7,
    },
    lead_time: [],
    comparison_kind: null,
    comparison: null,
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

const ok = (data: unknown) => Promise.resolve({ data, error: undefined });
const failed = () =>
  Promise.resolve({ data: undefined, error: { detail: "nope" } });
const WEATHER_PATH = "/organizations/{org_id}/stats/weather";
const ARRIVALS_PATH = "/organizations/{org_id}/stats/arrivals";

/** Answers the weather endpoint with `weather` and the arrivals endpoint with `arrivalsResult`. */
function respond(weather: unknown, arrivalsResult: unknown = ok(arrivals())) {
  mockApiGet.mockImplementation((path: string) =>
    path === ARRIVALS_PATH ? arrivalsResult : weather,
  );
}

const part = (el: Element, name: string) =>
  el.querySelector(`[data-slot="${name}"]`)?.textContent ?? null;

function headline(label: string): HTMLElement {
  const card = Array.from(
    document.querySelectorAll<HTMLElement>("[data-headline]"),
  ).find((el) => part(el, "label") === label);
  if (!card) throw new Error(`No headline ${label}`);
  return card;
}

const statsCalls = () =>
  mockApiGet.mock.calls.filter(([path]) => path === WEATHER_PATH);

const region = (name: string) => screen.getByRole("region", { name });

const ready = () => waitFor(() => region("Asistencia según temperatura"));

const notes = () =>
  Array.from(document.querySelectorAll("blockquote")).map(
    (el) => el.textContent,
  );

const texts = (r: HTMLElement) =>
  Array.from(r.children).map((c) => c.textContent);

function tableRows(card: HTMLElement) {
  const table = within(card).getByRole("table", { hidden: true });
  const [header, ...body] = within(table).getAllByRole("row", {
    hidden: true,
  });
  return { header: texts(header!), body: body.map(texts) };
}

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
    respond(failed());
    renderTab();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No se pudieron cargar las estadísticas.",
    );
    await user.click(screen.getByRole("button", { name: "Reintentar" }));
    await waitFor(() => expect(statsCalls()).toHaveLength(2));
  });

  it("shows the empty state when the period has no finalized events", async () => {
    respond(ok(stats({ meetups: [] })));
    renderTab();
    expect(
      await screen.findByText("No hay eventos finalizados en este período"),
    ).toBeInTheDocument();
  });

  it("shows only the two temperature charts, without headline cards", async () => {
    respond(ok(stats()));
    renderTab();
    await ready();
    expect(document.querySelector("[data-headline]")).toBeNull();
    expect(screen.getAllByRole("region")).toHaveLength(2);
    expect(region("Asistencia y temperatura")).toBeInTheDocument();
    expect(screen.queryByText("Con lluvia")).toBeNull();
    expect(screen.queryByText("Sin lluvia")).toBeNull();
    expect(screen.queryByText("Sin clima")).toBeNull();
  });

  it("lists the five bands in order with events, average and no-show", async () => {
    respond(ok(stats()));
    renderTab();
    await ready();
    const rows = within(region("Asistencia según temperatura"))
      .getAllByRole("row")
      .slice(1);
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
      ok(stats({ meetups: [row(), row({ meetup_id: "m2", ...NO_WEATHER })] })),
    );
    renderTab();
    await ready();
    expect(
      within(region("Asistencia y temperatura")).getByText(
        "Hay pocos eventos con temperatura para graficar",
      ),
    ).toBeInTheDocument();
  });

  it("charts the scatter and lists its points in date order", async () => {
    respond(ok(stats()));
    renderTab();
    await ready();
    const card = region("Asistencia y temperatura");
    expect(card).not.toHaveTextContent("para graficar");
    const table = within(card).getByRole("table", { hidden: true });
    // A table ignores a width limit, so the sr-only class sits on its wrapper.
    expect(table).not.toHaveClass("sr-only");
    expect(table.parentElement).toHaveClass("sr-only");
    const { header, body } = tableRows(card);
    expect(header).toEqual(["Evento", "Fecha", "Temperatura (°C)", "Vinieron"]);
    expect(body).toEqual([
      ["Alter Febrero", "9 de feb de 2026", "25,4", "90"],
      ["Alter Marzo", "9 de mar de 2026", "18,2", "100"],
    ]);
  });

  it("starts on the temperature during the event", async () => {
    respond(ok(stats()));
    renderTab();
    await ready();
    const toggle = screen.getByRole("group", {
      name: "Momento de la temperatura",
    });
    expect(
      within(toggle).getByRole("button", { name: "Durante" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      within(toggle).getByRole("button", { name: "Antes del inicio" }),
    ).toHaveAttribute("aria-pressed", "false");
  });

  it("switches both charts to the temperature before the start", async () => {
    const user = userEvent.setup();
    respond(ok(stats()));
    renderTab();
    await ready();
    await user.click(screen.getByRole("button", { name: "Antes del inicio" }));
    const rows = within(region("Asistencia según temperatura"))
      .getAllByRole("row")
      .slice(1);
    expect(rows.map((r) => part(r, "events"))).toEqual([
      "0",
      "3",
      "5",
      "6",
      "2",
    ]);
    expect(tableRows(region("Asistencia y temperatura")).body).toEqual([
      ["Alter Febrero", "9 de feb de 2026", "27,1", "90"],
      ["Alter Marzo", "9 de mar de 2026", "21,6", "100"],
    ]);
  });

  it("opens on the before temperature from the URL", async () => {
    respond(ok(stats()));
    renderTab({}, "/stats?weather_window=before");
    await ready();
    expect(
      screen.getByRole("button", { name: "Antes del inicio" }),
    ).toHaveAttribute("aria-pressed", "true");
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

  it("explains the windows and the sample in the aggregate", async () => {
    respond(ok(stats()));
    renderTab();
    await ready();
    expect(notes()).toEqual([
      "Clima de Open-Meteo en la dirección de cada evento: Durante son las 6 horas desde el inicio y Antes del inicio, las 3 horas previas. Los eventos sin ubicación o sin clima todavía quedan fuera.",
      "Con pocos eventos por grupo, las diferencias pueden ser casualidad.",
    ]);
  });

  describe("one event", () => {
    const single = { meetupId: "m1" };

    function oneEvent(e: Event) {
      return stats({
        event: e,
        meetups: [],
        temperature_bands: [],
        temperature_bands_before: [],
      });
    }

    const eventReady = () =>
      waitFor(() => headline("Antes del inicio · 19:00 a 22:00"));

    it("shows the weather before and during the event, not its attendance", async () => {
      respond(ok(oneEvent(event())));
      renderTab({ query: single });
      await eventReady();
      const before = headline("Antes del inicio · 19:00 a 22:00");
      expect(part(before, "value")).toBe("4,1 mm de lluvia");
      expect(part(before, "subline")).toBe("13,0 °C, se sintió 10,0 °C");
      const during = headline("Durante · 22:00 a 04:00");
      expect(part(during, "value")).toBe("No llovió");
      expect(part(during, "subline")).toBe("12,0 °C, se sintió 9,0 °C");
      expect(document.querySelectorAll("[data-headline]")).toHaveLength(2);
      expect(screen.queryByText("Vinieron")).toBeNull();
    });

    it("says there is no data for a window the provider left empty", async () => {
      respond(
        ok(
          oneEvent(
            event({
              before: {
                avg_temperature: null,
                avg_apparent_temperature: null,
                total_precipitation_mm: null,
                rained: null,
              },
            }),
          ),
        ),
      );
      renderTab({ query: single });
      await eventReady();
      const before = headline("Antes del inicio · 19:00 a 22:00");
      expect(part(before, "value")).toBe("Sin dato");
      expect(part(before, "subline")).toBeNull();
    });

    it("lists every hour with its weather and the arrivals in it", async () => {
      respond(ok(oneEvent(event())));
      renderTab({ query: single });
      await eventReady();
      const card = region("Hora por hora");
      await waitFor(() => expect(tableRows(card).body[3]![5]).toBe("38"));
      const { header, body } = tableRows(card);
      expect(header).toEqual([
        "Hora",
        "Clima",
        "Temperatura",
        "Sensación térmica",
        "Lluvia",
        "Llegadas",
      ]);
      expect(body).toEqual([
        ["19:00", "Lluvia", "14,0 °C", "11,0 °C", "1,5 mm", "1"],
        ["20:00", "Lluvia", "13,0 °C", "10,0 °C", "2,0 mm", "0"],
        ["21:00", "Llovizna", "12,0 °C", "9,5 °C", "0,6 mm", "6"],
        ["22:00", "Nublado", "12,5 °C", "9,5 °C", "0,0 mm", "38"],
        ["23:00", "Parcialmente nublado", "12,0 °C", "9,0 °C", "0,0 mm", "5"],
        ["00:00", "Despejado", "11,5 °C", "8,5 °C", "0,0 mm", "0"],
        ["01:00", "Despejado", "11,0 °C", "8,0 °C", "0,0 mm", "0"],
        ["02:00", "Despejado", "10,5 °C", "8,0 °C", "0,0 mm", "0"],
        ["03:00", "–", "10,0 °C", "7,5 °C", "0,0 mm", "0"],
      ]);
    });

    it("leaves the icons to the text table for screen readers", async () => {
      respond(ok(oneEvent(event())));
      renderTab({ query: single });
      await eventReady();
      const card = region("Hora por hora");
      // The table already names each hour's weather; the icons would repeat it.
      expect(within(card).queryAllByRole("img")).toEqual([]);
      expect(card.querySelectorAll('img[alt=""]')).toHaveLength(8);
    });

    it("splits the windows at the start hour for a start at half past", async () => {
      // 22:30 in Buenos Aires: 19:00 through 04:00 local, offsets -210 to 330.
      const halfPast = Array.from({ length: 10 }, (_, i) => ({
        ...HOURS[0]!,
        time: new Date(Date.UTC(2026, 3, 5, 22 + i)).toISOString(),
        offset_minutes: -210 + i * 60,
      }));
      respond(ok(oneEvent(event({ hours: halfPast }))));
      renderTab({ query: single });
      await waitFor(() => headline("Antes del inicio · 19:00 a 22:00"));
      expect(headline("Durante · 22:00 a 04:30")).toBeInTheDocument();
    });

    it("lets the keyboard reach the scrolling chart", async () => {
      respond(ok(oneEvent(event())));
      renderTab({ query: single });
      await eventReady();
      const scroller = screen.getByRole("group", { name: "Hora por hora" });
      expect(scroller).toHaveAttribute("tabindex", "0");
    });

    it("asks the arrivals for the same event", async () => {
      respond(ok(oneEvent(event())));
      renderTab({ query: single });
      await eventReady();
      await waitFor(() =>
        expect(mockApiGet).toHaveBeenCalledWith(ARRIVALS_PATH, {
          params: {
            path: { org_id: "org-1" },
            query: expect.objectContaining({ meetup_id: "m1" }),
          },
        }),
      );
    });

    it("keeps the weather when the arrivals fail", async () => {
      respond(ok(oneEvent(event())), failed());
      renderTab({ query: single });
      await eventReady();
      const card = region("Hora por hora");
      expect(
        await within(card).findByText("No se pudieron cargar las llegadas."),
      ).toBeInTheDocument();
      expect(tableRows(card).body[0]).toEqual([
        "19:00",
        "Lluvia",
        "14,0 °C",
        "11,0 °C",
        "1,5 mm",
        "–",
      ]);
    });

    it("says when nobody arrived in the charted hours", async () => {
      respond(ok(oneEvent(event())), ok({ ...arrivals(), curve: [] }));
      renderTab({ query: single });
      await eventReady();
      expect(
        await screen.findByText("Nadie llegó en estas horas."),
      ).toBeInTheDocument();
    });

    it("zooms the hourly chart in and out, wider per hour", async () => {
      const user = userEvent.setup();
      respond(ok(oneEvent(event())));
      renderTab({ query: single });
      await eventReady();
      const content = screen.getByTestId("meteogram-content");
      const zoomIn = screen.getByRole("button", { name: "Acercar" });
      const zoomOut = screen.getByRole("button", { name: "Alejar" });
      // 9 hours at 48 px plus the 32 px axis.
      expect(content).toHaveStyle({ minWidth: "464px" });
      // aria-disabled keeps focus on the button at the limit.
      expect(zoomOut).toHaveAttribute("aria-disabled", "true");
      zoomOut.focus();
      await user.click(zoomOut);
      expect(content).toHaveStyle({ minWidth: "464px" });
      expect(zoomOut).toHaveFocus();
      await user.click(zoomIn);
      expect(content).toHaveStyle({ minWidth: "680px" });
      await user.click(zoomIn);
      expect(content).toHaveStyle({ minWidth: "1040px" });
      expect(zoomIn).toHaveAttribute("aria-disabled", "true");
      await user.click(zoomOut);
      expect(content).toHaveStyle({ minWidth: "680px" });
    });

    it("shows a placeholder for the arrivals while they load", async () => {
      respond(ok(oneEvent(event())), new Promise(() => {}));
      renderTab({ query: single });
      await eventReady();
      expect(
        screen.getByTestId("meteogram-arrivals-skeleton"),
      ).toBeInTheDocument();
      expect(tableRows(region("Hora por hora")).body[3]![5]).toBe("–");
    });

    it.each([
      ["NO_LOCATION", "Un admin puede cargar la ubicación para ver el clima"],
      ["PENDING", "El clima se carga 2 horas después de que termina el evento"],
      ["NOT_FETCHED", "Todavía no se cargó el clima"],
    ] as const)("says why %s has no weather", async (status, text) => {
      respond(
        ok(oneEvent(event({ status, weather: null, before: null, hours: [] }))),
      );
      renderTab({ query: single });
      const card = await screen.findByRole("region", { name: "Clima" });
      expect(within(card).getByText(text)).toBeInTheDocument();
      expect(document.querySelector("[data-headline]")).toBeNull();
      expect(
        screen.queryByRole("region", { name: "Hora por hora" }),
      ).toBeNull();
    });

    it.each([
      ["an org admin", "ADMIN", "USER"],
      ["a site admin", "USER", "SITE_ADMIN"],
    ])("tells %s to set the location", async (_who, orgRole, siteRole) => {
      mockOrgRole = orgRole;
      mockSiteRole = siteRole;
      respond(
        ok(
          oneEvent(
            event({
              status: "NO_LOCATION",
              weather: null,
              before: null,
              hours: [],
            }),
          ),
        ),
      );
      renderTab({ query: single });
      expect(
        within(await screen.findByRole("region", { name: "Clima" })).getByText(
          "Cargá la ubicación para ver el clima",
        ),
      ).toBeInTheDocument();
    });

    it("cites the source and the hours it covers", async () => {
      respond(ok(oneEvent(event())));
      renderTab({ query: single });
      await eventReady();
      expect(notes()).toEqual([
        "Clima de Open-Meteo en la dirección del evento, desde 3 horas antes del inicio hasta 6 horas después. Las llegadas van cada 15 minutos.",
      ]);
    });
  });

  it("sends from, to and meetup_id to the API", async () => {
    respond(ok(stats()));
    renderTab({
      query: { from: "2026-03-01", to: "2026-04-01", meetupId: "m1" },
    });
    await waitFor(() => expect(statsCalls()).toHaveLength(1));
    expect(mockApiGet).toHaveBeenCalledWith(WEATHER_PATH, {
      params: {
        path: { org_id: "org-1" },
        query: { from: "2026-03-01", to: "2026-04-01", meetup_id: "m1" },
      },
    });
  });

  it("waits without fetching while the query is null", () => {
    respond(ok(stats()));
    renderTab({ query: null });
    expect(screen.getByTestId("weather-skeleton")).toBeInTheDocument();
    expect(mockApiGet).not.toHaveBeenCalled();
  });
});
