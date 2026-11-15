import { Input } from "@/components/ui/input";
import { AuthField } from "./AuthField";

describe("<AuthField />", () => {
  it("names the control with its label", () => {
    cy.mount(
      <AuthField id="username" label="Username">
        {(control) => <Input {...control} data-cy="control" />}
      </AuthField>,
    );
    cy.getByRole("textbox", { name: "Username" }).should(
      "have.attr",
      "data-cy",
      "control",
    );
    cy.getBySel("control").should("not.have.attr", "aria-describedby");
  });

  it("describes the control with its hint", () => {
    cy.mount(
      <AuthField id="password" label="Password" hint="Minimum 15 characters.">
        {(control) => <Input {...control} data-cy="control" />}
      </AuthField>,
    );
    cy.getBySel("control").should(($control) => {
      const hintId = $control.attr("aria-describedby") ?? "";
      const hint = $control[0].ownerDocument.getElementById(hintId);
      expect(hint?.textContent).to.equal("Minimum 15 characters.");
    });
    cy.checkA11yAA();
  });
});
