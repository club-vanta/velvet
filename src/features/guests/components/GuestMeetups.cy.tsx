import { makeGuestMeetupAttendance, makeGuestMeetups } from "@/tests/factories";
import { formatDate } from "@/lib/format";
import { GuestMeetups } from "./GuestMeetups";

const MEETUPS = makeGuestMeetups([
  makeGuestMeetupAttendance({
    meetup_id: "m-5",
    name: "Sadoplace",
    status: "UPCOMING",
  }),
  makeGuestMeetupAttendance({
    meetup_id: "m-4",
    name: "Cuerdas",
    status: "NO_SHOW",
    rsvp_time: "2026-10-02T15:00:00Z",
  }),
  makeGuestMeetupAttendance({
    meetup_id: "m-3",
    name: "Munch Palermo",
    status: "ATTENDED",
    arrival_time: "2026-09-26T00:47:00Z",
    guest_type: "VENDOR",
  }),
  makeGuestMeetupAttendance({
    meetup_id: "m-2",
    name: "Septiembre",
    status: "CANCELLED",
  }),
  makeGuestMeetupAttendance({
    meetup_id: "m-1",
    name: "Munch Agosto",
    status: "WALKIN",
    arrival_time: "2026-08-15T01:10:00Z",
  }),
]);

function stubMeetups(body = MEETUPS) {
  cy.stubApi("GET", "/organizations/{org_id}/guests/{guest_id}/meetups", {
    body,
    params: { org_id: "org-1", guest_id: "g-1" },
  }).as("getMeetups");
}

function mount({ orgId = "org-1", path = "/guests/g-1", lang = "en" } = {}) {
  cy.mount(<GuestMeetups guestId="g-1" orgId={orgId} headingAs="h2" />, {
    as: "staff",
    path,
    lang: lang as "en" | "es",
  });
}

function totalFor(status: string) {
  return cy
    .getBySel(`guest-meetups-total-${status}`)
    .findBySel("guest-meetups-count");
}

