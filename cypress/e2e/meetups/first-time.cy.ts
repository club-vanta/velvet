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
      stubMeetupPage({ meetup: MEETUP, guests: [...REGULARS, ...NEWCOMERS] });
      visitMeetup("m-1");
    });

    it("counts the newcomers and filters the list to them", () => {
      cy.getBySel("meetup-stats-first-time").should("have.text", "2");
      cy.getByRole("button", { name: "Show only new guests" }).click();

      rows().should("have.length", 2);
      for (const id of ["g-juli", "g-sol"]) {
        cy.getBySel(`guest-row-${id}`)
          .findBySel("guest-first-time-badge")
          .should("have.text", "First time");
      }

      cy.getByRole("button", { name: "Remove filter: First time" }).click();
      rows().should("have.length", 5);
    });

    it("badges only the newcomers in the full list", () => {
      cy.getBySel("guest-first-time-badge").should("have.length", 2);
      cy.getBySel("guest-row-g-ana")
        .findBySel("guest-first-time-badge")
        .should("not.exist");
    });
  },
);
