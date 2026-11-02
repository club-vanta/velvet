import { Table, TableBody } from "@/components/ui/table";
import {
  makeDisabledUser,
  makePendingUser,
  makeStaffUser,
} from "@/tests/factories";
import { StaffRow, type StaffRowProps } from "./StaffRow";

const IDLE = { approval: false, role: false, enable: false };

function mountRow(props: Partial<StaffRowProps> & Pick<StaffRowProps, "user">) {
  cy.mount(
    <Table>
      <TableBody>
        <StaffRow
          isSelf={false}
          pending={IDLE}
          onRoleChange={cy.spy().as("onRoleChange")}
          onApprove={cy.spy().as("onApprove")}
          onEnable={cy.spy().as("onEnable")}
          onDisable={cy.spy().as("onDisable")}
          onRecoveryCode={cy.spy().as("onRecoveryCode")}
          {...props}
        />
      </TableBody>
    </Table>,
  );
}

describe("<StaffRow />", () => {
  it("shows an active account's details", () => {
    mountRow({ user: makeStaffUser({ username: "luz" }) });
    cy.getBySel("staff-username").should("have.text", "luz");
    cy.getBySel("staff-role-value").should("have.text", "USER");
    cy.getBySel("staff-status").should("have.text", "Active");
  });

  it("reports each action on an active account", () => {
    mountRow({ user: makeStaffUser() });
    cy.getBySel("staff-revoke").click();
    cy.get("@onApprove").should("have.been.calledOnceWith", false);
    cy.getBySel("staff-disable").click();
    cy.get("@onDisable").should("have.been.calledOnce");
    cy.getBySel("staff-recovery-code-open").click();
    cy.get("@onRecoveryCode").should("have.been.calledOnce");
  });

  it("approves a pending account", () => {
    mountRow({ user: makePendingUser() });
    cy.getBySel("staff-status").should("have.text", "Pending");
    cy.getBySel("staff-approve").click();
    cy.get("@onApprove").should("have.been.calledOnceWith", true);
  });

  it("enables a disabled account", () => {
    mountRow({ user: makeDisabledUser() });
    cy.getBySel("staff-status").should("have.text", "Disabled");
    cy.getBySel("staff-enable").click();
    cy.get("@onEnable").should("have.been.calledOnce");
  });

  it("reports the role chosen from the menu", () => {
    mountRow({ user: makeStaffUser({ username: "luz" }) });
    cy.getByRole("combobox", { name: "Role of luz", native: false }).click();
    cy.getByRole("option", { name: "SITE_ADMIN", native: false }).click();
    cy.get("@onRoleChange").should("have.been.calledOnceWith", "SITE_ADMIN");
  });

  it("shows the admin's own role without a menu or account actions", () => {
    mountRow({ user: makeStaffUser(), isSelf: true });
    cy.getBySel("staff-role").should("have.text", "USER");
    cy.getBySel("staff-role-select").should("not.exist");
    cy.getBySel("staff-revoke").should("not.exist");
    cy.getBySel("staff-disable").should("not.exist");
    cy.getBySel("staff-recovery-code-open").should("be.enabled");
  });

  it("waits while a change of the same kind is in flight", () => {
    mountRow({
      user: makeStaffUser(),
      pending: { approval: true, role: true, enable: false },
    });
    cy.getBySel("staff-revoke").should("be.disabled");
    cy.getBySel("staff-role-select").should("be.disabled");
    cy.getBySel("staff-disable").should("be.enabled");
  });

  it("reaches every action with the keyboard", () => {
    mountRow({ user: makeStaffUser() });
    cy.getBySel("staff-role-select").focus();
    cy.press(Cypress.Keyboard.Keys.TAB);
    cy.focused().should("have.attr", "data-cy", "staff-recovery-code-open");
    cy.press(Cypress.Keyboard.Keys.TAB);
    cy.focused().should("have.attr", "data-cy", "staff-revoke");
    cy.press(Cypress.Keyboard.Keys.TAB);
    cy.focused().should("have.attr", "data-cy", "staff-disable");
  });

  it("has no accessibility violations", () => {
    mountRow({ user: makeStaffUser() });
    cy.checkA11yAA();
  });
});
