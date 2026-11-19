import { makeMeetup, makeMeetupGuest } from "../../../src/tests/factories";
import {
  ignoreResizeObserverLoop,
  stubMeetupPage,
  visitMeetup,
} from "../../support/routes/meetups";

const MEETUP = makeMeetup({ id: "m-1" });

const guest = (id: string, displayname: string, prior_visits: number) =>
  makeMeetupGuest({
    guest: { id, displayname, mazmo_handle: id.slice(2) },
    prior_visits,
  });

const NEWCOMERS = [guest("g-juli", "Juli", 0), guest("g-sol", "Sol", 0)];
// A newcomer who cancelled is not coming, so the count leaves them out.
const CANCELLED = makeMeetupGuest({
  guest: { id: "g-leo", displayname: "Leo", mazmo_handle: "leo" },
  rsvp: { cancelled_rsvp: true },
  prior_visits: 0,
});
const REGULARS = [
  guest("g-ana", "Ana", 3),
  guest("g-bruno", "Bruno", 1),
  guest("g-carla", "Carla", 7),
];

const rows = () => cy.getBySelLike("guest-row-");

describe(
  "First-time guests at the door",
  { viewportWidth: 375, viewportHeight: 812 },
  () => {
    beforeEach(() => {
      ignoreResizeObserverLoop();
      cy.loginAs("staff");
      stubMeetupPage({
        meetup: MEETUP,
        guests: [...REGULARS, ...NEWCOMERS, CANCELLED],
      });
      visitMeetup("m-1");
    });

    it("counts the newcomers and filters the list to them", () => {
      cy.getBySel("meetup-stats-first-time").should("have.text", "2");
      cy.getByRole("button", { name: "Show only new guests" }).click();

      // As many rows as the card counted: the cancelled newcomer stays out.
      rows().should("have.length", 2);
      for (const id of ["g-juli", "g-sol"]) {
        cy.getBySel(`guest-row-${id}`)
          .findBySel("guest-first-time-badge")
          .should("have.text", "First time");
      }

      cy.getByRole("button", { name: "Clear filters" }).click();
      rows().should("have.length", 6);
    });

    it("badges only the newcomers in the full list", () => {
      cy.getBySel("guest-first-time-badge").should("have.length", 3);
      cy.getBySel("guest-row-g-ana")
        .findBySel("guest-first-time-badge")
        .should("not.exist");
    });
  },
);
