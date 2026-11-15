import { WeatherTab } from "./WeatherTab";
import type { StatsTabProps } from "../../lib/statsTab";
import {
  ORG_ID,
  makeArrivalStats,
  makeEventWeatherStats,
  makeWeatherEvent,
  makeWeatherHours,
  makeWeatherMeetupRow,
  makeWeatherStats,
  makeWeatherWindow,
  type Role,
} from "@/tests/factories";
import {
  LAST_3_MONTHS,
  requestQuery,
  shouldHaveNotes,
  shouldHaveTable,
  shouldShowHeadline,
  stubArrivals,
  stubWeather,
  waitForAnimations,
} from "../../../../../cypress/support/routes/stats";

const BANDS = "Asistencia según temperatura";
const SCATTER = "Asistencia y temperatura";
const BY_HOUR = "Hora por hora";
const ONE_EVENT = { meetupId: "m1" };

/** The arrivals of the event, every quarter hour from its start. */
const EVENT_ARRIVALS = makeArrivalStats({
  curve: [
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
  ].map(([start_minute, arrivals]) => ({
    start_minute: start_minute!,
    arrivals: arrivals!,
  })),
});

const HOUR_TABLE_HEADER = [
  "Hora",
  "Clima",
  "Temperatura",
  "Sensación térmica",
  "Lluvia",
  "Llegadas",
];

function mountTab(
  props: Partial<StatsTabProps> = {},
  { path = "/stats", as = "orgAdmin" as Role } = {},
) {
  cy.mount(
    <WeatherTab
      orgId={ORG_ID}
      query={LAST_3_MONTHS}
      period={{ preset: "3m" }}
      onShowAll={cy.spy().as("onShowAll")}
      {...props}
    />,
    { lang: "es", path, as },
  );
}

/** Checks each column of the bands table, row by row. */
function shouldListBands(part: string, texts: string[]) {
  const bands = [
    "BELOW_10",
    "FROM_10_TO_15",
    "FROM_15_TO_20",
    "FROM_20_TO_25",
    "FROM_25",
  ];
  bands.forEach((band, i) => {
    cy.getBySel(`stats-band-${band}`)
      .findBySel(part)
      .should("have.text", texts[i]);
  });
}

