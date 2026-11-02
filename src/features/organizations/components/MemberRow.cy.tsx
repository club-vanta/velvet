import { Table, TableBody } from "@/components/ui/table";
import { makeOrgMember } from "@/tests/factories";
import { MemberRow } from "./MemberRow";

type Props = Parameters<typeof MemberRow>[0];

const luz = makeOrgMember({ user_id: 10, username: "luz", role: "STAFF" });

function mountRow(props: Partial<Props> = {}) {
  cy.mount(
    <Table>
      <TableBody>
        <MemberRow
          member={luz}
          isSelf={false}
          isRemoving={false}
          removeDisabled={false}
          onRoleChange={cy.spy().as("onRoleChange")}
          onRemove={cy.spy().as("onRemove")}
          {...props}
        />
      </TableBody>
    </Table>,
  );
}

describe("<MemberRow />", () => {
  it("shows the member and their role", () => {
    mountRow();
    cy.getBySel("org-member-username").should("have.text", "luz");
    cy.getBySel("org-member-role-value").should("have.text", "STAFF");
    cy.getBySel("org-member-remove").should("have.text", "Remove");
  });

  it("reports a new role picked with the keyboard", () => {
    mountRow();
    cy.getByRole("combobox", { name: "Role of luz", native: false }).focus();
    cy.press(Cypress.Keyboard.Keys.SPACE);
    cy.getByRole("option", { name: "Admin", native: false }).click();
    cy.get("@onRoleChange").should("have.been.calledOnceWith", "ADMIN");
  });

  it("reports a removal", () => {
    mountRow();
    cy.getBySel("org-member-remove").click();
    cy.get("@onRemove").should("have.been.calledOnce");
  });

  it("locks the viewer's own row", () => {
    mountRow({ isSelf: true });
    cy.getBySel("org-member-role").should("be.disabled");
    cy.getBySel("org-member-remove").should("be.disabled");
  });

  it("says Removing… only on the member being removed", () => {
    mountRow({ isRemoving: true, removeDisabled: true });
    cy.getBySel("org-member-remove")
      .should("have.text", "Removing…")
      .and("be.disabled");
  });

  it("waits, keeping its label, while another member is removed", () => {
    mountRow({ removeDisabled: true });
    cy.getBySel("org-member-remove")
      .should("have.text", "Remove")
      .and("be.disabled");
  });

  it("has no accessibility violations", () => {
    mountRow();
    cy.checkA11yAA();
  });
});
