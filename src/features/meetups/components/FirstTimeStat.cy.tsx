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

  it("filters the list to them", () => {
    mount(2, 0);
    cy.getByRole("button", { name: "Show only new guests" }).click();
    cy.get("@onShowOnly").should("have.been.calledOnce");
  });
});
