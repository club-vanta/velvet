import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import {
  memberOrganizationsKey,
  organizationKey,
  organizationsKey,
  orgMembersKey,
  userSearchKey,
} from "@/api/queryKeys";
import { useAuth, useOrg } from "@/domain/session";
import { useLanguage } from "@/lib/i18n";

/**
 * The organizations the viewer can open: every org for a site admin, the
 * orgs they belong to for everyone else (fetched one by one, since only site
 * admins may list them all).
 */
export function useVisibleOrganizations() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { orgs: memberOrgs } = useOrg();
  const isSiteAdmin = user?.role.name === "SITE_ADMIN";
  const memberOrgIds = memberOrgs.map((o) => o.org_id);

  const allQ = useQuery({
    queryKey: organizationsKey,
    queryFn: async () => {
      const { data, error } = await api.GET("/organizations/");
      if (error) throw new Error(t("failedLoadOrgs"));
      return data;
    },
    enabled: isSiteAdmin,
  });

  const memberQ = useQuery({
    queryKey: memberOrganizationsKey(memberOrgIds),
    queryFn: async () => {
      const results = await Promise.all(
        memberOrgIds.map((id) =>
          api.GET("/organizations/{org_id}", {
            params: { path: { org_id: id } },
          }),
        ),
      );
      return results.flatMap((r) => (r.data ? [r.data] : []));
    },
    enabled: !isSiteAdmin && memberOrgIds.length > 0,
  });

  const q = isSiteAdmin ? allQ : memberQ;
  return {
    organizations:
      (isSiteAdmin ? allQ.data?.organizations : memberQ.data) ?? [],
    isLoading: q.isLoading,
    isError: q.isError,
    refetch: () => void q.refetch(),
  };
}

export function useOrganization(orgId: string) {
  const { t } = useLanguage();
  return useQuery({
    queryKey: organizationKey(orgId),
    queryFn: async () => {
      const { data, error } = await api.GET("/organizations/{org_id}", {
        params: { path: { org_id: orgId } },
      });
      if (error) throw new Error(t("failedLoadOrgs"));
      return data;
    },
    enabled: !!orgId,
  });
}

export function useOrgMembers(orgId: string) {
  const { t } = useLanguage();
  return useQuery({
    queryKey: orgMembersKey(orgId),
    queryFn: async () => {
      const { data, error } = await api.GET("/organizations/{org_id}/members", {
        params: { path: { org_id: orgId } },
      });
      if (error) throw new Error(t("failedLoadOrgs"));
      return data;
    },
    enabled: !!orgId,
  });
}

/** Accounts whose username matches `q`; every account when `q` is empty. */
export function useUserSearch(q: string) {
  return useQuery({
    queryKey: userSearchKey(q),
    queryFn: async () => {
      const { data } = await api.GET("/users/", {
        params: { query: { q } },
      });
      return data ?? [];
    },
    // Keep the last results on screen while the next search runs.
    placeholderData: keepPreviousData,
  });
}
