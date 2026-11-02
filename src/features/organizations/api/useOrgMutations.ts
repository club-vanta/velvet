import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/api/client";
import { extractApiError } from "@/api/errors";
import {
  invalidateOrganization,
  organizationsKey,
  orgMembersKey,
} from "@/api/queryKeys";
import type { components } from "@/api/types";
import { useLanguage } from "@/lib/i18n";

type OrgCreate = components["schemas"]["OrgCreate"];
type OrgUpdate = components["schemas"]["OrgUpdate"];
type OrgMember = components["schemas"]["OrgMemberPublic"];

export function useCreateOrganization() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: OrgCreate) => {
      const { data, error } = await api.POST("/organizations/", { body });
      if (error) throw new Error(extractApiError(error, t("failedCreateOrg")));
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: organizationsKey });
      toast.success(t("orgCreated"));
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateOrganization(orgId: string) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: OrgUpdate) => {
      const { data, error } = await api.PATCH("/organizations/{org_id}", {
        params: { path: { org_id: orgId } },
        body,
      });
      if (error) throw new Error(extractApiError(error, t("failedUpdateOrg")));
      return data;
    },
    onSuccess: () => {
      invalidateOrganization(queryClient, orgId);
      toast.success(t("orgUpdated"));
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

function useInvalidateMembers(orgId: string) {
  const queryClient = useQueryClient();
  return () =>
    void queryClient.invalidateQueries({ queryKey: orgMembersKey(orgId) });
}

export function useAddMember(orgId: string) {
  const { t } = useLanguage();
  const invalidate = useInvalidateMembers(orgId);
  return useMutation({
    mutationFn: async ({ userId, role }: { userId: number; role: string }) => {
      const { data, error } = await api.POST(
        "/organizations/{org_id}/members/{user_id}",
        {
          params: { path: { org_id: orgId, user_id: userId } },
          body: { role },
        },
      );
      if (error) throw new Error(extractApiError(error, t("failedAddMember")));
      return data;
    },
    onSuccess: () => {
      invalidate();
      toast.success(t("memberAdded"));
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateMemberRole(orgId: string) {
  const { t } = useLanguage();
  const invalidate = useInvalidateMembers(orgId);
  return useMutation({
    mutationFn: async ({
      member,
      role,
    }: {
      member: OrgMember;
      role: string;
    }) => {
      const { error } = await api.PATCH(
        "/organizations/{org_id}/members/{user_id}",
        {
          params: { path: { org_id: orgId, user_id: member.user_id } },
          body: { role },
        },
      );
      if (error) throw new Error(extractApiError(error, t("roleUpdated")));
    },
    onSuccess: () => {
      invalidate();
      toast.success(t("roleUpdated"));
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useRemoveMember(orgId: string) {
  const { t } = useLanguage();
  const invalidate = useInvalidateMembers(orgId);
  return useMutation({
    mutationFn: async (member: OrgMember) => {
      const { error } = await api.DELETE(
        "/organizations/{org_id}/members/{user_id}",
        { params: { path: { org_id: orgId, user_id: member.user_id } } },
      );
      if (error)
        throw new Error(extractApiError(error, t("failedRemoveMember")));
    },
    onSuccess: () => {
      invalidate();
      toast.success(t("memberRemoved"));
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
