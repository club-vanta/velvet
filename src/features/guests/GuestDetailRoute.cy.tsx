import { useEffect } from "react";
import { useNavigate, type NavigateFunction } from "react-router-dom";
import {
  makeGuest,
  makeGuestMeetups,
  makeNameHistory,
} from "@/tests/factories";
import { GuestDetailRoute } from "./GuestDetailRoute";

const ANA = makeGuest({ id: "g-ana", displayname: "Ana" });
const BEA = makeGuest({ id: "g-bea", displayname: "Bea" });

// Hands the router's navigate to the test, to stand in for browser Back or
// Forward: an in-app navigation that keeps the route element mounted.
function CaptureNavigate({
  onReady,
}: {
  onReady: (navigate: NavigateFunction) => void;
}) {
  const navigate = useNavigate();
  useEffect(() => {
    onReady(navigate);
  }, [navigate, onReady]);
  return null;
}

describe("<GuestDetailRoute />", () => {
  it("closes a dialog left open for the previous guest", () => {
    for (const guest of [ANA, BEA]) {
      cy.stubApi("GET", "/guests/{guest_id}", {
        body: guest,
        params: { guest_id: guest.id },
      });
    }
    cy.stubApi("GET", "/guests/{guest_id}/displayname-history", {
      body: makeNameHistory(),
    });
    cy.stubApi("GET", "/organizations/{org_id}/guests/{guest_id}/meetups", {
      body: makeGuestMeetups(),
    });
    cy.stubApi("GET", "/organizations/{org_id}/guests/banned", {
      body: { total: 0, guests: [] },
    });
    let navigate: NavigateFunction | undefined;
    cy.mount(
      <>
        <CaptureNavigate onReady={(n) => (navigate = n)} />
        <GuestDetailRoute />
      </>,
      { as: "orgAdmin", path: "/guests/g-ana", route: "/guests/:guestId" },
    );

    cy.getByRole("heading", { name: "Ana" }).should("be.visible");
    cy.getBySel("guest-profile-edit").click();
    cy.getBySel("edit-guest-displayname").should("have.value", "Ana");

    cy.then(() => navigate?.("/guests/g-bea"));
    cy.getByRole("heading", { name: "Bea" }).should("be.visible");
    cy.getBySel("edit-guest-dialog").should("not.exist");
  });
});
