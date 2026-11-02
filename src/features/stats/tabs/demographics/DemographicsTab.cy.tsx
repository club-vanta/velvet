import { DemographicsTab } from "./DemographicsTab";
import type { StatsTabProps } from "../../lib/statsTab";
import {
  ORG_ID,
  makeAgeGroups,
  makeDemographicStats,
  makeDemographicSummary,
} from "@/tests/factories";
import {
  LAST_3_MONTHS,
  requestQuery,
  shouldHaveNotes,
  shouldHaveTable,
  shouldShowHeadline,
  stubDemographics,
  waitForAnimations,
} from "../../../../../cypress/support/routes/stats";

function mountTab(
  props: Partial<StatsTabProps> = {},
  lang: "es" | "en" = "es",
) {
  cy.mount(
    <DemographicsTab
      orgId={ORG_ID}
      query={LAST_3_MONTHS}
      period={{ preset: "3m" }}
      onShowAll={cy.spy().as("onShowAll")}
      {...props}
    />,
    { lang },
  );
}

describe("<DemographicsTab />", () => {
  it("shows a skeleton while loading", () => {
    stubDemographics(makeDemographicStats(), { delay: 1000 });
    mountTab();
    cy.getBySel("stats-demographics-skeleton").should("be.visible");
    cy.wait("@getDemographics");
    cy.getBySel("stats-demographics-skeleton").should("not.exist");
  });

  it("waits without fetching while the filters are not ready", () => {
    mountTab({ query: null });
    cy.getBySel("stats-demographics-skeleton").should("be.visible");
  });

  it("sends the period and the event to the API", () => {
    stubDemographics();
    mountTab({
      query: { from: "2026-03-01", to: "2026-04-01", meetupId: "m1" },
    });
    requestQuery("@getDemographics").should("deep.equal", {
      from: "2026-03-01",
      to: "2026-04-01",
      meetup_id: "m1",
    });
  });

  it("announces the error and retries the request", () => {
    cy.stubApiError("GET", "/organizations/{org_id}/stats/demographics", {
      statusCode: 500,
    });
    mountTab();
    cy.getByRole("alert").should(
      "contain.text",
      "No se pudieron cargar las estadísticas.",
    );
    stubDemographics();
    cy.getBySel("stats-retry").click();
    cy.wait("@getDemographics");
    cy.getBySel("stats-headline-median-age").should("be.visible");
  });

  // What the API sends for a period with no finalized events, and for one
  // where only staff came, since staff RSVPs are not counted.
  it("shows the empty state when there are no audience RSVPs", () => {
    stubDemographics(
      makeDemographicStats({
        gender: [],
        age: makeAgeGroups().map((g) => ({
          ...g,
          attended: 0,
          attended_share: null,
        })),
        summary: makeDemographicSummary({
          attended: 0,
          median_age: null,
          known_age_share: null,
        }),
      }),
    );
    mountTab();
    cy.getBySel("stats-empty").should(
      "have.text",
      "No hay eventos finalizados en este período",
    );
    cy.getBySel("stats-headline-median-age").should("not.exist");
    cy.getByRole("table").should("not.exist");
  });

  it("shows exact headline values against the previous period", () => {
    stubDemographics(
      makeDemographicStats({
        comparison_kind: "PREVIOUS_PERIOD",
        comparison: makeDemographicSummary({
          attended: 96,
          median_age: 31.2,
          known_age_share: 0.8,
        }),
      }),
    );
    mountTab();
    shouldShowHeadline("median-age", {
      label: "Edad mediana",
      value: "32,7",
      comparison: "+1,5 años respecto al período anterior",
    });
    shouldShowHeadline("known-age", {
      label: "Con edad conocida",
      value: "90%",
      comparison: "+10 puntos respecto al período anterior",
      sample: null,
    });
    shouldShowHeadline("attendances", {
      label: "Asistencias",
      value: "120",
      comparison: "+25% respecto al período anterior",
    });
  });

  it("compares one event with the period without comparing the counts", () => {
    stubDemographics(
      makeDemographicStats({
        comparison_kind: "PERIOD_AVERAGE",
        comparison: makeDemographicSummary({
          attended: 4000,
          median_age: 31.2,
          known_age_share: 0.8,
        }),
      }),
    );
    mountTab({ query: { meetupId: "m1" } });
    shouldShowHeadline("median-age", {
      comparison: "En todos los eventos de los últimos 3 meses: 31,2",
    });
    shouldShowHeadline("known-age", {
      comparison: "En todos los eventos de los últimos 3 meses: 80%",
    });
    shouldShowHeadline("attendances", { comparison: null });
  });

  it("names the known-age card in English", () => {
    stubDemographics();
    mountTab({}, "en");
    shouldShowHeadline("known-age", { label: "Known age", value: "90%" });
  });

  it("shows n under the known-age share when few people attended", () => {
    stubDemographics(
      makeDemographicStats({
        summary: makeDemographicSummary({ attended: 5 }),
      }),
    );
    mountTab();
    shouldShowHeadline("known-age", { sample: "n = 5" });
  });

  it("explains how gender and age are read", () => {
    stubDemographics();
    mountTab();
    shouldHaveNotes([
      "El género sale del perfil de Mazmo. Cada asistencia cuenta una vez: alguien que vino a tres eventos cuenta tres veces. Quien no tiene perfil de Mazmo aparece como Sin dato.",
      "La edad es la que figura hoy en Mazmo, no la que tenía el día del evento. Las edades menores de 18 o mayores de 99 cuentan como Sin dato, porque algunos perfiles tienen edades inventadas.",
    ]);
  });

  it("lists each group's share in text tables, with Mazmo labels and unknown codes raw", () => {
    stubDemographics();
    mountTab();
    shouldHaveTable("Género", [
      ["Grupo", "Vinieron"],
      ["Hombre", "75%"],
      ["NEW_CODE", "2%"],
      ["Sin dato", "23%"],
    ]);
    shouldHaveTable("Edad", [
      ["Grupo", "Vinieron"],
      ["18-24", "28%"],
      ["25-29", "27%"],
      ["30-34", "18%"],
      ["35-39", "8%"],
      ["40-49", "6%"],
      ["50+", "3%"],
      ["Sin dato", "10%"],
    ]);
  });

  it("shows no expected or no-show figures", () => {
    stubDemographics();
    mountTab();
    cy.getBySel("stats-headline-median-age").should("be.visible");
    cy.contains("Se esperaban").should("not.exist");
    cy.contains("No vinieron").should("not.exist");
  });

  it("has no accessibility violations", () => {
    stubDemographics();
    mountTab();
    cy.getBySel("stats-headline-median-age").should("be.visible");
    waitForAnimations();
    cy.checkA11yAA();
  });
});
