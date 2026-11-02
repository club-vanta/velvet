// Reusable stub sets for the Guests pages (/guests and /guests/:guestId).
// Each function answers every request its page makes on load, with aliases
// the specs wait on. Pass only what the test is about.
import {
  makeBannedGuest,
  makeGuest,
  makeGuestMeetups,
  makeNameHistory,
  makeNameHistoryEntry,
} from "../../../src/tests/factories";
import type { Schema } from "../../../src/tests/factories";

type Guest = Schema<"GuestPublic">;
type BannedGuest = Schema<"BannedGuestPublic">;

/** A guest vanted in the org, keeping the guest's own identity. */
export function vanted(
  guest: Guest,
  overrides: Partial<BannedGuest> = {},
): BannedGuest {
  return makeBannedGuest({ ...guest, ...overrides });
}

/** `count` distinct guests named "Guest 0000", "Guest 0001"... */
export function manyGuests(count: number): Guest[] {
  return Array.from({ length: count }, (_, i) => {
    const n = String(i).padStart(4, "0");
    return makeGuest({
      id: `guest-${n}`,
      displayname: `Guest ${n}`,
      mazmo_handle: `guest${n}`,
      mazmo_user_id: 10_000 + i,
    });
  });
}

/**
 * The Guests page: the directory (`@getGuests`) and the org's vanted list
 * (`@getBanned`). `delay` holds both back, to see the loading state.
 */
export function stubGuestsPage({
  guests = [],
  banned = [],
  delay,
}: {
  guests?: Guest[];
  banned?: BannedGuest[];
  delay?: number;
} = {}): void {
  cy.stubApi("GET", "/guests/", {
    body: { total: guests.length, guests },
    delay,
  }).as("getGuests");
  stubBannedGuests(banned, delay);
}

/** The org's vanted list (`@getBanned`). */
export function stubBannedGuests(banned: BannedGuest[], delay?: number): void {
  cy.stubApi("GET", "/organizations/{org_id}/guests/banned", {
    body: { total: banned.length, guests: banned },
    delay,
  }).as("getBanned");
}

/**
 * A guest's profile: the guest (`@getGuest`), the name history
 * (`@getHistory`), the meetups in this org (`@getGuestMeetups`) and the
 * org's vanted list (`@getBanned`).
 */
export function stubGuestProfile(
  guest: Guest,
  {
    banned = [],
    history = makeNameHistory([
      makeNameHistoryEntry({ displayname: guest.displayname }),
    ]),
    meetups = makeGuestMeetups(),
  }: {
    banned?: BannedGuest[];
    history?: Schema<"GuestDisplaynameHistoryListResponse">;
    meetups?: Schema<"GuestMeetupAttendanceListResponse">;
  } = {},
): void {
  const params = { guest_id: guest.id };
  cy.stubApi("GET", "/guests/{guest_id}", { body: guest, params }).as(
    "getGuest",
  );
  cy.stubApi("GET", "/guests/{guest_id}/displayname-history", {
    body: history,
    params,
  }).as("getHistory");
  cy.stubApi("GET", "/organizations/{org_id}/guests/{guest_id}/meetups", {
    body: meetups,
    params,
  }).as("getGuestMeetups");
  stubBannedGuests(banned);
}

/** Asserts the guest names in `list` (a data-cy), in order. */
export function shouldListNames(list: string, names: string[]): void {
  cy.getBySel(list).should(($list) => {
    const shown = $list
      .find('[data-cy="guest-name"]')
      .toArray()
      .map((el) => el.textContent);
    expect(shown).to.deep.equal(names);
  });
}

/** Asserts nothing inside `selector` (a data-cy) is wider than it. */
export function shouldFitWidth(selector: string): void {
  cy.getBySel(selector).should(($el) => {
    expect($el[0].scrollWidth).to.be.at.most($el[0].clientWidth);
  });
}

/** Asserts the text screen readers hear as `selector`'s description. */
export function shouldBeDescribedBy(selector: string, text: string): void {
  cy.getBySel(selector).should(($el) => {
    const doc = $el[0].ownerDocument;
    const description = ($el.attr("aria-describedby") ?? "")
      .split(" ")
      .map((id) => doc.getElementById(id)?.textContent ?? "")
      .join(" ");
    expect(description).to.equal(text);
  });
}

/** The toast the app showed last (sonner renders them in a live region). */
export function lastToast(): Cypress.Chainable<JQuery<HTMLElement>> {
  return cy
    .getByRole("region", { name: /^Notifications/ })
    .getByRole("listitem")
    .first();
}
