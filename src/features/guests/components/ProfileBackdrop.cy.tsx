import { ProfileBackdrop } from "./ProfileBackdrop";

const PIXEL =
  "data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACwAAAAAAQABAAACAkQBADs=";
const BROKEN = "https://cdn.example.test/backdrop.jpg";

function mount(src: string | null) {
  cy.mount(
    <div className="relative" data-cy="card">
      <ProfileBackdrop src={src} />
    </div>,
  );
}

describe("<ProfileBackdrop />", () => {
  it("blurs the avatar behind the card, hidden from screen readers", () => {
    mount(PIXEL);
    cy.getBySel("card")
      .find("img")
      .should("have.attr", "src", PIXEL)
      .and("have.attr", "alt", "");
    cy.getByRole("img", { hidden: false }).should("not.exist");
  });

  it("falls back to a gradient without an avatar or when it fails", () => {
    cy.intercept("GET", BROKEN, { statusCode: 404 });
    mount(BROKEN);
    cy.getBySel("card").find("img").should("not.exist");
  });
});
