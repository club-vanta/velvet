import { VantStatusError } from "./VantStatusError";

describe("<VantStatusError />", () => {
  it("says the vant status is unknown and retries on demand", () => {
    cy.mount(<VantStatusError onRetry={cy.spy().as("onRetry")} />);
    cy.getBySel("guest-vant-status-message").should(
      "have.text",
      "Couldn't check whether this guest is vanted.",
    );
    cy.getByRole("button", { name: "Retry" }).click();
    cy.get("@onRetry").should("have.been.calledOnce");
    cy.checkA11yAA();
  });
});
