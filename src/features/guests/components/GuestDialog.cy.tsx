import { makeGuest } from "@/tests/factories";
import type { GuestDialogKind } from "../lib/guestActions";
import { GuestDialog } from "./GuestDialog";

const LUNA = makeGuest({ displayname: "Luna" });

describe("<GuestDialog />", () => {
  const titles: [GuestDialogKind, string][] = [
    ["edit", "Edit guest"],
    ["link", "Link Mazmo account"],
    ["unlink", "Unlink Mazmo account?"],
    ["ban", "Vant Luna?"],
  ];
  titles.forEach(([kind, title]) => {
    it(`opens the ${kind} dialog and closes it`, () => {
      cy.mount(
        <GuestDialog
          dialog={{ kind, guest: LUNA }}
          orgId="org-1"
          onClose={cy.spy().as("onClose")}
        />,
        { as: "orgAdmin" },
      );
      cy.getByRole("dialog", { name: title, native: false }).should(
        "be.visible",
      );
      cy.getByRole("button", { name: "Cancel" }).click();
      cy.get("@onClose").should("have.been.calledOnce");
    });
  });

  it("renders nothing while no dialog is open", () => {
    cy.mount(
      <div data-cy="host">
        <GuestDialog dialog={null} orgId="org-1" onClose={() => {}} />
      </div>,
    );
    cy.getBySel("host").should("be.empty");
  });
});
