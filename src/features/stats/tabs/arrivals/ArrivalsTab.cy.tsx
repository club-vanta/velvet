import { ArrivalsTab } from "./ArrivalsTab";
import type { StatsTabProps } from "../../lib/statsTab";
import {
  ORG_ID,
  makeArrivalStats,
  makeArrivalSummary,
  makeEmptyArrivalSummary,
  makeLeadTimeRows,
} from "@/tests/factories";
import {
  LAST_3_MONTHS,
  requestQuery,
  shouldHaveNotes,
  shouldHaveTable,
  shouldShowHeadline,
  stubArrivals,
  waitForAnimations,
} from "../../../../../cypress/support/routes/stats";

const CURVE = "Llegadas cada 15 minutos";
const LEAD = "Con cuánta anticipación se anotan";

/** Every lead-time bucket with nobody in it. */
const NO_SIGNUPS = makeLeadTimeRows().map((r) => ({
  ...r,
  signed_up: 0,
  cancelled: 0,
  no_show: 0,
  no_show_rate: null,
}));

function mountTab(
  props: Partial<StatsTabProps> = {},
  { path = "/stats", lang = "es" as "es" | "en" } = {},
) {
  cy.mount(
    <ArrivalsTab
      orgId={ORG_ID}
      query={LAST_3_MONTHS}
      period={{ preset: "3m" }}
      onShowAll={cy.spy().as("onShowAll")}
      {...props}
    />,
    { lang, path },
  );
}

