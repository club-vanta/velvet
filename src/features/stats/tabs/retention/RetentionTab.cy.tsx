import { useState } from "react";
import { RetentionTab } from "./RetentionTab";
import type { StatsTabProps } from "../../lib/statsTab";
import {
  ORG_ID,
  makeEmptyRetentionSummary,
  makeEventRetentionStats,
  makeRetentionNight,
  makeRetentionStats,
  makeRetentionSummary,
} from "@/tests/factories";
import {
  LAST_3_MONTHS,
  requestQuery,
  shouldHaveNotes,
  shouldHaveTable,
  shouldShowHeadline,
  stubRetention,
  waitForAnimations,
} from "../../../../../cypress/support/routes/stats";

const ONE_EVENT = { meetupId: "m1" };

const PERIOD_HEADINGS = [
  "Nuevas y conocidas por evento",
  "Cada cuánto vienen",
  "Cohortes",
  "Dejaron de venir",
];

const NOTE_FIRST_TIME =
  "Primera vez es el primer evento de esta organización al que la persona vino, desde siempre. Venir como staff no cuenta.";
const NOTE_RETURN_RATE =
  "Quienes vinieron por primera vez hace poco tuvieron poco tiempo para volver.";

function mountTab(props: Partial<StatsTabProps> = {}) {
  cy.mount(
    <RetentionTab
      orgId={ORG_ID}
      query={LAST_3_MONTHS}
      period={{ preset: "3m" }}
      onShowAll={cy.spy().as("onShowAll")}
      {...props}
    />,
    { lang: "es" },
  );
}

const mouse = { eventConstructor: "PointerEvent", pointerType: "mouse" };
const finger = { eventConstructor: "PointerEvent", pointerType: "touch" };

/** Points at a face with a mouse (React reads pointerover as entering). */
function hoverFace(container: string, guestId: string) {
  cy.getBySel(container)
    .findBySel(`stats-face-${guestId}`)
    .trigger("pointerover", mouse);
}

/** Taps a face with a finger: down, then up on the same face. */
function tapFace(container: string, guestId: string) {
  cy.getBySel(container)
    .findBySel(`stats-face-${guestId}`)
    .trigger("pointerdown", finger);
  cy.getBySel(container)
    .findBySel(`stats-face-${guestId}`)
    .trigger("pointerup", finger);
}

/** Checks the open face card: a string is a part's text, null its absence. */
function shouldShowFaceCard(
  parts: Partial<Record<"name" | "visit" | "gap" | "back", string | null>>,
) {
  for (const [part, text] of Object.entries(parts)) {
    if (text === null) {
      cy.getBySel(`stats-face-card-${part}`).should("not.exist");
    } else {
      cy.getBySel(`stats-face-card-${part}`).should("have.text", text);
    }
  }
}

