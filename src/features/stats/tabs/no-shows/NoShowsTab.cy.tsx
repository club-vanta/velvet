import { NoShowsTab } from "./NoShowsTab";
import type { StatsTabProps } from "../../lib/statsTab";
import {
  ORG_ID,
  makeNoShowGenderGroup,
  makeNoShowGuest,
  makeNoShowStats,
  makeNoShowSummary,
} from "@/tests/factories";
import {
  LAST_3_MONTHS,
  requestQuery,
  shouldHaveNotes,
  shouldHaveTable,
  shouldShowHeadline,
  stubNoShows,
  waitForAnimations,
} from "../../../../../cypress/support/routes/stats";

const GENDER = "Según el género";
const AGE = "Según la edad";
const HISTORY = "Primera vez o ya habían venido";
const LEAD = "Según cuánto antes se anotaron";
const CARDS = [GENDER, AGE, HISTORY, LEAD];

function mountTab(
  props: Partial<StatsTabProps> = {},
  { path = "/stats", lang = "es" as "es" | "en" } = {},
) {
  cy.mount(
    <NoShowsTab
      orgId={ORG_ID}
      query={LAST_3_MONTHS}
      period={{ preset: "3m" }}
      onShowAll={cy.spy().as("onShowAll")}
      {...props}
    />,
    { lang, path },
  );
}

/** Each row of a breakdown card as [group, value, n or null]. */
function shouldHaveRates(card: string, rows: (string | null)[][]) {
  cy.getByRole("table", { name: card }).should(($table) => {
    const body = Array.from(($table[0] as HTMLTableElement).tBodies[0]!.rows);
    const part = (row: Element, name: string) =>
      row.querySelector(`[data-cy="${name}"]`)?.textContent ?? null;
    expect(
      body.map((row) => [
        part(row, "stats-rate-group"),
        part(row, "stats-rate-value"),
        part(row, "stats-rate-sample"),
      ]),
    ).to.deep.equal(rows);
  });
}

/** The header of the value column of each breakdown card. */
function shouldHeadValuesWith(header: string) {
  for (const card of CARDS) {
    cy.getByRole("table", { name: card })
      .getByRole("columnheader")
      .eq(1)
      .should("have.text", header);
  }
}

