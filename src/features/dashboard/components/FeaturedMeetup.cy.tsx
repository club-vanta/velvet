import { ORG_ID, makeMeetup, makeMeetupStats } from "@/tests/factories";
import type { MeetupTiming } from "@/domain/meetup";
import { FeaturedMeetup } from "./FeaturedMeetup";

const meetup = makeMeetup({ id: "m-1", name: "Alter Night" });

function mountFeatured(timing: MeetupTiming) {
  cy.stubApi("GET", "/organizations/{org_id}/meetups/{meetup_id}/stats", {
    body: makeMeetupStats({
      attendance: {
        total_rsvps: 3,
        arrived_count: 1,
        not_arrived_count: 2,
        walkin_count: 0,
      },
    }),
    params: { org_id: ORG_ID, meetup_id: "m-1" },
  }).as("getStats");
  cy.mount(
    <div className="@container">
      <FeaturedMeetup orgId={ORG_ID} meetup={meetup} timing={timing} />
    </div>,
  );
}

describe("<FeaturedMeetup />", () => {
  it("names today's meetup and links to its door", () => {
    mountFeatured("today");
    cy.getBySel("dashboard-featured-label").should(
      "have.text",
      "Happening today",
    );
    cy.getByRole("region", { name: "Alter Night" }).should("be.visible");
    cy.getByRole("link", { name: "Open meetup" }).should(
      "have.attr",
      "href",
      "/meetups/m-1",
    );
    cy.wait("@getStats");
    cy.getBySel("dashboard-stat-arrived-percent").should(
      "have.text",
      "33% arrived",
    );
  });

  it("labels an upcoming and a past meetup", () => {
    mountFeatured("upcoming");
    cy.getBySel("dashboard-featured-label").should(
      "contain.text",
      "Next meetup",
    );
    mountFeatured("past");
    cy.getBySel("dashboard-featured-label").should(
      "contain.text",
      "Last meetup",
    );
  });

  it("offers a retry when its numbers fail to load", () => {
    cy.stubApiError(
      "GET",
      "/organizations/{org_id}/meetups/{meetup_id}/stats",
      {
        statusCode: 500,
      },
    ).as("getStats");
    cy.mount(
      <div className="@container">
        <FeaturedMeetup orgId={ORG_ID} meetup={meetup} timing="today" />
      </div>,
    );
    cy.wait("@getStats");
    cy.getBySel("dashboard-stats-error").should(
      "contain.text",
      "Failed to load meetup stats.",
    );
    cy.stubApi("GET", "/organizations/{org_id}/meetups/{meetup_id}/stats", {
      body: makeMeetupStats(),
    }).as("getStats");
    cy.getByRole("button", { name: "Retry" }).click();
    cy.wait("@getStats");
    cy.getBySel("dashboard-stat-rsvps").should("have.text", "0");
  });

  it("has no accessibility violations", () => {
    mountFeatured("today");
    cy.wait("@getStats");
    cy.getBySel("dashboard-stat-rsvps").should("be.visible");
    cy.checkA11yAA();
  });
});
