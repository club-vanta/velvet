import { GuestList } from "./GuestList";

const BASE = {
  label: "All Guests",
  "data-cy": "list",
  isLoading: false,
  isError: false,
  total: 2,
  shown: 2,
  emptyMessage: "No guests yet.",
  noMatchMessage: "No guests match that search.",
};

describe("<GuestList />", () => {
  it("is a labelled list of its rows", () => {
    cy.mount(
      <GuestList {...BASE}>
        <li>Ana</li>
        <li>Bea</li>
      </GuestList>,
    );
    cy.getByRole("list", { name: "All Guests" })
      .getByRole("listitem")
      .should("have.length", 2);
    cy.getBySel("guests-empty").should("not.exist");
    cy.getBySel("guests-loading").should("not.exist");
  });

  it("shows five placeholder rows while loading, and no empty state", () => {
    cy.mount(
      <GuestList {...BASE} isLoading total={0} shown={0}>
        {null}
      </GuestList>,
    );
    cy.getBySel("guests-loading").should("have.length", 5);
    cy.getBySel("guests-empty").should("not.exist");
  });

  it("says when there is nothing at all", () => {
    cy.mount(
      <GuestList {...BASE} total={0} shown={0}>
        {null}
      </GuestList>,
    );
    cy.getBySel("guests-empty").should("have.text", "No guests yet.");
  });

  it("says when nothing matches", () => {
    cy.mount(
      <GuestList {...BASE} shown={0}>
        {null}
      </GuestList>,
    );
    cy.getBySel("guests-empty").should(
      "have.text",
      "No guests match that search.",
    );
  });

  it("does not call a list that failed to load empty", () => {
    cy.mount(
      <GuestList {...BASE} isError total={0} shown={0}>
        {null}
      </GuestList>,
    );
    cy.getBySel("guests-empty").should("not.exist");
  });

  it("has no accessibility violations", () => {
    cy.mount(
      <GuestList {...BASE} total={0} shown={0}>
        {null}
      </GuestList>,
    );
    cy.checkA11yAA();
  });
});