describe("<NoShowsTab />", () => {
  it("shows a skeleton while loading", () => {
    stubNoShows(makeNoShowStats(), { delay: 1000 });
    mountTab();
    cy.getBySel("stats-no-shows-skeleton").should("be.visible");
    cy.wait("@getNoShows");
    cy.getBySel("stats-no-shows-skeleton").should("not.exist");
  });

  it("waits without fetching while the filters are not ready", () => {
    mountTab({ query: null });
    cy.getBySel("stats-no-shows-skeleton").should("be.visible");
  });

  it("sends the period and the event to the API", () => {
    stubNoShows();
    mountTab({
      query: { from: "2026-03-01", to: "2026-04-01", meetupId: "m1" },
    });
    requestQuery("@getNoShows").should("deep.equal", {
      from: "2026-03-01",
      to: "2026-04-01",
      meetup_id: "m1",
    });
  });

  it("announces the error and retries the request", () => {
    cy.stubApiError("GET", "/organizations/{org_id}/stats/no-shows", {
      statusCode: 500,
    });
    mountTab();
    cy.getByRole("alert").should(
      "contain.text",
      "No se pudieron cargar las estadísticas.",
    );
    stubNoShows();
    cy.getBySel("stats-retry").click();
    cy.wait("@getNoShows");
    cy.getBySel("stats-headline-no-show-rate").should("be.visible");
  });

  it("shows the empty state when nobody was expected", () => {
    stubNoShows(
      makeNoShowStats({
        summary: makeNoShowSummary({
          expected: 0,
          no_show: 0,
          no_show_rate: null,
        }),
        meetups: [],
        guests: [],
        guests_total: 0,
      }),
    );
    mountTab();
    cy.getBySel("stats-empty").should(
      "have.text",
      "No hay eventos finalizados en este período",
    );
    cy.getBySel("stats-headline-no-show-rate").should("not.exist");
  });

  it("shows exact headline values against the previous period", () => {
    stubNoShows(
      makeNoShowStats({
        comparison_kind: "PREVIOUS_PERIOD",
        comparison: makeNoShowSummary({
          expected: 60,
          no_show: 6,
          no_show_rate: 0.1,
          repeat_guests: 2,
        }),
      }),
    );
    mountTab();
    shouldShowHeadline("no-show-rate", {
      label: "No vinieron",
      value: "15%",
      comparison: "+5 puntos respecto al período anterior",
    });
    shouldShowHeadline("no-show-count", {
      label: "Se anotaron y no vinieron",
      value: "12",
      subline: "de 80 anotados",
      comparison: "+100% respecto al período anterior",
    });
    shouldShowHeadline("repeat-no-shows", {
      label: "Faltaron 2 veces o más",
      value: "3",
      subline: "personas, en el período",
      comparison: "+50% respecto al período anterior",
    });
  });

  it("compares one event with the period rate only, and lists who missed it", () => {
    stubNoShows(
      makeNoShowStats({
        meetups: [],
        comparison_kind: "PERIOD_AVERAGE",
        comparison: makeNoShowSummary({
          expected: 400,
          no_show: 40,
          no_show_rate: 0.1,
          repeat_guests: 9,
        }),
      }),
    );
    mountTab({ query: { meetupId: "m1" } });
    shouldShowHeadline("no-show-rate", {
      comparison: "En todos los eventos de los últimos 3 meses: 10%",
    });
    shouldShowHeadline("no-show-count", { comparison: null });
    shouldShowHeadline("repeat-no-shows", {
      comparison: null,
      subline: "de los que faltaron a este evento, contando toda su historia",
    });
    cy.getByRole("heading", {
      name: "Los que no vinieron, evento por evento",
    }).should("not.exist");
    cy.getByRole("heading", {
      name: "Quiénes no vinieron a este evento",
    }).should("be.visible");
    shouldHaveNotes([
      "No vino quien se anotó, no canceló y nunca ingresó por la puerta. Los discretos y los que cancelaron no cuentan. El porcentaje es sobre los anotados que no cancelaron.",
      "Ya habían venido quiere decir que habían asistido antes a otro evento de la organización, en cualquier fecha.",
      "Cada punto es una inscripción que no se canceló: lleno si no vino, vacío si vino. Primero los que más faltaron.",
      "Los números de cada persona cubren toda su historia en la organización, no solo este evento.",
    ]);
  });

  it("leaves out the period average when the period has no rate", () => {
    stubNoShows(
      makeNoShowStats({
        meetups: [],
        comparison_kind: "PERIOD_AVERAGE",
        comparison: makeNoShowSummary({
          expected: 0,
          no_show: 0,
          no_show_rate: null,
          repeat_guests: 0,
        }),
      }),
    );
    mountTab({ query: { meetupId: "m1" } });
    shouldShowHeadline("no-show-rate", { comparison: null });
  });

  it("shows n under the rate when few people were expected", () => {
    stubNoShows(
      makeNoShowStats({ summary: makeNoShowSummary({ expected: 6 }) }),
    );
    mountTab();
    shouldShowHeadline("no-show-rate", { sample: "n = 6" });
  });

  it("lists the rate of each event in a text table", () => {
    stubNoShows();
    mountTab();
    shouldHaveTable("Los que no vinieron, evento por evento", [
      ["Evento", "Fecha", "Anotados", "No vinieron"],
      ["Alter #27", "04/04", "40", "10%"],
      ["Alter #28", "18/04", "40", "20%"],
    ]);
  });

  it("shows each group's rate by default, dimming and counting small groups", () => {
    stubNoShows();
    mountTab();
    cy.getBySel("stats-noshow-view-rate")
      .should("have.text", "Tasa")
      .and("have.attr", "aria-pressed", "true");
    shouldHeadValuesWith("No vinieron");
    shouldHaveRates(GENDER, [
      ["Hombre", "10%", null],
      ["NEW_CODE", "50%", "n = 4"],
      ["Sin dato", "19%", null],
    ]);
    cy.getBySel("stats-rate-row-NEW_CODE").should(
      "have.class",
      "text-muted-foreground",
    );
    cy.getBySel("stats-rate-row-MALE").should(
      "not.have.class",
      "text-muted-foreground",
    );
    shouldHaveRates(HISTORY, [
      ["Primera vez", "30%", null],
      ["Ya habían venido", "6%", null],
    ]);
    // Rated over the sign-ups that were not cancelled.
    cy.getBySel("stats-rate-row-SAME_DAY")
      .findBySel("stats-rate-value")
      .should("have.text", "15%");
  });

  it("draws each bar as long as its rate and none for a missing rate", () => {
    stubNoShows();
    mountTab();
    const barStyle = (key: string) =>
      cy
        .getBySel(`stats-rate-row-${key}`)
        .findBySel("stats-rate-bar")
        .should("have.attr", "style");
    // 10%, 50% and 5/26 (19%) on a 0 to 100% track.
    barStyle("MALE").and("contain", "width: 10%");
    barStyle("NEW_CODE").and("contain", "width: 50%");
    cy.getBySel("stats-rate-row-null")
      .findBySel("stats-rate-bar")
      .should(($bar) => {
        expect(Math.round(parseFloat($bar[0]!.style.width))).to.equal(19);
      });
    cy.getBySel("stats-rate-row-AGE_18_24")
      .findBySel("stats-rate-bar")
      .should("have.attr", "style")
      .and("contain", "width: 15%");
    cy.getBySel("stats-rate-row-AGE_25_29").within(() => {
      cy.getBySel("stats-rate-value").should("have.text", "–");
      cy.getBySel("stats-rate-bar").should("not.exist");
    });
  });

  it("switches every breakdown card to the share of no-shows", () => {
    stubNoShows();
    mountTab();
    cy.getByRole("button", { name: "Composición" }).click();
    shouldHeadValuesWith("De los ausentes");
    // 5, 2 and 5 of the 12 no-shows, the unknown group included.
    shouldHaveRates(GENDER, [
      ["Hombre", "42%", null],
      ["NEW_CODE", "17%", null],
      ["Sin dato", "42%", null],
    ]);
    shouldHaveRates(HISTORY, [
      ["Primera vez", "75%", null],
      ["Ya habían venido", "25%", null],
    ]);
    cy.getBySel("stats-rate-row-SAME_DAY")
      .findBySel("stats-rate-value")
      .should("have.text", "100%");
    cy.getBySel("stats-noshow-view-rate").should(
      "have.attr",
      "aria-pressed",
      "false",
    );
    // A share is an exact count, so a small group is not dimmed.
    cy.getBySel("stats-rate-row-NEW_CODE").should(
      "not.have.class",
      "text-muted-foreground",
    );
  });

  it("opens on the share view from the URL", () => {
    stubNoShows();
    mountTab({}, { path: "/stats?noshow_view=share" });
    cy.getBySel("stats-noshow-view-share").should(
      "have.attr",
      "aria-pressed",
      "true",
    );
    cy.getBySel("stats-rate-row-MALE")
      .findBySel("stats-rate-value")
      .should("have.text", "42%");
  });

  it("falls back to rates for an unknown view", () => {
    stubNoShows();
    mountTab({}, { path: "/stats?noshow_view=bogus" });
    cy.getBySel("stats-rate-row-MALE")
      .findBySel("stats-rate-value")
      .should("have.text", "10%");
  });

  it("shows no share when nobody missed", () => {
    stubNoShows(
      makeNoShowStats({
        gender: [
          makeNoShowGenderGroup("MALE", 50, 0),
          makeNoShowGenderGroup(null, 26, 0),
        ],
      }),
    );
    mountTab({}, { path: "/stats?noshow_view=share" });
    shouldHaveRates(GENDER, [
      ["Hombre", "–", null],
      ["Sin dato", "–", null],
    ]);
  });

  it("lists the guests who missed with a dot per sign-up and a link to each", () => {
    stubNoShows();
    mountTab();
    cy.getBySel("stats-noshow-guest-guest-1").within(() => {
      cy.getByRole("link", { name: "Luna" }).should(
        "have.attr",
        "href",
        "/guests/guest-1",
      );
      cy.getBySel("stats-noshow-guest-missed").should(
        "have.text",
        "faltó 3 de 3",
      );
      cy.getBySel("stats-noshow-guest-last").should(
        "have.text",
        "la última el 18/04",
      );
      cy.getBySel("stats-dot-missed").should("have.length", 3);
      cy.getBySel("stats-dot-came").should("not.exist");
    });
    cy.getBySel("stats-noshow-guest-guest-2").within(() => {
      cy.getBySel("stats-noshow-guest-missed").should(
        "have.text",
        "faltó 2 de 4",
      );
      cy.getBySel("stats-noshow-guest-last").should(
        "have.text",
        "la última el 04/04",
      );
      cy.getBySel("stats-dot-missed").should("have.length", 2);
      cy.getBySel("stats-dot-came").should("have.length", 2);
    });
    cy.getBySel("stats-noshow-guests-more").should("not.exist");
  });

  it("caps the dots and counts the rest", () => {
    stubNoShows(
      makeNoShowStats({
        guests: [makeNoShowGuest({ expected: 15, attended: 10, no_show: 5 })],
        guests_total: 1,
      }),
    );
    mountTab();
    cy.getBySel("stats-noshow-guest-guest-1").within(() => {
      cy.getBySel("stats-dot-missed").should("have.length", 5);
      cy.getBySel("stats-dot-came").should("have.length", 7);
      cy.getBySel("stats-dots-extra").should("have.text", "+3");
    });
  });

  it("says how many more guests the list leaves out", () => {
    stubNoShows(makeNoShowStats({ guests_total: 52 }));
    mountTab();
    cy.getBySel("stats-noshow-guests-more").should("have.text", "y 50 más");
  });

  it("says when nobody missed twice in the period", () => {
    stubNoShows(makeNoShowStats({ guests: [], guests_total: 0 }));
    mountTab();
    cy.getBySel("stats-noshow-guests-none").should(
      "have.text",
      "Nadie faltó 2 veces o más en este período.",
    );
  });

  it("says when everyone came to the one event", () => {
    stubNoShows(makeNoShowStats({ meetups: [], guests: [], guests_total: 0 }));
    mountTab({ query: { meetupId: "m1" } });
    cy.getBySel("stats-noshow-guests-none").should(
      "have.text",
      "Vinieron todos los que se anotaron.",
    );
  });

  it("explains what counts as not coming and points to the weather tab", () => {
    stubNoShows();
    mountTab();
    shouldHaveNotes([
      "No vino quien se anotó, no canceló y nunca ingresó por la puerta. Los discretos y los que cancelaron no cuentan. El porcentaje es sobre los anotados que no cancelaron.",
      "Ya habían venido quiere decir que habían asistido antes a otro evento de la organización, en cualquier fecha.",
      "Cada punto es una inscripción que no se canceló: lleno si no vino, vacío si vino. Primero los que más faltaron.",
      "Cómo influye el clima en la asistencia está en la pestaña Clima.",
    ]);
  });

  it("names the cards in English", () => {
    stubNoShows();
    mountTab({}, { lang: "en" });
    shouldShowHeadline("no-show-rate", { label: "No-show" });
    shouldShowHeadline("repeat-no-shows", {
      label: "Missed 2 or more times",
      value: "3",
    });
    cy.getByRole("heading", { name: "Who signs up and doesn't come" }).should(
      "be.visible",
    );
    cy.getBySel("stats-noshow-guest-guest-1")
      .findBySel("stats-noshow-guest-missed")
      .should("have.text", "missed 3 of 3");
  });

  it("has no accessibility violations", () => {
    stubNoShows();
    mountTab();
    cy.getBySel("stats-headline-no-show-rate").should("be.visible");
    waitForAnimations();
    cy.checkA11yAA();
  });
});
