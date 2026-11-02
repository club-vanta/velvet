import { InputWithPrefix } from "./input-with-prefix";

describe("<InputWithPrefix />", () => {
  it("shows the prefix next to a single, described input", () => {
    cy.mount(
      <InputWithPrefix prefix="@" placeholder="username" data-cy="field" />,
    );
    cy.getByRole("textbox").should("have.length", 1);
    cy.getBySel("field")
      .should("have.attr", "placeholder", "username")
      .and(($input) => {
        // The prefix is text the input points at, not something to type in.
        const prefixId = $input.attr("aria-describedby") ?? "";
        const prefix = $input[0].ownerDocument.getElementById(prefixId);
        expect(prefix?.textContent).to.equal("@");
        expect(prefix?.tagName).to.equal("SPAN");
      });
  });

  it("forwards value changes to onChange", () => {
    cy.mount(
      <InputWithPrefix
        prefix="@"
        data-cy="field"
        onChange={cy.spy().as("onChange")}
      />,
    );
    cy.getBySel("field").type("a");
    cy.get("@onChange").should("have.been.calledOnce");
    cy.getBySel("field").should("have.value", "a");
  });

  it("forwards disabled to the input", () => {
    cy.mount(<InputWithPrefix prefix="@" data-cy="field" disabled />);
    cy.getBySel("field").should("be.disabled");
  });

  it("marks the whole control invalid", () => {
    cy.mount(
      <div data-cy="host">
        <InputWithPrefix prefix="@" data-cy="field" aria-invalid />
      </div>,
    );
    cy.getBySel("host")
      .children()
      .first()
      .should("have.attr", "aria-invalid", "true");
  });

  it("has no accessibility violations", () => {
    cy.mount(
      <>
        <label htmlFor="handle">Instagram</label>
        <InputWithPrefix id="handle" prefix="@" />
      </>,
    );
    cy.checkA11yAA();
  });
});
