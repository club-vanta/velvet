import { AttendanceTab } from "./AttendanceTab";
import type { StatsTabProps } from "../../lib/statsTab";
import {
  ORG_ID,
  makeAttendanceRow,
  makeAttendanceStats,
  makeAttendanceTotals,
} from "@/tests/factories";
import {
  LAST_3_MONTHS,
  requestQuery,
  shouldHaveTable,
  shouldShowHeadline,
  stubAttendance,
  waitForAnimations,
} from "../../../../../cypress/support/routes/stats";

function mountTab(props: Partial<StatsTabProps> = {}) {
  cy.mount(
    <AttendanceTab
      orgId={ORG_ID}
      query={LAST_3_MONTHS}
      period={{ preset: "3m" }}
      onShowAll={cy.spy().as("onShowAll")}
      {...props}
    />,
    { lang: "es" },
  );
}

describe("<AttendanceTab />", () => {
  it("shows a skeleton while loading", () => {
    stubAttendance(makeAttendanceStats(), { delay: 1000 });
    mountTab();
    cy.getBySel("stats-attendance-skeleton").should("be.visible");
    cy.wait("@getAttendance");
    cy.getBySel("stats-attendance-skeleton").should("not.exist");
    cy.getBySel("stats-headline-attended").should("be.visible");
  });

  it("waits without fetching while the filters are not ready", () => {
    // No stub: any request fails the test.
    mountTab({ query: null });
    cy.getBySel("stats-attendance-skeleton").should("be.visible");
  });

  it("sends the period and the event to the API", () => {
    stubAttendance();
    mountTab({
      query: { from: "2026-03-01", to: "2026-04-01", meetupId: "m1" },
    });
    requestQuery("@getAttendance").should("deep.equal", {
      from: "2026-03-01",
      to: "2026-04-01",
      meetup_id: "m1",
    });
  });

  it("announces the error and retries the request, without a way back for a period", () => {
    cy.stubApiError("GET", "/organizations/{org_id}/stats/attendance", {
      statusCode: 500,
    }).as("getAttendance");
    mountTab();
    cy.getByRole("alert")
      .should("contain.text", "No se pudieron cargar las estadísticas.")
      .and("have.attr", "data-cy", "stats-error");
    cy.getBySel("stats-show-all").should("not.exist");
    stubAttendance();
    cy.getByRole("button", { name: "Reintentar" }).click();
    cy.wait("@getAttendance");
    cy.getBySel("stats-error").should("not.exist");
    cy.getBySel("stats-headline-attended").should("be.visible");
  });

  it("offers all events from the error of a selected event", () => {
    cy.stubApiError("GET", "/organizations/{org_id}/stats/attendance", {
      statusCode: 404,
      detail: "Meetup not found",
    });
    mountTab({ query: { meetupId: "m1" } });
    cy.getByRole("button", { name: "Reintentar" }).should("be.visible");
    cy.getByRole("button", { name: "Ver todos los eventos" }).click();
    cy.get("@onShowAll").should("have.been.calledOnce");
  });

  it("shows the empty state for a period without finalized events", () => {
    stubAttendance(makeAttendanceStats({ meetups: [] }));
    mountTab();
    cy.getBySel("stats-empty").should(
      "have.text",
      "No hay eventos finalizados en este período",
    );
    cy.getBySel("stats-headline-attended").should("not.exist");
  });

  it("shows exact headline values against the previous period", () => {
    stubAttendance(
      makeAttendanceStats({
        comparison_kind: "PREVIOUS_PERIOD",
        comparison: makeAttendanceTotals({ attended: 381, no_show_rate: 0.15 }),
      }),
    );
    mountTab();
    cy.getByRole("heading", { name: "Asistencia por evento" }).should(
      "match",
      "h2",
    );
    shouldShowHeadline("attended", {
      label: "Vinieron",
      value: "412",
      comparison: "+8% respecto al período anterior",
    });
    shouldShowHeadline("no-show-rate", {
      label: "No vinieron",
      value: "18%",
      comparison: "+3 puntos respecto al período anterior",
    });
    shouldShowHeadline("cancel-rate", {
      label: "Se bajaron",
      value: "10%",
      comparison: "0 puntos respecto al período anterior",
    });
    shouldShowHeadline("walkins", { label: "Discretos", value: "12" });
    shouldShowHeadline("events", { label: "Eventos", value: "5" });
    shouldShowHeadline("avg-per-event", {
      label: "Promedio por evento",
      value: "82,4",
    });
  });

  it("compares one event with the period average and leaves out the period cards", () => {
    stubAttendance(
      makeAttendanceStats({
        totals: makeAttendanceTotals({ events: 1, attended: 80 }),
        comparison_kind: "PERIOD_AVERAGE",
        comparison: makeAttendanceTotals({ no_show_rate: 0.2 }),
      }),
    );
    mountTab({ query: { meetupId: "m1" } });
    shouldShowHeadline("attended", {
      comparison: "En todos los eventos de los últimos 3 meses: 82,4",
    });
    shouldShowHeadline("no-show-rate", {
      comparison: "En todos los eventos de los últimos 3 meses: 20%",
    });
    shouldShowHeadline("walkins", { comparison: null });
    cy.getBySel("stats-headline-events").should("not.exist");
    cy.getBySel("stats-headline-avg-per-event").should("not.exist");
  });

  it("names a custom period in the line comparing one event", () => {
    stubAttendance(
      makeAttendanceStats({
        comparison_kind: "PERIOD_AVERAGE",
        comparison: makeAttendanceTotals(),
      }),
    );
    mountTab({
      query: { meetupId: "m1" },
      period: {
        preset: "custom",
        custom: { from: "2026-03-01", to: "2026-03-31" },
      },
    });
    shouldShowHeadline("attended", {
      comparison: "En todos los eventos del 01/03/2026 al 31/03/2026: 82,4",
    });
  });

  it("dims a rate computed from fewer than 10 people and shows n", () => {
    stubAttendance(
      makeAttendanceStats({
        totals: makeAttendanceTotals({
          signed_up: 7,
          cancelled: 0,
          no_show_rate: 0.14,
        }),
      }),
    );
    mountTab();
    shouldShowHeadline("no-show-rate", { sample: "n = 7" });
    cy.getBySel("stats-headline-no-show-rate").should(
      "have.class",
      "text-muted-foreground",
    );
    cy.getBySel("stats-headline-attended")
      .should("not.have.class", "text-muted-foreground")
      .findBySel("stats-headline-sample")
      .should("not.exist");
  });

  it("shows a dash for rates without people", () => {
    stubAttendance(
      makeAttendanceStats({
        totals: makeAttendanceTotals({
          signed_up: 0,
          cancelled: 0,
          attended: 0,
          walkin: 0,
          no_show: 0,
          cancellation_rate: null,
          no_show_rate: null,
          avg_attended_per_event: null,
        }),
      }),
    );
    mountTab();
    shouldShowHeadline("no-show-rate", { value: "–" });
    shouldShowHeadline("cancel-rate", { value: "–" });
    shouldShowHeadline("avg-per-event", { value: "–" });
    cy.contains("NaN").should("not.exist");
  });

  it("lists the chart's numbers in a text table, in date order", () => {
    stubAttendance(
      makeAttendanceStats({
        meetups: [
          makeAttendanceRow({
            meetup_id: "m2",
            name: "Alter Abril",
            date: "2026-04-14T22:00:00Z",
            attended: 70,
            no_show: 5,
            cancelled: 3,
          }),
          makeAttendanceRow(),
        ],
      }),
    );
    mountTab();
    shouldHaveTable("Asistencia por evento", [
      ["Evento", "Fecha", "Vinieron", "No vinieron", "Se bajaron"],
      ["Alter Marzo", "10 de mar de 2026", "80", "10", "10"],
      ["Alter Abril", "14 de abr de 2026", "70", "5", "3"],
    ]);
  });

  it("explains what the numbers leave out", () => {
    stubAttendance();
    mountTab();
    cy.getBySel("stats-note").should(
      "have.text",
      "Solo cuentan los eventos finalizados. El staff y los vendors no se cuentan. Un discreto que nunca ingresó no cuenta.",
    );
  });

  it("has no accessibility violations", () => {
    stubAttendance();
    mountTab();
    cy.getBySel("stats-headline-attended").should("be.visible");
    waitForAnimations();
    cy.checkA11yAA();
  });
});
