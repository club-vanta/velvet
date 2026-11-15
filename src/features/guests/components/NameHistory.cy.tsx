import { makeNameHistory, makeNameHistoryEntry } from "@/tests/factories";
import { formatFullDateTime } from "@/lib/format";
import { NameHistory } from "./NameHistory";

const HISTORY = makeNameHistory([
  makeNameHistoryEntry({
    displayname: "Juan P.",
    source: "SYNC",
    recorded_at: "2026-10-18T03:00:00Z",
  }),
  makeNameHistoryEntry({
    displayname: "Juan Perez",
    source: "MANUAL_EDIT",
    recorded_at: "2026-10-11T03:00:00Z",
    actor: { id: 1, username: "carla" },
  }),
  makeNameHistoryEntry({
    displayname: "Juan",
    source: "BACKFILL",
    recorded_at: "2026-10-01T03:00:00Z",
  }),
  makeNameHistoryEntry({
    displayname: "J",
    source: "SOMETHING_NEW",
    recorded_at: "2026-09-01T03:00:00Z",
  }),
]);

function stubHistory(body = HISTORY) {
  cy.stubApi("GET", "/guests/{guest_id}/displayname-history", {
    body,
    params: { guest_id: "g-1" },
  }).as("getHistory");
}

function mount(lang: "en" | "es" = "en") {
  cy.mount(<NameHistory guestId="g-1" headingAs="h3" />, {
    as: "staff",
    lang,
  });
}

describe("<NameHistory />", () => {
  it("lists the names newest first, with source, actor and date", () => {
    stubHistory();
    mount();
    cy.getByRole("heading", { name: "Name history" }).should("match", "h3");
    cy.getBySel("history-item").should("have.length", 4);
    cy.getBySel("history-item")
      .eq(0)
      .within(() => {
        cy.getBySel("history-name").should("have.text", "Juan P.");
        cy.getBySel("history-current").should("have.text", "Current");
        cy.getBySel("history-meta").should(
          "have.text",
          `Mazmo sync · ${formatFullDateTime("2026-10-18T03:00:00Z")}`,
        );
      });
    cy.getBySel("history-item")
      .eq(1)
      .within(() => {
        cy.getBySel("history-current").should("not.exist");
        cy.getBySel("history-meta").should(
          "have.text",
          `Manual · by carla · ${formatFullDateTime("2026-10-11T03:00:00Z")}`,
        );
      });
    cy.getBySel("history-item")
      .eq(2)
      .findBySel("history-backfill-hint")
      .should("be.visible");
    cy.getBySel("history-item")
      .eq(3)
      .findBySel("history-meta")
      .should(
        "have.text",
        `SOMETHING_NEW · ${formatFullDateTime("2026-09-01T03:00:00Z")}`,
      );
  });

  it("uses Spanish source labels", () => {
    stubHistory();
    mount("es");
    cy.getBySel("history-current").should("have.text", "Actual");
    cy.getBySel("history-item")
      .eq(1)
      .findBySel("history-meta")
      .should("contain.text", "Manual · por carla");
  });

  it("says so when there is no history", () => {
    stubHistory(makeNameHistory([]));
    mount();
    cy.getBySel("guest-history-empty").should(
      "have.text",
      "No name history recorded.",
    );
  });

  it("shows placeholders, then an error with a working retry", () => {
    cy.stubApiError("GET", "/guests/{guest_id}/displayname-history", {
      statusCode: 500,
    });
    mount();
    cy.getBySel("section-error-message").should(
      "have.text",
      "Failed to load name history.",
    );
    stubHistory();
    cy.getByRole("button", { name: "Retry" }).click();
    cy.wait("@getHistory");
    cy.getBySel("history-item").should("have.length", 4);
  });

  it("has no accessibility violations", () => {
    stubHistory();
    mount();
    cy.getBySel("history-item").should("have.length", 4);
    cy.checkA11yAA();
  });
});
