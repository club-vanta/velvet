import { makeOrg } from "@/tests/factories";
import { OrgHeader } from "./OrgHeader";

const org = makeOrg({ name: "Club Vanta", slug: "club-vanta" });

describe("<OrgHeader />", () => {
  it("shows the org's name and slug, with edit when allowed", () => {
    cy.mount(
      <OrgHeader
        org={org}
        isLoading={false}
        isError={false}
        onEdit={cy.spy().as("onEdit")}
      />,
    );
    cy.getByRole("heading", { name: "Club Vanta" }).should("be.visible");
    cy.getBySel("org-slug").should("have.text", "club-vanta");
    cy.getBySel("org-edit").click();
    cy.get("@onEdit").should("have.been.calledOnce");
  });

  it("has no edit button without onEdit", () => {
    cy.mount(<OrgHeader org={org} isLoading={false} isError={false} />);
    cy.getBySel("org-edit").should("not.exist");
  });

  it("shows placeholders while loading and an error when it fails", () => {
    cy.mount(<OrgHeader org={undefined} isLoading isError={false} />);
    cy.getBySel("org-loading").should("be.visible");
    cy.mount(<OrgHeader org={undefined} isLoading={false} isError />);
    cy.getBySel("org-error").should(
      "have.text",
      "Failed to load organizations",
    );
  });

  it("names the back button", () => {
    cy.mount(<OrgHeader org={org} isLoading={false} isError={false} />);
    cy.getByRole("button", { name: "Back to organizations" }).should(
      "be.visible",
    );
    cy.checkA11yAA();
  });
});
