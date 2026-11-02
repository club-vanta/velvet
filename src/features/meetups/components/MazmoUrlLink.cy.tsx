import { MazmoUrlLink } from "./MazmoUrlLink";

const URL = "https://mazmo.net/+eventos/alter-night";

describe("<MazmoUrlLink />", () => {
  it("shows the URL without its scheme and names the link for readers", () => {
    cy.mount(<MazmoUrlLink url={URL} />);
    cy.getByRole("link", { name: `Open ${URL} on Mazmo` })
      .should("have.text", "mazmo.net/+eventos/alter-night")
      .and("have.attr", "href", URL)
      .and("have.attr", "target", "_blank")
      .and("have.attr", "rel", "noreferrer");
  });

  it("uses its text as the name when given one", () => {
    cy.mount(<MazmoUrlLink url={URL} text="Go to the event on Mazmo" />);
    cy.getByRole("link", { name: "Go to the event on Mazmo" }).should(
      "not.have.attr",
      "aria-label",
    );
    cy.checkA11yAA();
  });
});
