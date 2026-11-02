import type { Role } from "../../../src/tests/factories";
import { stubNavPages } from "../../support/routes/app";

// What each role finds in the nav, in order, and the heading of each page.
const HEADINGS = {
  dashboard: "Dashboard",
  meetups: "Meetups",
  guests: "Guests",
  stats: "Statistics",
  staff: "Staff Management",
  events: "Audit Log",
  organizations: "Organizations",
} as const;

type NavId = keyof typeof HEADINGS;

const NAV: Record<Role, NavId[]> = {
  staff: ["dashboard", "meetups", "guests"],
  orgAdmin: [
    "dashboard",
    "meetups",
    "guests",
    "stats",
    "events",
    "organizations",
  ],
  siteAdmin: [
    "dashboard",
    "meetups",
    "guests",
    "stats",
    "staff",
    "events",
    "organizations",
  ],
};

const PATHS: Record<NavId, string> = {
  dashboard: "/dashboard",
  meetups: "/meetups",
  guests: "/guests",
  stats: "/stats",
  staff: "/staff",
  events: "/events",
  organizations: "/organizations",
};

function navIds(prefix: string) {
  return ($links: JQuery<HTMLElement>) =>
    Cypress._.map($links, (link) => link.dataset.cy?.replace(prefix, ""));
}

for (const role of ["staff", "orgAdmin", "siteAdmin"] as const) {
  const allowed = NAV[role];
  const hidden = (Object.keys(PATHS) as NavId[]).filter(
    (id) => !allowed.includes(id),
  );

  describe(`Routes for ${role}`, () => {
    beforeEach(() => {
      cy.loginAs(role);
      stubNavPages();
    });

    it("lists only the pages the role may open in the nav", () => {
      cy.visit("/dashboard");
      cy.getBySelLike("shell-sidebar-link-").should(($links) => {
        expect(navIds("shell-sidebar-link-")($links)).to.deep.equal(allowed);
      });
    });

    it("opens every page of the nav", () => {
      cy.visit("/dashboard");
      for (const id of allowed) {
        cy.getBySel(`shell-sidebar-link-${id}`).click();
        cy.location("pathname").should("eq", PATHS[id]);
        cy.getBySel(`shell-sidebar-link-${id}`).should(
          "have.attr",
          "aria-current",
          "page",
        );
        cy.getByRole("heading", { name: HEADINGS[id] }).should("be.visible");
      }
    });

    if (hidden.length > 0) {
      it("sends the pages it may not open to the dashboard", () => {
        for (const id of hidden) {
          cy.visit(PATHS[id]);
          cy.location("pathname").should("eq", "/dashboard");
          cy.getByRole("heading", { name: "Dashboard" }).should("be.visible");
        }
      });
    }
  });
}

describe("Routes", () => {
  it("sends an unknown route to the dashboard", () => {
    cy.loginAs("staff");
    stubNavPages();
    cy.visit("/no-such-page");
    cy.location("pathname").should("eq", "/dashboard");
    cy.getByRole("heading", { name: "Dashboard" }).should("be.visible");
  });

  it("sends a signed-out visitor to login from any route", () => {
    cy.stubApiError("GET", "/auth/userinfo", { statusCode: 401 }).as(
      "userinfo",
    );
    for (const path of ["/dashboard", "/meetups/meetup-1", "/stats", "/x"]) {
      cy.visit(path, {
        onBeforeLoad: (win) => win.localStorage.setItem("lang", "en"),
      });
      cy.location("pathname").should("eq", "/");
      cy.getBySel("login-username").should("be.visible");
    }
    cy.getBySel("shell-sidebar").should("not.exist");
  });
});
