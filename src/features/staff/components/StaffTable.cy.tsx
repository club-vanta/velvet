import { makePendingUser, makeStaffUser } from "@/tests/factories";
import { StaffTable } from "./StaffTable";

describe("<StaffTable />", () => {
  it("shows skeleton rows while loading", () => {
    cy.mount(
      <StaffTable users={[]} currentUserId={1} isLoading isError={false} />,
    );
    cy.getBySel("staff-row-loading").should("have.length", 5);
    cy.getBySel("staff-empty").should("not.exist");
  });

  it("says so when there are no accounts", () => {
    cy.mount(
      <StaffTable
        users={[]}
        currentUserId={1}
        isLoading={false}
        isError={false}
      />,
    );
    cy.getBySel("staff-empty").should("have.text", "No staff accounts.");
  });

  it("shows no empty row when loading failed", () => {
    cy.mount(
      <StaffTable users={[]} currentUserId={1} isLoading={false} isError />,
    );
    cy.getBySel("staff-empty").should("not.exist");
  });

  it("opens the disable and recovery dialogs for the row's account", () => {
    const luz = makeStaffUser({ id: 10, username: "luz" });
    cy.mount(
      <StaffTable
        users={[luz, makePendingUser()]}
        currentUserId={1}
        isLoading={false}
        isError={false}
      />,
    );

    cy.getBySel("staff-row-10").findBySel("staff-disable").click();
    cy.getByRole("dialog", { name: "Disable luz?", native: false }).within(
      () => {
        cy.getByRole("button", { name: "Cancel" }).click();
      },
    );
    cy.getByRole("dialog", { native: false }).should("not.exist");

    cy.getBySel("staff-row-10").findBySel("staff-recovery-code-open").click();
    cy.getByRole("dialog", {
      name: "Generate recovery code for luz",
      native: false,
    }).should("be.visible");
  });

  it("has no accessibility violations", () => {
    cy.mount(
      <StaffTable
        users={[makeStaffUser(), makePendingUser()]}
        currentUserId={1}
        isLoading={false}
        isError={false}
      />,
    );
    cy.checkA11yAA();
  });
});
