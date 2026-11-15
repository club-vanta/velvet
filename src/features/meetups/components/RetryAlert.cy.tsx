import { RetryAlert } from "./RetryAlert";

describe("<RetryAlert />", () => {
  it("announces the failure and retries", () => {
    cy.mount(
      <RetryAlert
        message="Failed to load meetup."
        onRetry={cy.spy().as("onRetry")}
        data-cy="alert"
      />,
    );
    cy.getByRole("alert", { native: false })
      .should("have.attr", "data-cy", "alert")
      .and("contain.text", "Failed to load meetup.");
    cy.getByRole("button", { name: "Retry" }).click();
    cy.get("@onRetry").should("have.been.calledOnce");
    cy.checkA11yAA('[data-cy="alert"]');
  });
});
