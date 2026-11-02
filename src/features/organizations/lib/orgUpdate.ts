import type { components } from "@/api/types";

type Org = components["schemas"]["OrgPublic"];
type OrgUpdate = components["schemas"]["OrgUpdate"];

export type OrgFieldValues = { name: string; slug: string };

/** Both fields filled in (after trimming), as the backend requires. */
export function isOrgComplete({ name, slug }: OrgFieldValues): boolean {
  return name.trim() !== "" && slug.trim() !== "";
}

/**
 * The PATCH body for an edit: only the fields that changed, trimmed; `null`
 * leaves a field as it is, so an unchanged slug never trips the uniqueness
 * check.
 */
export function orgUpdateBody(org: Org, values: OrgFieldValues): OrgUpdate {
  const name = values.name.trim();
  const slug = values.slug.trim();
  return {
    name: name !== org.name ? name : null,
    slug: slug !== org.slug ? slug : null,
  };
}

export function hasOrgChanges(org: Org, values: OrgFieldValues): boolean {
  const body = orgUpdateBody(org, values);
  return body.name !== null || body.slug !== null;
}
