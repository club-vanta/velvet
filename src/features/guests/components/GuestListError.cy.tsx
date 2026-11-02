import { GuestListError } from "./GuestListError";

describe("<GuestListError />", () => {
  beforeEach(() => {
    cy.mount(
      <GuestListError
        message="Failed to load guests."
        onRetry={cy.spy().as("onRetry")}
      />,
    );
  });

  it("shows the message and retries on demand", () => {
    cy.getBySel("guests-error-message").should(
      "have.text",
      "Failed to load guests.",
    );
    cy.getByRole("button", { name: "Retry" }).click();
    cy.get("@onRetry").should("have.been.calledOnce");
  });

  it("has no accessibility violations", () => {
    cy.checkA11yAA();
  });
});
