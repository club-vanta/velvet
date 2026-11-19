import { makeBannedGuest } from "@/tests/factories";
import { formatFullDateTime } from "@/lib/format";
import { VantAlert } from "./VantAlert";

const BAN = makeBannedGuest({
  banned_at: "2026-08-22T03:00:00Z",
  banned_reason: "Aggressive at Alter #40",
});

describe("<VantAlert />", () => {
  it("names the org, the reason, since when and who vanted", () => {
    cy.mount(<VantAlert ban={BAN} orgName="Club Vanta" />);
    cy.getBySel("guest-vant-title").should("have.text", "Vanted in Club Vanta");
    cy.getBySel("guest-vant-reason").should(
      "have.text",
      "Aggressive at Alter #40",
    );
    cy.getBySel("guest-vant-since").should(
      "have.text",
      `Since ${formatFullDateTime("2026-08-22T03:00:00Z")}, by owner`,
    );
    cy.checkA11yAA();
  });

  it("leaves out who vanted when the author isn't recorded", () => {
    cy.mount(
      <VantAlert ban={{ ...BAN, banned_by_id: null, banned_by: null }} />,
    );
    cy.getBySel("guest-vant-since").should(
      "have.text",
      `Since ${formatFullDateTime("2026-08-22T03:00:00Z")}`,
    );
  });

  it("says this organization without an org name, in Spanish", () => {
    cy.mount(<VantAlert ban={BAN} />, { lang: "es" });
    cy.getBySel("guest-vant-title").should(
      "have.text",
      "Vanteado en esta organización",
    );
    cy.getBySel("guest-vant-since").should(
      "have.text",
      `Desde el ${formatFullDateTime("2026-08-22T03:00:00Z")}, por owner`,
    );
  });
});
