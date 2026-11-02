import { makeBannedGuest } from "@/tests/factories";
import { formatDateTime } from "@/lib/format";
import { VantedRow } from "./VantedRow";

const ZOE = makeBannedGuest({
  id: "b-zoe",
  displayname: "Zoe",
  banned_at: "2026-09-01T03:00:00Z",
  banned_reason: "Took photos without consent",
});

function mount(canUnban: boolean, unbanPending = false) {
  cy.mount(
    <ul className="@container">
      <VantedRow
        guest={ZOE}
        canUnban={canUnban}
        unbanPending={unbanPending}
        onUnban={cy.spy().as("onUnban")}
      />
    </ul>,
  );
}

describe("<VantedRow />", () => {
  it("shows the vanted guest, when and why, and unvants on click", () => {
    mount(true);
    cy.getBySel("vanted-row-b-zoe").within(() => {
      cy.getBySel("guest-badge-vanted").should("have.text", "Vanted");
      cy.getBySel("vanted-at").should(
        "have.text",
        formatDateTime("2026-09-01T03:00:00Z"),
      );
      cy.getBySel("vanted-reason").should(
        "have.text",
        "Took photos without consent",
      );
      cy.getByRole("button", { name: "Unvant" }).click();
    });
    cy.get("@onUnban").should("have.been.calledOnceWith", ZOE);
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
