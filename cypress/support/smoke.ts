// Helpers for the smoke suite (cypress/e2e/smoke), which runs against a real
// local backend seeded by scripts/seed_e2e.py in alter-tracker-backend.

export type SeededMeetup = {
  id: string;
  name: string;
  guest_ids: Record<"luna" | "sol", string>;
};

export type SmokeSeed = {
  org_id: string;
  users: string[];
  meetups: Record<"door" | "closing", SeededMeetup>;
};

/** The two seeded accounts: an org staff member and an org admin. */
export const SMOKE_USERS = { door: "e2e-door", owner: "e2e-owner" } as const;

/** Resets the seeded organization and yields its IDs. */
export function seedBackend(): Cypress.Chainable<SmokeSeed> {
  return cy.task<SmokeSeed>("db:seed", null, { timeout: 60_000 });
}

/** Signs in as a seeded account through the real API. */
export function loginAsSeeded(user: keyof typeof SMOKE_USERS) {
  cy.env(["e2ePassword"]).then(({ e2ePassword }) => {
    cy.loginWithPassword(SMOKE_USERS[user], String(e2ePassword));
  });
}
