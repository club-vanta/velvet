import { makeBannedGuest } from "@/tests/factories";
import { formatDateTime } from "@/lib/format";
import { VantedRow } from "./VantedRow";

const ZOE = makeBannedGuest({
  id: "b-zoe",
  displayname: "Zoe",
  banned_at: "2026-09-01T03:00:00Z",
  banned_reason: "Took photos without consent",
});

function mount(canUnban: boolean, unbanPending = false, guest = ZOE) {
  cy.mount(
    <ul className="@container">
      <VantedRow
        guest={guest}
        canUnban={canUnban}
        unbanPending={unbanPending}
        onUnban={cy.spy().as("onUnban")}
      />
    </ul>,
  );
}

describe("<VantedRow />", () => {
  it("shows the vanted guest, when, by whom and why, and unvants on click", () => {
    mount(true);
    cy.getBySel("vanted-row-b-zoe").within(() => {
      cy.getBySel("guest-badge-vanted").should("have.text", "Vanted");
      cy.getBySel("vanted-at").should(
        "have.text",
        formatDateTime("2026-09-01T03:00:00Z"),
      );
      cy.getBySel("vanted-by").should("have.text", "owner");
      cy.getBySel("vanted-reason").should(
        "have.text",
        "Took photos without consent",
      );
      cy.getByRole("button", { name: "Unvant" }).click();
    });
    cy.get("@onUnban").should("have.been.calledOnceWith", ZOE);
  });

  it("leaves out who vanted when the author isn't recorded", () => {
    mount(false, false, { ...ZOE, banned_by_id: null, banned_by: null });
    cy.getBySel("vanted-at").should("exist");
    cy.getBySel("vanted-by").should("not.exist");
  });

  it("disables Unvant while an unvant runs", () => {
    mount(true, true);
    cy.getBySel("vanted-unban").should("be.disabled");
  });

  it("has no Unvant for someone who can't unvant", () => {
    mount(false);
    cy.getBySel("vanted-unban").should("not.exist");
  });

  it("has no accessibility violations", () => {
    mount(true);
    cy.checkA11yAA();
  });
});
