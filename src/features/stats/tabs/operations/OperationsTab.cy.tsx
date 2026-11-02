import { OperationsTab } from "./OperationsTab";
import type { StatsTabProps } from "../../lib/statsTab";
import {
  ORG_ID,
  makeOperationsStats,
  makeOperationsSummary,
  makePaymentStats,
} from "@/tests/factories";
import {
  LAST_3_MONTHS,
  requestQuery,
  shouldHaveNotes,
  shouldShowHeadline,
  stubOperations,
  waitForAnimations,
} from "../../../../../cypress/support/routes/stats";

const NOTE_WHO =
  "Esta pestaña cuenta a todos los que entraron, staff y vendors incluidos.";
const NOTE_PAYMENTS =
  "Solo los eventos que cobran entrada. Pendiente es alguien que entró sin un pago registrado.";

function mountTab(props: Partial<StatsTabProps> = {}) {
  cy.mount(
    <OperationsTab
      orgId={ORG_ID}
      query={LAST_3_MONTHS}
      period={{ preset: "3m" }}
      onShowAll={cy.spy().as("onShowAll")}
      {...props}
    />,
    { lang: "es" },
  );
}

/** The text of `part` in each row of a list, in order. */
function shouldListParts(rows: string[], part: string, texts: string[]) {
  rows.forEach((row, i) => {
    cy.getBySel(row).findBySel(part).should("have.text", texts[i]);
  });
}

