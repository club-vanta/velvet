import { GuestAvatar } from "./GuestAvatar";

// A 1x1 GIF, so a "loaded" avatar needs no network.
const PIXEL =
  "data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACwAAAAAAQABAAACAkQBADs=";
const BROKEN = "https://cdn.example.test/broken.jpg";

describe("<GuestAvatar />", () => {
  it("shows both initials when there is no avatar", () => {
    cy.mount(<GuestAvatar name="Cindy Dark" src={null} />);
    cy.getBySel("guest-avatar")
      .should("have.text", "CD")
      .and("have.attr", "aria-hidden", "true")
      .find("img")
      .should("not.exist");
  });

  it("uses one initial for a single-word name", () => {
    cy.mount(<GuestAvatar name="Sol" src={null} />);
    cy.getBySel("guest-avatar").should("have.text", "S");
  });

  it("keeps an emoji at the start of a name whole", () => {
    cy.mount(<GuestAvatar name="🔥Luna Roja" src={null} />);
    cy.getBySel("guest-avatar").should("have.text", "🔥R");
  });

  it("shows the image while it loads fine", () => {
    cy.mount(<GuestAvatar name="Juan Perez" src={PIXEL} />);
    cy.getBySel("guest-avatar")
      .find("img")
      .should("have.attr", "src", PIXEL)
      .and("have.attr", "alt", "");
  });

  it("falls back to the initials when the image fails to load", () => {
    cy.intercept("GET", BROKEN, { statusCode: 404 }).as("avatar");
    cy.mount(<GuestAvatar name="Juan Perez" src={BROKEN} />);

    cy.getBySel("guest-avatar").should("have.text", "JP");
    cy.getBySel("guest-avatar").find("img").should("not.exist");
  });

  it("tries again when the avatar URL changes", () => {
    cy.intercept("GET", BROKEN, { statusCode: 404 });
    cy.mount(<GuestAvatar name="Juan" src={BROKEN} />).then(({ rerender }) => {
      cy.getBySel("guest-avatar").should("have.text", "J");
      rerender(<GuestAvatar name="Juan" src={PIXEL} />);
    });

    cy.getBySel("guest-avatar").find("img").should("have.attr", "src", PIXEL);
  });

  it("is exposed as an image when given alt text", () => {
    cy.mount(
      <GuestAvatar name="Juan" src={null} alt="Profile picture of Juan" />,
    );
    cy.getByRole("img", {
      name: "Profile picture of Juan",
      native: false,
    }).should("have.text", "J");
    cy.getBySel("guest-avatar").should("not.have.attr", "aria-hidden");
    cy.checkA11yAA();
  });
});
