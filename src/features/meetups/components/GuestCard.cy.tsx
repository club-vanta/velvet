import { GuestCard } from "./GuestCard";

function mount(actions: React.ReactNode, dimmed = false) {
  cy.mount(
    <ul className="@container">
      <GuestCard
        data-cy="card"
        identity={<p data-cy="who">Luna</p>}
        menu={<button type="button">Menu</button>}
        statuses={null}
        actions={actions}
        dimmed={dimmed}
      />
    </ul>,
  );
}

describe("<GuestCard />", () => {
  it("shows who, the menu and the next step", () => {
    mount(<button type="button">Check in</button>);
    cy.getBySel("who").should("have.text", "Luna");
    cy.getByRole("button", { name: "Menu" }).should("be.visible");
    cy.getByRole("button", { name: "Check in" }).should("be.visible");
  });

  it("drops the steps band when there is no step left", () => {
    mount(null);
    cy.getBySel("card").within(() =>
      cy.getByRole("button", { name: "Check in" }).should("not.exist"),
    );
    cy.getBySel("card").should("have.css", "opacity", "1");
  });

  it("dims a cancelled RSVP", () => {
    mount(null, true);
    cy.getBySel("card").should("have.css", "opacity", "0.5");
  });
});
