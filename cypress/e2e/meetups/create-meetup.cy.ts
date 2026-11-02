import { makeMeetup } from "../../../src/tests/factories";
import { apiUrlPattern } from "../../support/commands/api";
import { expectToast, stubMeetupList } from "../../support/routes/meetups";

const URL = "https://mazmo.net/eventos/alter-44";
const CREATED = makeMeetup({
  id: "m-new",
  name: "Alter #44",
  mazmo_meetup_url: URL,
  date: "2030-11-20T23:00:00Z",
  requires_payment: true,
});

function openDialog() {
  cy.getBySel("meetups-new").click();
  cy.getByRole("dialog", { name: "New Meetup", native: false }).should(
    "be.visible",
  );
}

function fillForm(name = "Alter #44", url = URL) {
  cy.getBySel("new-meetup-name").type(name);
  cy.getBySel("new-meetup-url").type(url);
}

describe("Create a meetup", () => {
  beforeEach(() => {
    cy.loginAs("orgAdmin");
    stubMeetupList([]);
    cy.visit("/meetups");
    cy.wait("@meetups");
  });

  it("only enables Create once both the name and the URL are filled", () => {
    openDialog();
    cy.getBySel("new-meetup-submit").should("be.disabled");
    cy.getBySel("new-meetup-name").type("Alter #44");
    cy.getBySel("new-meetup-submit").should("be.disabled");
    cy.getBySel("new-meetup-url").type(URL);
    cy.getBySel("new-meetup-submit").should("be.enabled");
    cy.getBySel("new-meetup-name").clear();
    cy.getBySel("new-meetup-submit").should("be.disabled");
  });

  it("creates a paid meetup and shows it in the list", () => {
    cy.stubApi("POST", "/organizations/{org_id}/meetups/", {
      body: CREATED,
      statusCode: 201,
    }).as("create");
    openDialog();
    fillForm();
    cy.getBySel("new-meetup-requires-payment").click();
    cy.getByRole("checkbox", {
      name: "Requires payment",
      native: false,
    }).should("have.attr", "aria-checked", "true");
    stubMeetupList([CREATED]);
    cy.getBySel("new-meetup-submit").click();

    cy.wait("@create").its("request.body").should("deep.equal", {
      name: "Alter #44",
      mazmo_meetup_url: URL,
      requires_payment: true,
    });
    expectToast("Meetup created");
    cy.getBySel("new-meetup-dialog").should("not.exist");
    cy.wait("@meetups");
    cy.getBySel("meetup-row-m-new")
      .findBySel("meetup-badge-paid")
      .should("have.text", "Paid event");
    cy.getBySel("meetups-empty").should("not.exist");

    // The form starts empty again for the next one.
    openDialog();
    cy.getBySel("new-meetup-name").should("have.value", "");
    cy.getBySel("new-meetup-url").should("have.value", "");
    cy.getByRole("checkbox", {
      name: "Requires payment",
      native: false,
    }).should("have.attr", "aria-checked", "false");
  });

  it("sends requires_payment false when the box is left unchecked", () => {
    cy.stubApi("POST", "/organizations/{org_id}/meetups/", {
      body: { ...CREATED, requires_payment: false },
      statusCode: 201,
    }).as("create");
    openDialog();
    fillForm();
    cy.getBySel("new-meetup-submit").click();

    cy.wait("@create")
      .its("request.body.requires_payment")
      .should("equal", false);
  });

  it("shows the backend's reason and keeps the form when Mazmo refuses the URL", () => {
    cy.stubApiError("POST", "/organizations/{org_id}/meetups/", {
      statusCode: 409,
      detail:
        "Cannot create meetup: a meetup with this Mazmo URL already exists.",
    }).as("create");
    openDialog();
    fillForm();
    cy.getBySel("new-meetup-submit").click();

    cy.wait("@create");
    expectToast(
      "Cannot create meetup: a meetup with this Mazmo URL already exists.",
      "error",
    );
    cy.getBySel("new-meetup-dialog").should("be.visible");
    cy.getBySel("new-meetup-name").should("have.value", "Alter #44");
    cy.getBySel("new-meetup-submit").should("be.enabled");
  });

  it("joins the validation messages of a 422", () => {
    cy.intercept(
      {
        method: "POST",
        url: apiUrlPattern("/organizations/{org_id}/meetups/"),
      },
      {
        statusCode: 422,
        body: {
          detail: [
            {
              loc: ["body", "mazmo_meetup_url"],
              msg: "URL must match pattern: https://mazmo.net/{community}/{thread-slug}",
              type: "value_error",
            },
          ],
        },
      },
    ).as("create");
    openDialog();
    fillForm("Alter #44", "https://example.com/not-mazmo");
    cy.getBySel("new-meetup-submit").click();

    cy.wait("@create");
    expectToast(
      "URL must match pattern: https://mazmo.net/{community}/{thread-slug}",
      "error",
    );
  });

  it("falls back to a generic message when the server fails without a reason", () => {
    cy.intercept(
      {
        method: "POST",
        url: apiUrlPattern("/organizations/{org_id}/meetups/"),
      },
      { statusCode: 502, body: "Bad gateway" },
    ).as("create");
    openDialog();
    fillForm();
    cy.getBySel("new-meetup-submit").click();

    cy.wait("@create");
    expectToast("Failed to create meetup", "error");
    cy.getBySel("new-meetup-dialog").should("be.visible");
  });

  it("keeps the form open when the network fails", () => {
    cy.stubApiError("POST", "/organizations/{org_id}/meetups/", {
      statusCode: 0,
      forceNetworkError: true,
    }).as("create");
    openDialog();
    fillForm();
    cy.getBySel("new-meetup-submit").click();

    cy.wait("@create");
    cy.get("[data-sonner-toast][data-type=error]").should("be.visible");
    cy.getBySel("new-meetup-dialog").should("be.visible");
    cy.getBySel("new-meetup-submit").should("have.text", "Create");
  });

  it("shows Creating… while the request runs", () => {
    cy.stubApi("POST", "/organizations/{org_id}/meetups/", {
      body: CREATED,
      statusCode: 201,
      delay: 500,
    }).as("create");
    openDialog();
    fillForm();
    cy.getBySel("new-meetup-submit").click();
    cy.getBySel("new-meetup-submit")
      .should("have.text", "Creating…")
      .and("be.disabled");
    cy.wait("@create");
  });

  it("closes on Cancel without sending anything", () => {
    openDialog();
    fillForm();
    cy.getBySel("new-meetup-dialog").findBySel("dialog-cancel").click();
    cy.getBySel("new-meetup-dialog").should("not.exist");
  });

  it("has no accessibility violations in the dialog", () => {
    openDialog();
    cy.checkA11yAA('[data-cy="new-meetup-dialog"]');
  });
});

describe("Create a meetup from the dashboard link", () => {
  it("opens the dialog with ?new=1 and clears the parameter on close", () => {
    cy.loginAs("staff");
    stubMeetupList([]);
    cy.visit("/meetups?new=1");

    cy.getByRole("dialog", { name: "New Meetup", native: false }).should(
      "be.visible",
    );
    cy.press(Cypress.Keyboard.Keys.ESC);
    cy.getBySel("new-meetup-dialog").should("not.exist");
    cy.location("search").should("eq", "");
  });
});