describe("<WeatherTab />", () => {
  it("shows a skeleton while loading", () => {
    stubWeather(makeWeatherStats(), { delay: 1000 });
    mountTab();
    cy.getBySel("stats-weather-skeleton").should("be.visible");
    cy.wait("@getWeather");
    cy.getBySel("stats-weather-skeleton").should("not.exist");
  });

  it("waits without fetching while the filters are not ready", () => {
    mountTab({ query: null });
    cy.getBySel("stats-weather-skeleton").should("be.visible");
  });

  it("sends the period and the event to the API", () => {
    stubWeather();
    mountTab({
      query: { from: "2026-03-01", to: "2026-04-01", meetupId: "m1" },
    });
    requestQuery("@getWeather").should("deep.equal", {
      from: "2026-03-01",
      to: "2026-04-01",
      meetup_id: "m1",
    });
  });

  it("announces the error and retries the request", () => {
    cy.stubApiError("GET", "/organizations/{org_id}/stats/weather", {
      statusCode: 500,
    });
    mountTab();
    cy.getByRole("alert").should(
      "contain.text",
      "No se pudieron cargar las estadísticas.",
    );
    stubWeather();
    cy.getBySel("stats-retry").click();
    cy.wait("@getWeather");
    cy.getByRole("region", { name: BANDS }).should("be.visible");
  });

  it("shows the empty state when the period has no finalized events", () => {
    stubWeather(makeWeatherStats({ meetups: [] }));
    mountTab();
    cy.getBySel("stats-empty").should(
      "have.text",
      "No hay eventos finalizados en este período",
    );
  });

  describe("a period", () => {
    beforeEach(() => {
      stubWeather();
    });

    it("shows only the two temperature charts, without headline cards", () => {
      mountTab();
      cy.getByRole("region").should("have.length", 2);
      cy.getByRole("region", { name: BANDS }).should("be.visible");
      cy.getByRole("region", { name: SCATTER }).should("be.visible");
      cy.getBySelLike("stats-headline-").should("not.exist");
    });

    it("lists the five bands in order with events, average and no-show", () => {
      mountTab();
      shouldListBands("stats-band-name", [
        "< 10°",
        "10-15°",
        "15-20°",
        "20-25°",
        "25°+",
      ]);
      shouldListBands("stats-band-events", ["2", "0", "5", "6", "2"]);
      shouldListBands("stats-band-avg", ["70", "–", "96", "110", "60"]);
      shouldListBands("stats-rate-value", ["40%", "–", "25%", "20%", "50%"]);
    });

    it("charts the scatter and lists its points in date order", () => {
      mountTab();
      cy.getBySel("stats-no-temp-points").should("not.exist");
      shouldHaveTable(SCATTER, [
        ["Evento", "Fecha", "Temperatura (°C)", "Vinieron"],
        ["Alter Febrero", "10 de feb de 2026", "25,4", "90"],
        ["Alter Marzo", "10 de mar de 2026", "18,2", "100"],
      ]);
    });

    it("starts on the temperature during the event", () => {
      mountTab();
      cy.getByRole("group", {
        name: "Momento de la temperatura",
        native: false,
      }).within(() => {
        cy.getByRole("button", { name: "Durante" }).should(
          "have.attr",
          "aria-pressed",
          "true",
        );
        cy.getByRole("button", { name: "Antes del inicio" }).should(
          "have.attr",
          "aria-pressed",
          "false",
        );
      });
    });

    it("switches both charts to the temperature before the start", () => {
      mountTab();
      cy.getByRole("button", { name: "Antes del inicio" }).click();
      shouldListBands("stats-band-events", ["0", "3", "5", "6", "2"]);
      shouldHaveTable(SCATTER, [
        ["Evento", "Fecha", "Temperatura (°C)", "Vinieron"],
        ["Alter Febrero", "10 de feb de 2026", "27,1", "90"],
        ["Alter Marzo", "10 de mar de 2026", "21,6", "100"],
      ]);
    });

    it("opens on the before temperature from the URL", () => {
      mountTab({}, { path: "/stats?weather_window=before" });
      cy.getBySel("stats-weather-window-before").should(
        "have.attr",
        "aria-pressed",
        "true",
      );
      shouldListBands("stats-band-events", ["0", "3", "5", "6", "2"]);
    });

    it("defines a color for every series the charts paint", () => {
      mountTab();
      cy.getByRole("region", { name: BANDS })
        .getByRole("application")
        .should("be.visible");
      cy.document().should((doc) => {
        const css = Array.from(doc.querySelectorAll("style"))
          .map((el) => el.textContent)
          .join("");
        expect(css).to.contain("--color-avg_attended: var(--chart-1);");
        expect(css).to.contain("--color-attended: var(--chart-1);");
      });
    });

    it("explains the windows and the sample", () => {
      mountTab();
      shouldHaveNotes([
        "Clima de Open-Meteo en la dirección de cada evento: Durante son las 6 horas desde el inicio y Antes del inicio, las 3 horas previas. Los eventos sin ubicación o sin clima todavía quedan fuera.",
        "Con pocos eventos por grupo, las diferencias pueden ser casualidad.",
      ]);
    });

    it("shows a band's events in its tooltip, from the keyboard", () => {
      mountTab();
      cy.getByRole("button", { name: "Antes del inicio" }).focus();
      cy.press(Cypress.Keyboard.Keys.TAB);
      cy.getByRole("region", { name: BANDS })
        .getByRole("application")
        .should("have.focus");
      cy.getBySel("stats-tooltip").should(
        "have.text",
        "< 10°Promedio de asistentes: 70Eventos: 2",
      );
      // The empty 10 to 15° band has no bar and no tooltip.
      cy.press(Cypress.Keyboard.Keys.RIGHT);
      cy.press(Cypress.Keyboard.Keys.RIGHT);
      cy.getBySel("stats-tooltip").should(
        "have.text",
        "15-20°Promedio de asistentes: 96Eventos: 5",
      );
    });
  });

  it("explains the scatter is too thin with fewer than two points", () => {
    stubWeather(
      makeWeatherStats({
        meetups: [
          makeWeatherMeetupRow(),
          makeWeatherMeetupRow({
            meetup_id: "m2",
            avg_temperature: null,
            before_avg_temperature: null,
            has_weather: false,
          }),
        ],
      }),
    );
    mountTab();
    cy.getByRole("region", { name: SCATTER })
      .findBySel("stats-no-temp-points")
      .should("have.text", "Hay pocos eventos con temperatura para graficar");
  });

  describe("one event", () => {
    beforeEach(() => {
      stubWeather(makeEventWeatherStats());
      stubArrivals(EVENT_ARRIVALS);
    });

    it("shows the weather before and during the event, not its attendance", () => {
      mountTab({ query: ONE_EVENT });
      shouldShowHeadline("weather-before", {
        label: "Antes del inicio · 19:00 a 22:00",
        value: "4,1 mm de lluvia",
        subline: "13,0 °C, se sintió 10,0 °C",
      });
      shouldShowHeadline("weather-during", {
        label: "Durante · 22:00 a 04:00",
        value: "No llovió",
        subline: "12,0 °C, se sintió 9,0 °C",
      });
      cy.contains("Vinieron").should("not.exist");
    });

    it("says there is no data for a window the provider left empty", () => {
      stubWeather(
        makeEventWeatherStats(
          makeWeatherEvent({
            before: makeWeatherWindow({
              avg_temperature: null,
              avg_apparent_temperature: null,
              total_precipitation_mm: null,
              rained: null,
            }),
          }),
        ),
      );
      mountTab({ query: ONE_EVENT });
      shouldShowHeadline("weather-before", {
        value: "Sin dato",
        subline: null,
      });
    });

    it("splits the windows at the start hour for a start at half past", () => {
      const halfPast = makeWeatherHours()
        .concat(makeWeatherHours("2026-04-06T07:00:00.000Z").slice(0, 1))
        .map((h, i) => ({ ...h, offset_minutes: -210 + i * 60 }));
      stubWeather(makeEventWeatherStats(makeWeatherEvent({ hours: halfPast })));
      mountTab({ query: ONE_EVENT });
      shouldShowHeadline("weather-before", {
        label: "Antes del inicio · 19:00 a 22:00",
      });
      shouldShowHeadline("weather-during", {
        label: "Durante · 22:00 a 04:30",
      });
    });

    it("asks the arrivals for the same event and lists them hour by hour", () => {
      mountTab({ query: ONE_EVENT });
      requestQuery("@getArrivals").should("deep.equal", { meetup_id: "m1" });
      shouldHaveTable(BY_HOUR, [
        HOUR_TABLE_HEADER,
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

    it("titles each strip, names the shaded hours and leaves the icons to the table", () => {
      mountTab({ query: ONE_EVENT });
      cy.getByRole("region", { name: BY_HOUR }).within(() => {
        cy.contains("Llegadas cada 15 min").should("be.visible");
        cy.contains("Temperatura (°C)").should("be.visible");
        cy.contains("Lluvia (mm)").should("be.visible");
        cy.contains("Antes del inicio").should("be.visible");
        // The table already names each hour's weather; the icons would repeat it.
        cy.getByRole("img").should("not.exist");
        cy.getBySel("stats-weather-icon")
          .should("have.length", 8)
          .each(($img) => expect($img).to.have.attr("alt", ""));
      });
      cy.getBySel("stats-meteogram-rain").should("be.visible");
      cy.getBySel("stats-meteogram-no-rain").should("not.exist");
    });

    it("lets the keyboard reach the scrolling chart", () => {
      mountTab({ query: ONE_EVENT });
      cy.getByRole("group", { name: BY_HOUR, native: false }).should(
        "have.attr",
        "tabindex",
        "0",
      );
      cy.getByRole("group", { name: BY_HOUR, native: false }).focus();
      cy.getByRole("group", { name: BY_HOUR, native: false }).should(
        "have.focus",
      );
    });

    it("zooms the hourly chart in and out, wider per hour", () => {
      mountTab({ query: ONE_EVENT });
      const width = (px: string) =>
        cy
          .getBySel("stats-meteogram-content")
          .should("have.css", "min-width", px);
      // 9 hours at 48 px plus the 32 px axis.
      width("464px");
      // aria-disabled keeps focus on the button at the limit.
      cy.getByRole("button", { name: "Alejar" }).should(
        "have.attr",
        "aria-disabled",
        "true",
      );
      cy.getByRole("button", { name: "Alejar" }).focus();
      cy.getByRole("button", { name: "Alejar" }).click();
      width("464px");
      cy.getByRole("button", { name: "Alejar" }).should("have.focus");
      cy.getByRole("button", { name: "Acercar" }).click();
      width("680px");
      cy.getByRole("button", { name: "Acercar" }).click();
      width("1040px");
      cy.getByRole("button", { name: "Acercar" }).should(
        "have.attr",
        "aria-disabled",
        "true",
      );
      cy.getByRole("button", { name: "Alejar" }).click();
      width("680px");
    });

    it("shows an hour's weather in the tooltip on hover", () => {
      mountTab({ query: ONE_EVENT });
      cy.getBySel("stats-meteogram-temperature")
        .getByRole("application")
        .then(($svg) => {
          const width = $svg.width()!;
          // The middle of the 4th hour (22:00) on the plot, right of the axis.
          cy.wrap($svg).trigger("mousemove", 32 + (3.5 * (width - 32)) / 9, 40);
        });
      cy.getBySel("stats-tooltip-title").should("have.text", "22:00");
      cy.getBySel("stats-tooltip-line").should(($lines) => {
        expect($lines.toArray().map((li) => li.textContent)).to.deep.equal([
          "Temperatura12,5 °C",
          "Sensación térmica9,5 °C",
        ]);
      });
    });

    it("walks the hours of the strips with the keyboard", () => {
      mountTab({ query: ONE_EVENT });
      cy.getByRole("button", { name: "Acercar" }).focus();
      // The scrolling chart first, then each strip.
      cy.press(Cypress.Keyboard.Keys.TAB);
      cy.getByRole("group", { name: BY_HOUR, native: false }).should(
        "have.focus",
      );
      cy.press(Cypress.Keyboard.Keys.TAB);
      cy.getBySel("stats-tooltip-title").should("have.text", "19:00");
      cy.getBySel("stats-tooltip-line").should(($lines) => {
        expect($lines.toArray().map((li) => li.textContent)).to.deep.equal([
          "Temperatura14,0 °C",
          "Sensación térmica11,0 °C",
        ]);
      });
      cy.press(Cypress.Keyboard.Keys.TAB);
      cy.getBySel("stats-meteogram-rain")
        .getByRole("application")
        .should("have.focus");
      cy.press(Cypress.Keyboard.Keys.RIGHT);
      cy.getBySel("stats-tooltip-title").should("have.text", "20:00");
      cy.getBySel("stats-tooltip-line").should("have.text", "Lluvia2,0 mm");
      // An arrivals bar is titled with its quarter hour.
      cy.press(Cypress.Keyboard.Keys.TAB);
      cy.getBySel("stats-tooltip-title").should("have.text", "19:30 a 19:45");
      cy.getBySel("stats-tooltip-line").should("have.text", "Llegadas1");
    });

    it("keeps the weather when the arrivals fail", () => {
      cy.stubApiError("GET", "/organizations/{org_id}/stats/arrivals", {
        statusCode: 500,
      });
      mountTab({ query: ONE_EVENT });
      cy.getBySel("stats-meteogram-arrivals-note").should(
        "have.text",
        "No se pudieron cargar las llegadas.",
      );
      cy.getByRole("table", { name: BY_HOUR }).should(($table) => {
        const firstHour = ($table[0] as HTMLTableElement).rows[1]!;
        expect(Array.from(firstHour.cells, (c) => c.textContent)).to.deep.equal(
          ["19:00", "Lluvia", "14,0 °C", "11,0 °C", "1,5 mm", "–"],
        );
      });
    });

    it("shows a placeholder for the arrivals while they load", () => {
      stubArrivals(EVENT_ARRIVALS, { delay: 1500 });
      mountTab({ query: ONE_EVENT });
      cy.getBySel("stats-meteogram-arrivals-skeleton").should("be.visible");
      cy.getByRole("table", { name: BY_HOUR }).should(($table) => {
        expect(
          ($table[0] as HTMLTableElement).rows[4]!.cells[5]!.textContent,
        ).to.equal("–");
      });
      cy.wait("@getArrivals");
      cy.getBySel("stats-meteogram-arrivals-skeleton").should("not.exist");
      cy.getBySel("stats-meteogram-arrivals").should("be.visible");
    });

    it("says it did not rain instead of drawing an empty rain strip", () => {
      const dry = makeWeatherHours().map((h) => ({
        ...h,
        precipitation_mm: 0,
      }));
      stubWeather(makeEventWeatherStats(makeWeatherEvent({ hours: dry })));
      mountTab({ query: ONE_EVENT });
      cy.getBySel("stats-meteogram-no-rain").should(
        "have.text",
        "No llovió en estas horas.",
      );
      cy.getBySel("stats-meteogram-rain").should("not.exist");
    });

    it("says when nobody arrived in the charted hours", () => {
      stubArrivals(makeArrivalStats({ curve: [] }));
      mountTab({ query: ONE_EVENT });
      cy.getBySel("stats-meteogram-arrivals-note").should(
        "have.text",
        "Nadie llegó en estas horas.",
      );
      cy.getBySel("stats-meteogram-arrivals").should("not.exist");
    });

    it("cites the source and the hours it covers", () => {
      mountTab({ query: ONE_EVENT });
      shouldHaveNotes([
        "Clima de Open-Meteo en la dirección del evento, desde 3 horas antes del inicio hasta 6 horas después. Las llegadas van cada 15 minutos.",
      ]);
    });

    it("has no accessibility violations", () => {
      mountTab({ query: ONE_EVENT });
      cy.getBySel("stats-meteogram-arrivals").should("be.visible");
      waitForAnimations();
      cy.checkA11yAA();
    });
  });

  describe("one event without weather", () => {
    const noWeather = (status: "NO_LOCATION" | "PENDING" | "NOT_FETCHED") =>
      makeEventWeatherStats(
        makeWeatherEvent({ status, weather: null, before: null, hours: [] }),
      );

    (
      [
        ["NO_LOCATION", "Un admin puede cargar la ubicación para ver el clima"],
        [
          "PENDING",
          "El clima se carga 2 horas después de que termina el evento",
        ],
        ["NOT_FETCHED", "Todavía no se cargó el clima"],
      ] as const
    ).forEach(([status, text]) => {
      it(`says why ${status} has no weather`, () => {
        stubWeather(noWeather(status));
        mountTab({ query: ONE_EVENT }, { as: "staff" });
        cy.getByRole("region", { name: "Clima" })
          .findBySel("weather-reason")
          .should("have.text", text);
        cy.getBySelLike("stats-headline-").should("not.exist");
        cy.getByRole("region", { name: BY_HOUR }).should("not.exist");
      });
    });

    (["orgAdmin", "siteAdmin"] as const).forEach((role) => {
      it(`tells ${role === "orgAdmin" ? "an org admin" : "a site admin"} to set the location`, () => {
        stubWeather(noWeather("NO_LOCATION"));
        mountTab({ query: ONE_EVENT }, { as: role });
        cy.getByRole("region", { name: "Clima" })
          .findBySel("weather-reason")
          .should("have.text", "Cargá la ubicación para ver el clima");
      });
    });
  });
});
