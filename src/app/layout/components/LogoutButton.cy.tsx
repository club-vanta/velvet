import { useLocation } from "react-router-dom";
import { useAuth } from "@/domain/session";
import { LogoutButton } from "./LogoutButton";

function SessionProbe() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  return (
    <>
      <output data-cy="user">{user?.username ?? "signed out"}</output>
      <output data-cy="pathname">{pathname}</output>
    </>
  );
}

describe("<LogoutButton />", () => {
  beforeEach(() => {
    cy.mount(
      <>
        <LogoutButton />
        <SessionProbe />
      </>,
      { as: "staff", path: "/meetups" },
    );
    cy.getBySel("user").should("have.text", "door");
  });

  it("signs out, forgets the token and goes to login", () => {
    cy.getByRole("button", { name: "Logout" }).click();
    cy.getBySel("user").should("have.text", "signed out");
    cy.getBySel("pathname").should("have.text", "/");
    cy.window()
      .its("localStorage")
      .invoke("getItem", "auth_token")
      .should("be.null");
  });

  it("keeps its name when only the icon shows on phones", () => {
    cy.viewport(375, 812);
    cy.getByRole("button", { name: "Logout" }).should("be.visible");
    cy.checkA11yAA();
  });
});