describe("<RetentionTab />", () => {
  it("shows a skeleton while loading", () => {
    stubRetention(makeRetentionStats(), { delay: 1000 });
    mountTab();
    cy.getBySel("stats-retention-skeleton").should("be.visible");
    cy.wait("@getRetention");
    cy.getBySel("stats-retention-skeleton").should("not.exist");
  });

  it("waits without fetching while the filters are not ready", () => {
    mountTab({ query: null });
    cy.getBySel("stats-retention-skeleton").should("be.visible");
  });

  it("sends the period and the event to the API", () => {
    stubRetention(makeEventRetentionStats());
    mountTab({
      query: { from: "2026-03-01", to: "2026-04-01", meetupId: "m1" },
    });
    requestQuery("@getRetention").should("deep.equal", {
      from: "2026-03-01",
      to: "2026-04-01",
      meetup_id: "m1",
    });
  });

  it("announces the error and retries the request", () => {
    cy.stubApiError("GET", "/organizations/{org_id}/stats/retention", {
      statusCode: 500,
    });
    mountTab();
    cy.getByRole("alert").should(
      "contain.text",
      "No se pudieron cargar las estadísticas.",
    );
    stubRetention();
    cy.getBySel("stats-retry").click();
    cy.wait("@getRetention");
    cy.getBySel("stats-headline-came-back").should("be.visible");
  });

  it("shows the empty state when nobody attended in the period", () => {
    stubRetention(
      makeRetentionStats({
        summary: makeEmptyRetentionSummary(),
        meetups: [],
        cohorts: [],
        lapsed: [],
        lapsed_total: 0,
      }),
    );
    mountTab();
    cy.getBySel("stats-empty").should(
      "have.text",
      "No hay eventos finalizados en este período",
    );
    cy.getBySel("stats-headline-came-back").should("not.exist");
    cy.getByRole("table").should("not.exist");
  });

  it("shows the empty state when nobody attended the event", () => {
    stubRetention(
      makeEventRetentionStats({ summary: makeEmptyRetentionSummary() }),
    );
    mountTab({ query: ONE_EVENT });
    cy.getBySel("stats-empty").should("be.visible");
    cy.getBySel("stats-headline-came-back").should("not.exist");
  });

  it("shows exact headline values against the previous period", () => {
    stubRetention(
      makeRetentionStats({
        comparison_kind: "PREVIOUS_PERIOD",
        comparison: makeRetentionSummary({
          attendees: 100,
          first_timer_return_rate: 0.3,
        }),
      }),
    );
    mountTab();
    shouldShowHeadline("people", {
      label: "Personas",
      value: "120",
      comparison: "+20% respecto al período anterior",
    });
    shouldShowHeadline("first-time", {
      label: "Primera vez",
      value: "49",
      subline: "41% del total",
      comparison: null,
    });
    shouldShowHeadline("came-back", {
      label: "Volvieron",
      value: "35%",
      subline: null,
      comparison: "+5 puntos respecto al período anterior",
      sample: null,
    });
  });

  it("formats the counts for the locale", () => {
    stubRetention(
      makeRetentionStats({
        summary: makeRetentionSummary({ attendees: 120000, new_guests: 49000 }),
      }),
    );
    mountTab();
    shouldShowHeadline("people", { value: "120.000" });
    shouldShowHeadline("first-time", { value: "49.000" });
  });

  it("dims the return rate with n when there were few first-timers", () => {
    stubRetention(
      makeRetentionStats({ summary: makeRetentionSummary({ new_guests: 6 }) }),
    );
    mountTab();
    shouldShowHeadline("came-back", { sample: "n = 6" });
  });

  it("shows dashes and no n when nobody came for the first time, and no cohorts", () => {
    stubRetention(
      makeRetentionStats({
        summary: makeRetentionSummary({
          new_guests: 0,
          returning: 120,
          new_share: 0,
          first_timer_return_rate: null,
        }),
        cohorts: [],
      }),
    );
    mountTab();
    shouldShowHeadline("first-time", { value: "0" });
    shouldShowHeadline("came-back", { value: "–", sample: null });
    cy.getByRole("region", { name: "Cohortes" }).should("not.exist");
  });

  it("shows the period sections with text tables for the charts", () => {
    stubRetention();
    mountTab();
    for (const heading of PERIOD_HEADINGS) {
      cy.getByRole("heading", { name: heading }).should("be.visible");
    }
    shouldHaveTable("Nuevas y conocidas por evento", [
      ["Evento", "Fecha", "Nuevas", "Conocidas"],
      ["Alter Marzo", "10 de mar de 2026", "20", "40"],
      ["Alter Abril", "10 de abr de 2026", "0", "0"],
    ]);
    shouldHaveTable("Cada cuánto vienen", [
      ["Veces que vinieron", "Personas"],
      ["1 vez", "70"],
      ["2 veces", "30"],
      ["3-5 veces", "15"],
      ["6+ veces", "5"],
    ]);
  });

  it("names the cohort table after its card and scrolls only the table", () => {
    stubRetention();
    mountTab();
    cy.getByRole("table", { name: "Cohortes" })
      .getByRole("row")
      .should("have.length", 3);
    cy.getByRole("table", { name: "Cohortes" })
      .parent()
      .should("have.class", "overflow-x-auto");
  });

  it("links each lapsed regular to their guest page and counts the rest", () => {
    stubRetention();
    mountTab();
    cy.getBySel("stats-lapsed-guest-1").within(() => {
      cy.getByRole("link", { name: "Ana" }).should(
        "have.attr",
        "href",
        "/guests/guest-1",
      );
      cy.getBySel("stats-lapsed-times").should("have.text", "vino 7 veces");
      cy.getBySel("stats-lapsed-last").should("have.text", "9 de ene de 2026");
    });
    cy.getByRole("link", { name: "Beto" }).should(
      "have.attr",
      "href",
      "/guests/guest-2",
    );
    cy.getBySel("stats-lapsed-more").should("have.text", "y 3 más");
  });

  it("leaves out the more line when every lapsed regular is shown", () => {
    stubRetention(makeRetentionStats({ lapsed_total: 2 }));
    mountTab();
    cy.getByRole("link", { name: "Ana" }).should("be.visible");
    cy.getBySel("stats-lapsed-more").should("not.exist");
  });

  it("says nobody stopped coming when the period has a start and no lapsed regulars", () => {
    stubRetention(makeRetentionStats({ lapsed: [], lapsed_total: 0 }));
    mountTab();
    cy.getByRole("region", { name: "Dejaron de venir" }).within(() => {
      cy.contains("Nadie dejó de venir").should("be.visible");
      cy.getByRole("list").should("not.exist");
    });
    cy.getBySel("stats-lapsed-more").should("not.exist");
  });

  it("leaves out the lapsed list for a period without a start", () => {
    stubRetention(makeRetentionStats({ lapsed: [], lapsed_total: null }));
    mountTab({ query: { to: "2026-04-16" } });
    cy.getBySel("stats-headline-came-back").should("be.visible");
    cy.getByRole("region", { name: "Dejaron de venir" }).should("not.exist");
    cy.contains("Personas que vinieron 3 veces o más").should("not.exist");
  });

  it("shows who came only once instead of first times over all time", () => {
    stubRetention(
      makeRetentionStats({
        summary: makeRetentionSummary({
          attendees: 155,
          new_guests: 155,
          came_back: 50,
          returning: 0,
          new_share: 1,
          first_timer_return_rate: 0.3226,
        }),
      }),
    );
    mountTab({ query: {} });
    shouldShowHeadline("came-once", {
      label: "Vinieron una sola vez",
      value: "105",
      subline: "68% del total",
    });
    cy.getBySel("stats-headline-first-time").should("not.exist");
    cy.getBySel("stats-note").should(($notes) => {
      expect($notes.toArray().map((n) => n.textContent)).not.to.include(
        NOTE_FIRST_TIME,
      );
    });
  });

  it("keeps first times for one event over all time", () => {
    stubRetention();
    mountTab({ query: ONE_EVENT });
    shouldShowHeadline("first-time", { value: "49" });
    cy.getBySel("stats-headline-came-once").should("not.exist");
  });

  it("keeps first times for a period with bounds", () => {
    stubRetention();
    mountTab();
    shouldShowHeadline("first-time", { value: "49" });
    cy.getBySel("stats-headline-came-once").should("not.exist");
  });

  it("explains first times, the return rate, cohorts and lapsed regulars", () => {
    stubRetention();
    mountTab();
    shouldHaveNotes([
      NOTE_FIRST_TIME,
      NOTE_RETURN_RATE,
      "Cada fila son las personas cuya primera vez fue ese mes; cada columna, qué parte volvió N meses después.",
      "Personas que vinieron 3 veces o más antes de este período y ninguna durante él.",
    ]);
  });

  describe("one event", () => {
    beforeEach(() => {
      stubRetention(makeEventRetentionStats());
    });

    it("shows the night instead of the period sections", () => {
      stubRetention(
        makeEventRetentionStats({
          comparison_kind: "PERIOD_AVERAGE",
          comparison: makeRetentionSummary({
            attendees: 4000,
            first_timer_return_rate: 0.3,
          }),
        }),
      );
      mountTab({ query: ONE_EVENT });
      cy.getBySel("stats-headline-people").should("not.exist");
      shouldShowHeadline("first-time", {
        subline: "40% del total",
        comparison: null,
      });
      shouldShowHeadline("came-back", {
        value: "50%",
        subline: "De quienes vinieron por primera vez",
        comparison: "En todos los eventos de los últimos 3 meses: 30%",
      });
      for (const heading of PERIOD_HEADINGS) {
        cy.getByRole("heading", { name: heading }).should("not.exist");
      }
      cy.getByRole("heading", { name: "El público de esa noche" }).should(
        "be.visible",
      );
      cy.getByRole("heading", { name: "¿Volvieron después?" }).should(
        "be.visible",
      );
      shouldHaveNotes([NOTE_FIRST_TIME, NOTE_RETURN_RATE]);
    });

    it("counts the regulars of the night instead of the people", () => {
      mountTab({ query: ONE_EVENT });
      shouldShowHeadline("regulars", {
        label: "Habitués",
        value: "1",
        subline: "20% del total, con 6 visitas o más",
      });
    });

    it("leaves out the first-timers subline when the event had no first-timers", () => {
      stubRetention(
        makeEventRetentionStats({
          summary: makeRetentionSummary({
            new_guests: 0,
            new_share: 0,
            first_timer_return_rate: null,
          }),
        }),
      );
      mountTab({ query: ONE_EVENT });
      shouldShowHeadline("came-back", { subline: null });
    });

    it("draws one face per person by visits, marking who came back", () => {
      mountTab({ query: ONE_EVENT });
      const band = (name: string, count: string, faces: [string, string][]) =>
        cy.getBySel(`stats-crowd-band-${name}`).within(() => {
          cy.getBySel("stats-crowd-count").should("have.text", count);
          cy.getBySelLike("stats-face-").should(($faces) => {
            expect(
              $faces
                .toArray()
                .map((f) => [f.dataset.guest, f.dataset.cameBack]),
            ).to.deep.equal(faces);
          });
        });
      band("first", "2", [
        ["g-dani", "true"],
        ["g-eli", "false"],
      ]);
      band("second", "1", [["g-caro", "false"]]);
      band("few", "1", [["g-beto", "false"]]);
      band("regular", "1", [["g-ana", "true"]]);
      shouldHaveTable("El público de esa noche", [
        ["Persona", "Visita", "Desde su visita anterior", "¿Volvió?"],
        ["Dani", "Primera vez", "–", "Volvió después"],
        ["Eli", "Primera vez", "–", "Todavía no volvió"],
        ["Caro", "Visita 2", "35 días", "Todavía no volvió"],
        ["Beto", "Visita 4", "7 meses", "Todavía no volvió"],
        ["Ana", "Visita 9", "28 días", "Volvió después"],
      ]);
    });

    it("shows who a face is on hover, and hides the card when the pointer leaves", () => {
      mountTab({ query: ONE_EVENT });
      hoverFace("stats-crowd", "g-beto");
      shouldShowFaceCard({
        name: "Beto",
        visit: "Esa noche: Visita 4",
        gap: "7 meses",
        back: "Todavía no volvió",
      });
      hoverFace("stats-crowd", "g-dani");
      shouldShowFaceCard({
        name: "Dani",
        visit: "Esa noche: Primera vez",
        gap: null,
        back: "Volvió después",
      });
      cy.getByRole("heading", { name: "El público de esa noche" }).then(
        ([heading]) => {
          cy.getBySel("stats-crowd").trigger("pointerout", {
            ...mouse,
            relatedTarget: heading,
          });
        },
      );
      cy.getBySel("stats-face-card-name").should("not.exist");
    });

    it("opens a face's card on a tap, not on a finger passing over it", () => {
      mountTab({ query: ONE_EVENT });
      // A finger scrolling across a face does not open it.
      cy.getBySel("stats-crowd")
        .findBySel("stats-face-g-ana")
        .trigger("pointerover", finger);
      cy.getBySel("stats-face-card-name").should("not.exist");
      tapFace("stats-crowd", "g-ana");
      // The finger lifting also "leaves", which keeps the card open.
      cy.getByRole("heading", { name: "¿Volvieron después?" }).then(
        ([heading]) => {
          cy.getBySel("stats-crowd").trigger("pointerout", {
            ...finger,
            relatedTarget: heading,
          });
        },
      );
      shouldShowFaceCard({ name: "Ana" });
      cy.getByRole("heading", { name: "¿Volvieron después?" }).trigger(
        "pointerdown",
      );
      cy.getBySel("stats-face-card-name").should("not.exist");
    });

    it("shows who of the night came to each next event", () => {
      mountTab({ query: ONE_EVENT });
      const afterwards = (
        id: string,
        [event, date, came]: string[],
        faces: string[],
      ) =>
        cy.getBySel(`stats-afterwards-${id}`).within(() => {
          cy.getBySel("stats-afterwards-event").should("have.text", event);
          cy.getBySel("stats-afterwards-date").should("have.text", date);
          cy.getBySel("stats-afterwards-came").should("have.text", came);
          if (faces.length === 0) {
            cy.getBySelLike("stats-face-").should("not.exist");
          } else {
            cy.getBySelLike("stats-face-").should(($faces) => {
              expect(
                $faces.toArray().map((f) => f.dataset.guest),
              ).to.deep.equal(faces);
            });
          }
        });
      afterwards(
        "m-apr",
        [
          "Alter Abril",
          "4 de abr de 2026",
          "Vino 1 de las 5 personas de esa noche",
        ],
        ["g-dani"],
      );
      afterwards(
        "m-may",
        [
          "Alter Mayo",
          "9 de may de 2026",
          "Vinieron 2 de las 5 personas de esa noche",
        ],
        ["g-ana", "g-dani"],
      );
      afterwards(
        "m-jun",
        ["Alter Junio", "6 de jun de 2026", "No vino nadie de esa noche"],
        [],
      );
      shouldHaveTable("¿Volvieron después?", [
        ["Evento", "Fecha", "De esa noche", "Quiénes"],
        ["Alter Abril", "4 de abr de 2026", "1", "Dani"],
        ["Alter Mayo", "9 de may de 2026", "2", "Ana, Dani"],
        ["Alter Junio", "6 de jun de 2026", "0", "–"],
      ]);
    });

    it("shows a face's card in the next events too, without saying they came back", () => {
      mountTab({ query: ONE_EVENT });
      hoverFace("stats-afterwards-m-may", "g-ana");
      // Everyone in these rows came back, so the card does not say so.
      shouldShowFaceCard({ name: "Ana", back: null });
    });

    it("keeps one card open when faces of both cards are tapped", () => {
      mountTab({ query: ONE_EVENT });
      tapFace("stats-crowd", "g-beto");
      shouldShowFaceCard({ name: "Beto" });
      tapFace("stats-afterwards-m-may", "g-ana");
      cy.getBySel("stats-face-card-name")
        .should("have.length", 1)
        .and("have.text", "Ana");
    });

    it("closes an open card when the event changes", () => {
      function EventSwitcher() {
        const [meetupId, setMeetupId] = useState("m1");
        return (
          <>
            <button
              type="button"
              onClick={() => setMeetupId(meetupId === "m1" ? "m2" : "m1")}
            >
              Next event
            </button>
            <RetentionTab
              orgId={ORG_ID}
              query={{ meetupId }}
              period={{ preset: "3m" }}
              onShowAll={() => {}}
            />
          </>
        );
      }
      cy.mount(<EventSwitcher />, { lang: "es" });
      cy.wait("@getRetention");
      cy.getByRole("button", { name: "Next event" }).click();
      cy.wait("@getRetention");
      tapFace("stats-crowd", "g-ana");
      shouldShowFaceCard({ name: "Ana" });
      // The first event is cached, so the tab stays mounted for the switch.
      cy.getByRole("button", { name: "Next event" }).click();
      cy.getBySel("stats-crowd").should("be.visible");
      cy.getBySel("stats-face-card-name").should("not.exist");
    });

    it("says when everyone from the night came to a later event", () => {
      const night = makeRetentionNight();
      stubRetention(
        makeEventRetentionStats({
          night: {
            ...night,
            afterwards: [
              {
                ...night.afterwards[0]!,
                guest_ids: night.guests.map((g) => g.guest_id),
              },
            ],
          },
        }),
      );
      mountTab({ query: ONE_EVENT });
      cy.getBySel("stats-afterwards-m-apr")
        .findBySel("stats-afterwards-came")
        .should("have.text", "Vinieron todos los de esa noche");
    });

    it("says when no event came after the night yet", () => {
      stubRetention(
        makeEventRetentionStats({
          night: makeRetentionNight({ afterwards: [] }),
        }),
      );
      mountTab({ query: ONE_EVENT });
      cy.getByRole("region", { name: "¿Volvieron después?" }).should(
        "contain.text",
        "Todavía no hubo eventos después de este.",
      );
      cy.getByRole("table", { name: "¿Volvieron después?" }).should(
        "not.exist",
      );
    });

    it("has no accessibility violations with a face's card open", () => {
      mountTab({ query: ONE_EVENT });
      cy.getBySel("stats-crowd").should("be.visible");
      waitForAnimations();
      tapFace("stats-crowd", "g-ana");
      shouldShowFaceCard({ name: "Ana" });
      cy.checkA11yAA();
    });
  });

  it("has no accessibility violations", () => {
    stubRetention();
    mountTab();
    cy.getBySel("stats-headline-came-back").should("be.visible");
    waitForAnimations();
    cy.checkA11yAA();
  });
});
