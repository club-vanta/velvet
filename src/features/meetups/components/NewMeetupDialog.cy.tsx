import { makeMeetup } from "@/tests/factories";
import { NewMeetupDialog } from "./NewMeetupDialog";

function mount(open = true) {
  cy.mount(
    <NewMeetupDialog
      orgId="org-1"
      open={open}
      onClose={cy.spy().as("onClose")}
    />,
  );
}

describe("<NewMeetupDialog />", () => {
  it("labels every field and waits for a name and a URL", () => {
    mount();
    cy.getByRole("textbox", { name: "Name" }).should(
      "have.attr",
      "placeholder",
      "Alter #42 — October",
    );
    cy.getByRole("checkbox", {
      name: "Requires payment",
      native: false,
    }).should("have.attr", "aria-checked", "false");
    cy.getBySel("new-meetup-submit").should("be.disabled");
    cy.getBySel("new-meetup-name").type("Alter #44");
    cy.getBySel("new-meetup-url").type("https://mazmo.net/eventos/alter-44");
    cy.getBySel("new-meetup-submit").should("be.enabled");
    cy.getBySel("new-meetup-dialog").should("have.css", "opacity", "1");
    cy.checkA11yAA('[data-cy="new-meetup-dialog"]');
  });

  it("sends the form and closes", () => {
    cy.stubApi("POST", "/organizations/{org_id}/meetups/", {
      body: makeMeetup(),
      statusCode: 201,
      params: { org_id: "org-1" },
    }).as("create");
    mount();
    cy.getBySel("new-meetup-name").type("Alter #44");
    cy.getBySel("new-meetup-url").type("https://mazmo.net/eventos/alter-44");
    cy.getBySel("new-meetup-requires-payment").click();
    cy.getBySel("new-meetup-submit").click();
    cy.wait("@create").its("request.body").should("deep.equal", {
      name: "Alter #44",
      mazmo_meetup_url: "https://mazmo.net/eventos/alter-44",
      requires_payment: true,
    });
    cy.get("@onClose").should("have.been.calledOnce");
  });

  it("closes from Cancel", () => {
    mount();
    cy.getBySel("dialog-cancel").click();
    cy.get("@onClose").should("have.been.calledOnce");
  });

  it("renders nothing while closed", () => {
    mount(false);
    cy.getBySel("new-meetup-dialog").should("not.exist");
  });

  it("speaks Spanish", () => {
    cy.mount(<NewMeetupDialog orgId="org-1" open onClose={() => {}} />, {
      lang: "es",
    });
    cy.getByRole("dialog", { name: "Nuevo Evento", native: false }).should(
      "be.visible",
    );
    cy.getByRole("textbox", { name: "Nombre" }).should(
      "have.attr",
      "placeholder",
      "Alter #42 — Octubre",
    );
  });
});