describe("<ArrivalsTab />", () => {
  it("shows a skeleton while loading", () => {
    stubArrivals(makeArrivalStats(), { delay: 1000 });
    mountTab();
    cy.getBySel("stats-arrivals-skeleton").should("be.visible");
    cy.wait("@getArrivals");
    cy.getBySel("stats-arrivals-skeleton").should("not.exist");
  });

  it("waits without fetching while the filters are not ready", () => {
    mountTab({ query: null });
    cy.getBySel("stats-arrivals-skeleton").should("be.visible");
  });

  it("sends the period and the event to the API", () => {
    stubArrivals();
    mountTab({
      query: { from: "2026-03-01", to: "2026-04-01", meetupId: "m1" },
    });
    requestQuery("@getArrivals").should("deep.equal", {
      from: "2026-03-01",
      to: "2026-04-01",
      meetup_id: "m1",
    });
  });

  it("announces the error and retries the request", () => {
    cy.stubApiError("GET", "/organizations/{org_id}/stats/arrivals", {
      statusCode: 500,
    });
    mountTab();
    cy.getByRole("alert").should(
      "contain.text",
      "No se pudieron cargar las estadísticas.",
    );
    stubArrivals();
    cy.getBySel("stats-retry").click();
    cy.wait("@getArrivals");
    cy.getBySel("stats-headline-mean-arrival").should("be.visible");
  });

  it("shows the empty state when nobody arrived and nobody signed up", () => {
    stubArrivals(
      makeArrivalStats({
        curve: [],
        summary: makeEmptyArrivalSummary(),
        lead_time: NO_SIGNUPS,
      }),
    );
    mountTab();
    cy.getBySel("stats-empty").should(
      "have.text",
      "No hay eventos finalizados en este período",
    );
    cy.getBySel("stats-headline-mean-arrival").should("not.exist");
    cy.getByRole("heading").should("not.exist");
    cy.getByRole("table").should("not.exist");
  });

  it("shows exact headline values against the previous period", () => {
    stubArrivals(
      makeArrivalStats({
        comparison_kind: "PREVIOUS_PERIOD",
        comparison: makeArrivalSummary({
          mean_minutes: 40,
          p90_minutes: 90,
          first_hour_share: 0.8,
        }),
      }),
    );
    mountTab();
    cy.getByRole("heading", { name: CURVE }).should("match", "h2");
    shouldShowHeadline("mean-arrival", {
      label: "Hora promedio de llegada",
      value: "22:45",
      subline: "45 min después del inicio",
      comparison: "+5 min respecto al período anterior",
    });
    shouldShowHeadline("busiest-quarter", {
      label: "Franja con más llegadas",
      value: "22:30-22:45",
      subline: "30 min después del inicio",
      comparison: null,
    });
    shouldShowHeadline("ninety-arrived", {
      label: "El 90% llegó antes de las",
      value: "23:30",
      subline: "1 h 30 min después del inicio",
      comparison: "0 min respecto al período anterior",
    });
    shouldShowHeadline("first-hour", {
      label: "Llegó en la primera hora",
      value: "86%",
      subline: null,
      comparison: "+6 puntos respecto al período anterior",
      sample: null,
    });
  });

  it("says when a time falls before or right at the start", () => {
    stubArrivals(
      makeArrivalStats({
        summary: makeArrivalSummary({
          peak: { start_minute: 0, arrivals: 40 },
          mean_minutes: -20,
        }),
      }),
    );
    mountTab();
    shouldShowHeadline("mean-arrival", { subline: "20 min antes del inicio" });
    shouldShowHeadline("busiest-quarter", { subline: "justo al inicio" });
  });

  it("uses clock times and the period average for one event", () => {
    stubArrivals(
      makeArrivalStats({
        curve: [{ start_minute: 30, arrivals: 40 }],
        summary: makeArrivalSummary({
          peak_local_time: "23:30",
          mean_local_time: "23:45",
          p90_local_time: "00:30",
        }),
        comparison_kind: "PERIOD_AVERAGE",
        comparison: makeArrivalSummary({
          mean_local_time: "00:05",
          p90_local_time: "00:35",
        }),
      }),
    );
    mountTab({ query: { meetupId: "m1" } });
    shouldShowHeadline("busiest-quarter", { value: "23:30-23:45" });
    shouldShowHeadline("mean-arrival", {
      value: "23:45",
      subline: "45 min después del inicio",
      comparison: "En todos los eventos de los últimos 3 meses: 00:05",
    });
    shouldShowHeadline("ninety-arrived", {
      value: "00:30",
      comparison: "En todos los eventos de los últimos 3 meses: 00:35",
    });
    shouldShowHeadline("first-hour", {
      comparison: "En todos los eventos de los últimos 3 meses: 86%",
    });
  });

  it("shows dashes and says nobody checked in when there are no arrivals", () => {
    stubArrivals(
      makeArrivalStats({
        curve: [],
        clock_curve: [],
        summary: makeEmptyArrivalSummary(),
      }),
    );
    mountTab();
    for (const name of [
      "mean-arrival",
      "busiest-quarter",
      "ninety-arrived",
      "first-hour",
    ]) {
      shouldShowHeadline(name, { value: "–" });
    }
    shouldShowHeadline("mean-arrival", { subline: null });
    shouldShowHeadline("first-hour", { sample: null });
    // Nothing to switch between without arrivals.
    cy.getBySel("stats-arrivals-view").should("not.exist");
    cy.getBySel("stats-no-arrivals").should("have.text", "Nadie ingresó");
    cy.getBySel("stats-lead-row-SAME_DAY").should("be.visible");
    cy.contains("NaN").should("not.exist");
  });

  it("shows n under the first-hour share when few people arrived", () => {
    stubArrivals(
      makeArrivalStats({ summary: makeArrivalSummary({ arrivals: 5 }) }),
    );
    mountTab();
    shouldShowHeadline("first-hour", { sample: "n = 5" });
  });

  it("lists the lead times in a table named after its card, dimming small rates", () => {
    stubArrivals();
    mountTab();
    cy.getByRole("table", { name: LEAD })
      .getByRole("columnheader")
      .should(($th) => {
        expect($th.toArray().map((th) => th.textContent)).to.deep.equal([
          "Anticipación",
          "Anotados",
          "No vinieron",
        ]);
      });
    cy.getBySel("stats-lead-row-SAME_DAY").within(() => {
      cy.getBySel("stats-lead-bucket").should("have.text", "El mismo día");
      cy.getBySel("stats-lead-signed-up").should("have.text", "120");
      cy.getBySel("stats-rate")
        .should("not.have.class", "text-muted-foreground")
        .findBySel("stats-rate-value")
        .should("have.text", "10%");
      cy.getBySel("stats-rate-sample").should("not.exist");
    });
    cy.getBySel("stats-lead-row-FOUR_SEVEN").within(() => {
      cy.getBySel("stats-lead-bucket").should("have.text", "4-7 días");
      cy.getBySel("stats-lead-signed-up").should("have.text", "8");
      cy.getBySel("stats-rate").should("have.class", "text-muted-foreground");
      cy.getBySel("stats-rate-value").should("have.text", "50%");
      cy.getBySel("stats-rate-sample").should("have.text", "n = 8");
    });
    // The rate counts the sign-ups that were not cancelled: 12 - 4.
    cy.getBySel("stats-lead-row-TWO_THREE")
      .findBySel("stats-rate-sample")
      .should("have.text", "n = 8");
    cy.getBySel("stats-lead-row-FIFTEEN_PLUS").within(() => {
      cy.getBySel("stats-rate-value").should("have.text", "–");
      cy.getBySel("stats-rate-sample").should("not.exist");
    });
  });

  it("heads the English lead-time table like its tooltip series", () => {
    stubArrivals();
    mountTab({}, { lang: "en" });
    cy.getByRole("table", { name: "How early people sign up" })
      .getByRole("columnheader")
      .should(($th) => {
        expect($th.toArray().map((th) => th.textContent)).to.deep.equal([
          "Lead time",
          "Signed up",
          "No-show",
        ]);
      });
  });

  it("says there were no sign-ups instead of drawing an empty lead-time chart", () => {
    stubArrivals(makeArrivalStats({ lead_time: NO_SIGNUPS }));
    mountTab();
    cy.getBySel("stats-no-signups").should(
      "have.text",
      "No hubo inscripciones",
    );
    cy.getByRole("table", { name: LEAD }).should("not.exist");
  });

  it("explains what the numbers leave out, with the several-events note", () => {
    stubArrivals();
    mountTab();
    shouldHaveNotes([
      "Los horarios salen del ingreso en la puerta. Cada tarjeta muestra la hora a la que llegó la gente y, debajo, cuánto después del inicio fue.",
      "Con varios eventos, la hora del día y el tiempo desde el inicio se calculan por separado. Si los eventos empiezan a distintas horas, pueden no coincidir del todo.",
      "Los discretos no se cuentan porque nunca se anotaron.",
    ]);
  });

  it("says how many check-ins were left out of the curve", () => {
    stubArrivals(
      makeArrivalStats({
        summary: makeArrivalSummary({ excluded_arrivals: 12000 }),
      }),
    );
    mountTab();
    cy.getBySel("stats-note")
      .eq(2)
      .should(
        "have.text",
        "Ingresos dejados afuera: 12.000. Se registraron más de 2 horas antes o 12 horas después del inicio (suelen ser cargas tardías o errores).",
      );
  });

  it("reads right in English for a single left-out check-in", () => {
    stubArrivals(
      makeArrivalStats({
        summary: makeArrivalSummary({ excluded_arrivals: 1 }),
      }),
    );
    mountTab({}, { lang: "en" });
    cy.getBySel("stats-note")
      .eq(2)
      .should(
        "have.text",
        "Check-ins left out: 1. They were recorded more than 2 hours before or 12 hours after the start (usually late entries or mistakes).",
      );
  });

  it("lists the arrival curve by clock time by default", () => {
    stubArrivals();
    mountTab();
    cy.getBySel("stats-arrivals-view-clock")
      .should("have.text", "Hora")
      .and("have.attr", "aria-pressed", "true");
    shouldHaveTable(CURVE, [
      ["Hora", "Llegadas"],
      ["22:15", "20"],
      ["22:30", "40"],
    ]);
    cy.contains("Hora de llegada").should("be.visible");
    cy.contains("Horas desde el inicio del evento").should("not.exist");
  });

  it("switches the curve to the time from the start", () => {
    stubArrivals();
    mountTab();
    cy.getByRole("button", { name: "Desde el inicio" }).click();
    shouldHaveTable(CURVE, [
      ["Hora", "Llegadas"],
      ["0:15", "20"],
      ["0:30", "40"],
    ]);
    cy.contains("Horas desde el inicio del evento").should("be.visible");
    cy.getBySel("stats-arrivals-view-clock").should(
      "have.attr",
      "aria-pressed",
      "false",
    );
    cy.getBySel("stats-arrivals-view-offset").should(
      "have.attr",
      "aria-pressed",
      "true",
    );
  });

  it("opens on the view in the URL", () => {
    stubArrivals();
    mountTab({}, { path: "/stats?arrivals_view=offset" });
    shouldHaveTable(CURVE, [
      ["Hora", "Llegadas"],
      ["0:15", "20"],
      ["0:30", "40"],
    ]);
  });

  it("falls back to clock time for an unknown curve view", () => {
    stubArrivals();
    mountTab({}, { path: "/stats?arrivals_view=bogus" });
    shouldHaveTable(CURVE, [
      ["Hora", "Llegadas"],
      ["22:15", "20"],
      ["22:30", "40"],
    ]);
  });

  it("labels one event's curve by clock time, without the several-events note", () => {
    stubArrivals(
      makeArrivalStats({
        curve: [{ start_minute: 30, arrivals: 40 }],
        clock_curve: [
          { start_minute: 1410, local_time: "23:30", arrivals: 40 },
        ],
      }),
    );
    mountTab({ query: { meetupId: "m1" } });
    shouldHaveTable(CURVE, [
      ["Hora", "Llegadas"],
      ["23:30", "40"],
    ]);
    shouldHaveNotes([
      "Los horarios salen del ingreso en la puerta. Cada tarjeta muestra la hora a la que llegó la gente y, debajo, cuánto después del inicio fue.",
      "Los discretos no se cuentan porque nunca se anotaron.",
    ]);
  });

  it("shows one event's curve from the start in that view", () => {
    stubArrivals(
      makeArrivalStats({ curve: [{ start_minute: 30, arrivals: 40 }] }),
    );
    mountTab(
      { query: { meetupId: "m1" } },
      { path: "/stats?arrivals_view=offset" },
    );
    shouldHaveTable(CURVE, [
      ["Hora", "Llegadas"],
      ["0:30", "40"],
    ]);
  });

  it("has no accessibility violations", () => {
    stubArrivals();
    mountTab();
    cy.getBySel("stats-headline-mean-arrival").should("be.visible");
    waitForAnimations();
    cy.checkA11yAA();
  });
});