describe("<GuestMeetups />", () => {
  it("asks the org-scoped endpoint and lists each meetup newest first with its status", () => {
    stubMeetups();
    mount();
    cy.wait("@getMeetups");

    cy.getByRole("heading", { name: "Meetups" }).should("match", "h2");
    cy.getBySel("meetup-status").should(($badges) => {
      expect($badges.toArray().map((el) => el.textContent)).to.deep.equal([
        "Upcoming",
        "No-show",
        "Attended",
        "Cancelled",
        "Walk-in",
      ]);
    });
    cy.getBySel("meetup-name").should(($names) => {
      expect($names.toArray().map((el) => el.textContent)).to.deep.equal([
        "Sadoplace",
        "Cuerdas",
        "Munch Palermo",
        "Septiembre",
        "Munch Agosto",
      ]);
    });
  });

  it("links each meetup to its page", () => {
    stubMeetups();
    mount();
    cy.getByRole("link", { name: "Cuerdas" }).should(
      "have.attr",
      "href",
      "/meetups/m-4",
    );
  });

  it("does not link the meetup the page is already on, and marks it", () => {
    stubMeetups();
    mount({ path: "/meetups/m-4" });
    cy.getBySel("guest-meetup-m-4").within(() => {
      cy.getByRole("link").should("not.exist");
      cy.getBySel("meetup-name").should("have.text", "Cuerdas");
      cy.getBySel("meetup-current").should("have.text", "This meetup");
    });
    cy.getBySel("guest-meetup-m-5").getByRole("link").should("exist");
  });

  it("shows the guest type badge only when it is not regular", () => {
    stubMeetups();
    mount();
    cy.getBySel("guest-meetup-m-3")
      .findBySel("guest-type-badge")
      .should("have.text", "Vendor");
    cy.getBySel("guest-type-badge").should("have.length", 1);
  });

  it("says a walk-in did not sign up, and shows arrival only when present", () => {
    stubMeetups();
    mount();
    cy.getBySel("guest-meetup-m-1")
      .findBySel("meetup-meta")
      .should("contain.text", "Didn't sign up")
      .and("contain.text", "Arrived");
    cy.getBySel("guest-meetup-m-4")
      .findBySel("meetup-meta")
      .should(
        "have.text",
        `${formatDate("2026-10-01T22:00:00Z")} · Signed up ${formatDate("2026-10-02T15:00:00Z")}`,
      );
  });

  it("counts each status in the summary, walk-ins inside attended", () => {
    stubMeetups();
    mount();
    totalFor("ATTENDED").should("have.text", "2");
    cy.getBySel("guest-meetups-walkins").should("have.text", "(Walk-in: 1)");
    totalFor("NO_SHOW").should("have.text", "1");
    totalFor("CANCELLED").should("have.text", "1");
    totalFor("UPCOMING").should("have.text", "1");
  });

  it("uses the Spanish labels, with Discreto for walk-ins", () => {
    stubMeetups();
    mount({ lang: "es" });
    cy.getBySel("guest-meetup-m-1")
      .findBySel("meetup-status")
      .should("have.text", "Discreto");
    cy.getByRole("group", { name: "Totales", native: false }).should("exist");
    cy.getBySel("guest-meetups-total-ATTENDED")
      .getByRole("term")
      .should("have.text", "Fue");
    cy.getBySel("guest-meetups-walkins").should("have.text", "(Discreto: 1)");
    cy.getBySel("guest-meetups-total-NO_SHOW")
      .getByRole("term")
      .should("have.text", "No fue");
    cy.getBySel("guest-meetups-total-CANCELLED")
      .getByRole("term")
      .should("have.text", "Se bajó");
    cy.getBySel("guest-meetups-total-UPCOMING")
      .getByRole("term")
      .should("have.text", "Próximo");
  });

  it("hides zero counts in the summary", () => {
    stubMeetups(
      makeGuestMeetups([makeGuestMeetupAttendance({ status: "NO_SHOW" })]),
    );
    mount();
    cy.getBySel("guest-meetups-summary")
      .getByRole("term")
      .should("have.length", 1)
      .and("have.text", "No-show");
  });

  it("shows the empty state", () => {
    stubMeetups(makeGuestMeetups([]));
    mount();
    cy.getBySel("guest-meetups-empty").should(
      "have.text",
      "Hasn't signed up for any meetups in this organization.",
    );
    cy.getBySel("guest-meetups-summary").should("not.exist");
  });

  it("shows placeholders while loading", () => {
    cy.stubApi("GET", "/organizations/{org_id}/guests/{guest_id}/meetups", {
      body: MEETUPS,
      delay: 800,
    }).as("getMeetups");
    mount();
    cy.getBySel("section-loading").should("be.visible");
    cy.wait("@getMeetups");
    cy.getBySel("section-loading").should("not.exist");
  });

  it("shows retry when meetups fail, and recovers", () => {
    cy.stubApiError(
      "GET",
      "/organizations/{org_id}/guests/{guest_id}/meetups",
      { statusCode: 500, detail: "boom" },
    );
    mount();
    cy.getBySel("section-error-message").should(
      "have.text",
      "Failed to load meetups.",
    );
    stubMeetups();
    cy.getByRole("button", { name: "Retry" }).click();
    cy.wait("@getMeetups");
    cy.getBySel("meetup-name").should("have.length", 5);
  });

  it("renders nothing and does not query without an org", () => {
    cy.stubApiError(
      "GET",
      "/organizations/{org_id}/guests/{guest_id}/meetups",
      { statusCode: 500 },
    ).as("getMeetups");
    mount({ orgId: "" });
    cy.getBySel("guest-meetups").should("not.exist");
    cy.get("@getMeetups.all").should("have.length", 0);
  });

  it("has no accessibility violations", () => {
    stubMeetups();
    mount();
    cy.getBySel("guest-meetups-summary").should("be.visible");
    cy.checkA11yAA();
  });
});
