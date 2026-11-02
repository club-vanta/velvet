import { makeMeetup } from "@/tests/factories";
import { MeetupBadges } from "./MeetupBadges";

describe("<MeetupBadges />", () => {
  it("shows today, paid and finalized", () => {
    cy.mount(
      <div data-cy="badges">
        <MeetupBadges
          meetup={makeMeetup({ requires_payment: true, is_finalized: true })}
          timing="today"
        />
      </div>,
    );
    cy.getBySel("badges").should("have.text", "TodayPaid eventFinalized");
    cy.checkA11yAA('[data-cy="badges"]');
  });

  it("shows nothing for an open, free meetup that is not today", () => {
    cy.mount(
      <div data-cy="badges">
        <MeetupBadges meetup={makeMeetup()} timing="upcoming" />
      </div>,
    );
    cy.getBySel("badges").should("have.text", "");
  });

  it("speaks Spanish", () => {
    cy.mount(
      <div data-cy="badges">
        <MeetupBadges
          meetup={makeMeetup({ requires_payment: true })}
          timing="today"
        />
      </div>,
      { lang: "es" },
    );
    cy.getBySel("badges").should("have.text", "HoyEvento pago");
  });
});
