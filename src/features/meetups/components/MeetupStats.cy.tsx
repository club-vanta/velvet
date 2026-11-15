import { makeMeetupStats } from "@/tests/factories";
import { MeetupStats } from "./MeetupStats";

const PATH = "/organizations/{org_id}/meetups/{meetup_id}/stats" as const;

const STATS = makeMeetupStats({
  attendance: {
    total_rsvps: 12,
    arrived_count: 3,
    not_arrived_count: 9,
    walkin_count: 2,
  },
  cancellations: { cancelled_count: 4, cancelled_but_paid_count: 1 },
  guest_types: {
    normal_count: 7,
    invited_count: 2,
    vendor_count: 1,
    staff_count: 2,
  },
  payment: { paid_count: 5, unpaid_count: 2, exempt_from_payment_count: 5 },
});

function mount(requiresPayment = true) {
  cy.mount(
    <div data-cy="wrap">
      <MeetupStats
        orgId="org-1"
        meetupId="meetup-1"
        requiresPayment={requiresPayment}
      />
    </div>,
    { as: "staff" },
  );
}

describe("<MeetupStats />", () => {
  it("asks for the meetup's stats and shows each count exactly", () => {
    cy.stubApi("GET", PATH, {
      body: STATS,
      params: { org_id: "org-1", meetup_id: "meetup-1" },
    }).as("stats");
    mount();
    cy.wait("@stats");
    cy.getBySel("meetup-stats-arrived").should("have.text", "3 / 12");
    cy.getBySel("meetup-stats-percent").should("have.text", "25%");
    cy.getByRole("progressbar", { name: "Check-ins", native: false }).should(
      "have.attr",
      "aria-valuetext",
      "25%",
    );
    cy.getBySel("stat-walkins").should("have.text", "2");
    cy.getBySel("stat-invited").should("have.text", "2");
    cy.getBySel("stat-exempt").should("have.text", "5");
    cy.getBySel("stat-cancelled-paid").should("have.text", "1");
    cy.getByRole("region", { name: "Payment" }).should(
      "contain.text",
      "These guests paid and then cancelled. Check whether they need a refund.",
    );
    cy.checkA11yAA('[data-cy="wrap"]');
  });

  it("leaves out the payment card on a free meetup", () => {
    cy.stubApi("GET", PATH, { body: STATS }).as("stats");
    mount(false);
    cy.wait("@stats");
    cy.getByRole("region", { name: "Check-ins" }).should("be.visible");
    cy.getByRole("region", { name: "Payment" }).should("not.exist");
  });

  it("shows no refund line when nobody cancelled after paying", () => {
    cy.stubApi("GET", PATH, { body: makeMeetupStats() }).as("stats");
    mount();
    cy.wait("@stats");
    cy.getBySel("stat-cancelled-paid").should("not.exist");
    cy.getBySel("meetup-stats-percent").should("have.text", "0%");
  });

  it("shows placeholders, then an error with a retry", () => {
    cy.stubApiError("GET", PATH, { statusCode: 500 }).as("stats");
    mount();
    cy.getBySel("meetup-stats-error").should(
      "contain.text",
      "Failed to load meetup stats.",
    );
    cy.stubApi("GET", PATH, { body: STATS, delay: 300 }).as("stats");
    cy.getBySel("meetup-stats-error").findBySel("retry").click();
    cy.wait("@stats");
    cy.getBySel("meetup-stats").should("be.visible");
  });

  it("shows placeholders while loading", () => {
    cy.stubApi("GET", PATH, { body: STATS, delay: 500 }).as("stats");
    mount();
    cy.getBySel("meetup-stats-loading").children().should("have.length", 3);
    cy.wait("@stats");
    cy.getBySel("meetup-stats-loading").should("not.exist");
  });
});
