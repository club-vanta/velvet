// Stubs for the organization pages (/organizations, /organizations/:orgId).
import {
  ORG_ID,
  USERS,
  makeOrg,
  makeOrgMember,
  makeUserSearchResult,
} from "../../../src/tests/factories";
import type { Schema } from "../../../src/tests/factories";

type Org = Schema<"OrgPublic">;
type Member = Schema<"OrgMemberPublic">;

export const VANTA = makeOrg();
export const NOCTURNA = makeOrg({
  id: "org-2",
  name: "Nocturna",
  slug: "nocturna",
  created_at: "2026-05-01T20:00:00Z",
});

/** The org's admin (the orgAdmin user), a door staffer and another admin. */
export const MEMBERS: Member[] = [
  makeOrgMember({
    user_id: USERS.orgAdmin.id,
    username: "owner",
    role: "ADMIN",
  }),
  makeOrgMember({ user_id: 10, username: "luz", role: "STAFF" }),
  makeOrgMember({ user_id: 11, username: "mar", role: "ADMIN" }),
];

export const SEARCH_RESULTS = [
  makeUserSearchResult({ id: 20, username: "sol" }),
  makeUserSearchResult({ id: 21, username: "soledad" }),
];

/** Site admins: every org (`@getOrgs`, also read by the org switcher). */
export function stubAllOrganizations(
  organizations: Org[] = [VANTA, NOCTURNA],
  { delay }: { delay?: number } = {},
): void {
  cy.stubApi("GET", "/organizations/", {
    body: { total: organizations.length, organizations },
    delay,
  }).as("getOrgs");
}

/** One org by id (`@getOrg`): the detail page, and each member org. */
export function stubOrganization(org: Org = VANTA): void {
  cy.stubApi("GET", "/organizations/{org_id}", {
    body: org,
    params: { org_id: org.id },
  }).as("getOrg");
}

export function stubMembers(
  members: Member[] = MEMBERS,
  { orgId = ORG_ID, delay }: { orgId?: string; delay?: number } = {},
): void {
  cy.stubApi("GET", "/organizations/{org_id}/members", {
    body: { total: members.length, members },
    params: { org_id: orgId },
    delay,
  }).as("getMembers");
}

/** The detail page of `org`: the org itself and its members. */
export function stubOrganizationDetail(
  org: Org = VANTA,
  members: Member[] = MEMBERS,
): void {
  stubOrganization(org);
  stubMembers(members, { orgId: org.id });
}

/** The add-member search (`@searchUsers`), whatever was typed. */
export function stubUserSearch(
  results: Schema<"UserSearchResult">[] = SEARCH_RESULTS,
): void {
  cy.stubApi("GET", "/users/", { body: results }).as("searchUsers");
}
