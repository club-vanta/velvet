import { OrgTotals, type Total } from "./OrgTotals";

const loaded = (value: number): Total => ({
  value,
  loading: false,
  error: false,
});
const loading: Total = { loading: true, error: false };
const failed: Total = { loading: false, error: true };

function mountTotals(props: Parameters<typeof OrgTotals>[0]) {
  cy.mount(
    <div className="@container">
      <OrgTotals {...props} />
    </div>,
  );
}

describe("<OrgTotals />", () => {
  it("shows the org's meetup and guest counts", () => {
    mountTotals({ meetups: loaded(12), guests: loaded(340) });
    cy.getBySel("dashboard-total-meetups").should("have.text", "12");
    cy.getBySel("dashboard-total-guests").should("have.text", "340");
    cy.getBySel("dashboard-pending-approvals").should("not.exist");
  });

  it("shows nothing but placeholders while loading", () => {
    mountTotals({ meetups: loading, guests: loading, pending: loading });
    cy.getBySel("dashboard-total-meetups").should("not.exist");
    cy.getBySel("dashboard-total-guests").should("not.exist");
    cy.getBySel("dashboard-pending-approvals").should("not.exist");
  });

  it("marks a failed count instead of showing zero", () => {
    mountTotals({ meetups: loaded(3), guests: failed, pending: failed });
    cy.getBySel("dashboard-total-guests-error").should("have.text", "—");
    cy.getBySel("dashboard-total-guests-failed").should(
      "have.text",
      "Could not load",
    );
    cy.getBySel("dashboard-pending-approvals-error").should("have.text", "—");
    cy.getBySel("dashboard-pending-approvals").should("not.exist");
  });

  it("links the pending approvals to the staff page", () => {
    mountTotals({ meetups: loaded(0), guests: loaded(0), pending: loaded(4) });
    cy.getByRole("link", { name: "4" }).should("have.attr", "href", "/staff");
  });

  it("has no accessibility violations", () => {
    mountTotals({ meetups: loaded(12), guests: failed, pending: loaded(4) });
    cy.checkA11yAA();
  });
});
