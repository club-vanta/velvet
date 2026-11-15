import { meetupDate, stubDashboard } from "../../support/routes/dashboard";
import { makeMeetup } from "../../../src/tests/factories";

// Newest first, as the API returns them: six meetups, one more than shown.
const meetups = Array.from({ length: 6 }, (_, i) =>
  makeMeetup({
    id: `m-${i + 1}`,
    name: `Alter #${6 - i}`,
    date: meetupDate(-7 * (i + 1)),
  }),
);

describe("Dashboard overview", () => {
  beforeEach(() => {
    cy.loginAs("staff");
  });

  it("shows the org totals and the five latest meetups", () => {
    stubDashboard({ meetups, guestsTotal: 1234 });
    cy.visit("/dashboard");
    cy.wait(["@getMeetups", "@getGuests"]);

    cy.getByRole("heading", { name: "Dashboard" }).should("be.visible");
    cy.getBySel("dashboard-total-meetups").should("have.text", "6");
    cy.getBySel("dashboard-total-guests").should("have.text", "1234");
    cy.getBySel("dashboard-recent-meetups")
      .getByRole("link", { name: /^Alter #/ })
      .should("have.length", 5)
      .first()
      .should("have.text", "Alter #6")
      .and("have.attr", "href", "/meetups/m-1");
    cy.getBySel("dashboard-recent-meetups")
      .getByRole("link", { name: "Alter #1" })
      .should("not.exist");
  });

  it("says so when the org has no meetups yet", () => {
    stubDashboard({ guestsTotal: 0 });
    cy.visit("/dashboard");
    cy.wait("@getMeetups");

    cy.getBySel("dashboard-meetups-empty").should(
      "have.text",
      "No meetups yet.",
    );
    cy.getBySel("dashboard-total-meetups").should("have.text", "0");
    cy.getBySel("dashboard-total-guests").should("have.text", "0");
    cy.getBySel("dashboard-recent-meetups").should("not.exist");
  });

  it("shows placeholders while the meetups load", () => {
    stubDashboard({ meetups, delay: 1000 });
    cy.visit("/dashboard");

    cy.getBySel("dashboard-meetups-loading").should("be.visible");
    cy.getBySel("dashboard-meetups-empty").should("not.exist");
    cy.getBySel("dashboard-total-meetups").should("not.exist");
    cy.wait("@getMeetups");
    cy.getBySel("dashboard-meetups-loading").should("not.exist");
    cy.getBySel("dashboard-total-meetups").should("have.text", "6");
  });

  it("shows an error with a retry when the meetups fail to load", () => {
    stubDashboard();
    cy.stubApiError("GET", "/organizations/{org_id}/meetups/", {
      statusCode: 500,
    }).as("getMeetups");
    cy.visit("/dashboard");
    cy.wait("@getMeetups");

    cy.getBySel("dashboard-meetups-error").should(
      "contain.text",
      "Failed to load meetups.",
    );
    // A failed load is neither "no meetups" nor a total of zero.
    cy.getBySel("dashboard-meetups-empty").should("not.exist");
    cy.getBySel("dashboard-total-meetups").should("not.exist");
    cy.getBySel("dashboard-total-meetups-error").should("have.text", "—");
    cy.getBySel("dashboard-total-meetups-failed").should(
      "have.text",
      "Could not load",
    );
    stubDashboard({ meetups });
    cy.getBySel("dashboard-meetups-error").within(() => {
      cy.getByRole("button", { name: "Retry" }).click();
    });
    cy.wait("@getMeetups");
    cy.getBySel("dashboard-meetups-error").should("not.exist");
    cy.getBySel("dashboard-total-meetups").should("have.text", "6");
  });

  it("does not count guests as zero when they fail to load", () => {
    stubDashboard({ meetups });
    cy.stubApiError("GET", "/guests/", { statusCode: 500 }).as("getGuests");
    cy.visit("/dashboard");
    cy.wait("@getGuests");

    cy.getBySel("dashboard-total-meetups").should("have.text", "6");
    cy.getBySel("dashboard-total-guests").should("not.exist");
    cy.getBySel("dashboard-total-guests-error").should("have.text", "—");
    cy.getBySel("dashboard-total-guests-failed").should(
      "have.text",
      "Could not load",
    );
  });

  it("opens the new meetup form from the shortcut", () => {
    stubDashboard({ meetups });
    cy.visit("/dashboard");
    cy.wait("@getMeetups");

    cy.getBySel("dashboard-new-meetup")
      .should("have.text", "New Meetup")
      .click();

    cy.location("pathname").should("eq", "/meetups");
    cy.getByRole("dialog", { native: false }).should("be.visible");
  });
});
