import { GuestProfileUnavailable } from "./GuestProfileUnavailable";

describe("<GuestProfileUnavailable />", () => {
  it("says a guest was not found, with no retry", () => {
    cy.mount(
      <GuestProfileUnavailable Title="h1" notFound onRetry={() => {}} />,
    );
    cy.getByRole("heading", { name: "Guest not found" }).should("match", "h1");
    cy.getByRole("button", { name: "Retry" }).should("not.exist");
  });

  it("offers a retry when loading failed, at the caller's heading level", () => {
    cy.mount(
      <GuestProfileUnavailable
        Title="h2"
        notFound={false}
        onRetry={cy.spy().as("onRetry")}
      />,
    );
    cy.getByRole("heading", { name: "Failed to load guest." }).should(
      "match",
      "h2",
    );
    cy.getByRole("button", { name: "Retry" }).click();
    cy.get("@onRetry").should("have.been.calledOnce");
    cy.checkA11yAA();
  });
});
