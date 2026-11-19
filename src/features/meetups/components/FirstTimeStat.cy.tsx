import { FirstTimeStat } from "./FirstTimeStat";

function mount(total: number, arrived: number) {
  cy.mount(
    <FirstTimeStat
      total={total}
      arrived={arrived}
      onShowOnly={cy.spy().as("onShowOnly")}
    />,
  );
}

describe("<FirstTimeStat />", () => {
  it("shows how many guests are new and how many already arrived", () => {
    mount(8, 3);
    cy.getByRole("region", { name: "New" }).should("be.visible");
    cy.getBySel("meetup-stats-first-time").should("have.text", "8");
    cy.getBySel("meetup-stats-first-time-arrived").should(
      "have.text",
      "3 already arrived",
    );
  });

  it("keeps the button inside a half-width card on a phone", () => {
    cy.viewport(375, 812);
    cy.mount(
      <div className="grid grid-cols-2 gap-2 p-4">
        <FirstTimeStat total={2} arrived={0} onShowOnly={() => {}} />
      </div>,
    );
    cy.getByRole("region", { name: "New" }).then(($card) => {
      const card = $card[0].getBoundingClientRect();
      cy.getByRole("button", { name: "Show only new guests" }).should(
        ($button) => {
          const button = $button[0].getBoundingClientRect();
          expect(button.right).to.be.at.most(card.right);
        },
      );
    });
  });

  it("filters the list to them", () => {
    mount(2, 0);
    cy.getByRole("button", { name: "Show only new guests" }).click();
    cy.get("@onShowOnly").should("have.been.calledOnce");
  });
});