describe("<OperationsTab />", () => {
  it("shows a skeleton while loading", () => {
    stubOperations(makeOperationsStats(), { delay: 1000 });
    mountTab();
    cy.getBySel("stats-operations-skeleton").should("be.visible");
    cy.wait("@getOperations");
    cy.getBySel("stats-operations-skeleton").should("not.exist");
  });

  it("waits without fetching while the filters are not ready", () => {
    mountTab({ query: null });
    cy.getBySel("stats-operations-skeleton").should("be.visible");
  });

  it("sends the period and the event to the API", () => {
    stubOperations();
    mountTab({
      query: { from: "2026-03-01", to: "2026-04-01", meetupId: "m1" },
    });
    requestQuery("@getOperations").should("deep.equal", {
      from: "2026-03-01",
      to: "2026-04-01",
      meetup_id: "m1",
    });
  });

  it("announces the error and retries the request", () => {
    cy.stubApiError("GET", "/organizations/{org_id}/stats/operations", {
      statusCode: 500,
    });
    mountTab();
    cy.getByRole("alert").should(
      "contain.text",
      "No se pudieron cargar las estadísticas.",
    );
    stubOperations();
    cy.getBySel("stats-retry").click();
    cy.wait("@getOperations");
    cy.getBySel("stats-headline-came-in").should("be.visible");
  });

  it("shows the empty state when nobody came in", () => {
    stubOperations(
      makeOperationsStats({
        summary: makeOperationsSummary({
          attended: 0,
          paid_share: null,
          avg_peak_checkins: null,
          bans: 0,
        }),
        guest_types: [],
        payments: null,
        staff: [],
        busiest: null,
        ban_list: [],
      }),
    );
    mountTab();
    cy.getBySel("stats-empty").should(
      "have.text",
      "No hay eventos finalizados en este período",
    );
    cy.getBySel("stats-headline-came-in").should("not.exist");
  });

  it("shows exact headline values against the previous period", () => {
    stubOperations(
      makeOperationsStats({
        comparison_kind: "PREVIOUS_PERIOD",
        comparison: makeOperationsSummary({
          attended: 250,
          paid_share: 0.85,
          avg_peak_checkins: 32,
          bans: 1,
        }),
      }),
    );
    mountTab();
    shouldShowHeadline("came-in", {
      label: "Ingresaron",
      value: "300",
      comparison: "+20% respecto al período anterior",
    });
    shouldShowHeadline("paid", {
      label: "Pagaron",
      value: "90%",
      comparison: "+5 puntos respecto al período anterior",
      sample: null,
    });
    shouldShowHeadline("door-peak", {
      label: "Pico en la puerta",
      value: "62",
      subline: "Alter Marzo · 23:15",
      comparison: null,
    });
    shouldShowHeadline("bans", {
      label: "Baneos",
      value: "3",
      comparison: "+200% respecto al período anterior",
    });
  });

  it("formats the counts for the locale", () => {
    stubOperations(
      makeOperationsStats({
        summary: makeOperationsSummary({ attended: 12000, bans: 15000 }),
      }),
    );
    mountTab();
    shouldShowHeadline("came-in", { value: "12.000" });
    shouldShowHeadline("bans", { value: "15.000" });
  });

  it("dims the paid share with n when few people owed entry", () => {
    stubOperations(
      makeOperationsStats({
        payments: makePaymentStats({ paid: 5, pending: 2 }),
      }),
    );
    mountTab();
    shouldShowHeadline("paid", { sample: "n = 7" });
  });

  it("shows a dash and no n when nobody owed entry", () => {
    stubOperations(
      makeOperationsStats({
        summary: makeOperationsSummary({ paid_share: null }),
        payments: makePaymentStats({ paid: 0, pending: 0, paid_share: null }),
      }),
    );
    mountTab();
    shouldShowHeadline("paid", { value: "–", sample: null });
  });

  it("shows a dash for the peak when there is no busiest slot", () => {
    stubOperations(
      makeOperationsStats({
        summary: makeOperationsSummary({ avg_peak_checkins: null }),
        busiest: null,
      }),
    );
    mountTab();
    shouldShowHeadline("door-peak", { value: "–", subline: null });
  });

  it("hides the paid headline and the payments card without paying events", () => {
    stubOperations(
      makeOperationsStats({
        payments: null,
        summary: makeOperationsSummary({ paid_share: null }),
      }),
    );
    mountTab();
    cy.getBySel("stats-headline-came-in").should("be.visible");
    cy.getBySel("stats-headline-paid").should("not.exist");
    cy.getBySel("stats-headline-door-peak").should("be.visible");
    cy.getBySel("stats-headline-bans").should("be.visible");
    cy.getByRole("region", { name: "Pagos" }).should("not.exist");
    shouldHaveNotes([NOTE_WHO]);
  });

  it("compares one event with the period average, except the totals", () => {
    stubOperations(
      makeOperationsStats({
        comparison_kind: "PERIOD_AVERAGE",
        comparison: makeOperationsSummary({
          attended: 4000,
          paid_share: 0.8,
          avg_peak_checkins: 35.5,
          bans: 20,
        }),
      }),
    );
    mountTab({ query: { meetupId: "m1" } });
    shouldShowHeadline("came-in", { comparison: null });
    shouldShowHeadline("bans", { comparison: null });
    shouldShowHeadline("paid", {
      comparison: "En todos los eventos de los últimos 3 meses: 80%",
    });
    shouldShowHeadline("door-peak", {
      subline: "23:15",
      comparison: "En todos los eventos de los últimos 3 meses: 35,5",
    });
  });

  it("shows the period average peak with one decimal even when it is whole", () => {
    stubOperations(
      makeOperationsStats({
        comparison_kind: "PERIOD_AVERAGE",
        comparison: makeOperationsSummary({ avg_peak_checkins: 32 }),
      }),
    );
    mountTab({ query: { meetupId: "m1" } });
    shouldShowHeadline("door-peak", {
      comparison: "En todos los eventos de los últimos 3 meses: 32,0",
    });
  });

  it("lists every guest type in order with its count and share", () => {
    stubOperations();
    mountTab();
    const rows = ["NORMAL", "INVITED", "STAFF", "VENDOR"].map(
      (type) => `stats-guest-type-${type}`,
    );
    cy.getByRole("region", { name: "Tipos de invitado" })
      .getByRole("listitem")
      .should(($items) => {
        expect($items.toArray().map((li) => li.dataset.cy)).to.deep.equal(rows);
      });
    shouldListParts(rows, "stats-guest-type-name", [
      "General",
      "Cortesía",
      "Staff",
      "Stand",
    ]);
    shouldListParts(rows, "stats-guest-type-count", ["200", "50", "30", "20"]);
    shouldListParts(rows, "stats-guest-type-share", [
      "67%",
      "17%",
      "10%",
      "7%",
    ]);
  });

  it("shows the payment counts and the cancelled-after-paying line", () => {
    stubOperations();
    mountTab();
    cy.getByRole("region", { name: "Pagos" }).within(() => {
      cy.getBySel("stats-payments-paid").should("have.text", "180");
      cy.getBySel("stats-payments-pending").should("have.text", "20");
      cy.getBySel("stats-payments-exempt").should("have.text", "100");
      cy.getBySel("stats-payments-cancelled-paid").should(
        "have.text",
        "4 se bajaron después de pagar",
      );
    });
  });

  it("leaves out the cancelled-after-paying line when nobody did", () => {
    stubOperations(
      makeOperationsStats({
        payments: makePaymentStats({ cancelled_but_paid: 0 }),
      }),
    );
    mountTab();
    cy.getBySel("stats-payments-paid").should("have.text", "180");
    cy.getBySel("stats-payments-cancelled-paid").should("not.exist");
  });

  it("lists the check-ins per staff member, with one row for no recorded checker", () => {
    stubOperations();
    mountTab();
    const rows = ["stats-staff-1", "stats-staff-2", "stats-staff-none"];
    shouldListParts(rows, "stats-staff-name", [
      "door",
      "owner",
      "Sin registro",
    ]);
    shouldListParts(rows, "stats-staff-count", ["200", "70", "30"]);
  });

  it("lists the bans linked to the guest, with dashes for a missing reason or actor", () => {
    stubOperations(
      makeOperationsStats({ summary: makeOperationsSummary({ bans: 2 }) }),
    );
    mountTab();
    cy.getBySel("stats-ban-guest-1").within(() => {
      cy.getByRole("link", { name: "Ana" }).should(
        "have.attr",
        "href",
        "/guests/guest-1",
      );
      cy.getBySel("stats-ban-reason").should(
        "have.text",
        "Harassed another guest",
      );
      cy.getBySel("stats-ban-date").should("have.text", "9 de ene de 2026");
      cy.getBySel("stats-ban-actor").should("have.text", "owner");
    });
    cy.getBySel("stats-ban-guest-2").within(() => {
      cy.getByRole("link", { name: "Beto" }).should(
        "have.attr",
        "href",
        "/guests/guest-2",
      );
      cy.getBySel("stats-ban-reason").should("have.text", "–");
      cy.getBySel("stats-ban-actor").should("have.text", "–");
    });
    cy.getBySel("stats-bans-more").should("not.exist");
  });

  it("says how many more bans there are than listed", () => {
    stubOperations(
      makeOperationsStats({ summary: makeOperationsSummary({ bans: 25 }) }),
    );
    mountTab();
    cy.getBySel("stats-bans-more").should("have.text", "y 23 más");
  });

  it("leaves out the bans card when there are none", () => {
    stubOperations(
      makeOperationsStats({
        summary: makeOperationsSummary({ bans: 0 }),
        ban_list: [],
      }),
    );
    mountTab();
    cy.getBySel("stats-headline-bans").should("be.visible");
    cy.getByRole("region", { name: "Baneos" }).should("not.exist");
    cy.getByRole("link", { name: "Ana" }).should("not.exist");
  });

  it("explains who is counted and what pending means", () => {
    stubOperations();
    mountTab();
    shouldHaveNotes([NOTE_WHO, NOTE_PAYMENTS]);
  });

  it("has no accessibility violations", () => {
    stubOperations();
    mountTab();
    cy.getBySel("stats-headline-came-in").should("be.visible");
    waitForAnimations();
    cy.checkA11yAA();
  });
});
