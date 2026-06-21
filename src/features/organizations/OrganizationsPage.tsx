import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/auth/AuthContext";
import { useOrg } from "@/lib/org";
import { extractApiError } from "@/api/errors";
import { toast } from "sonner";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { api } from "@/api/client";
import { useLanguage } from "@/lib/i18n";
import { formatDateTime } from "@/lib/format";

function CreateOrgDialog({ onClose }: { onClose: () => void }) {
  const { t } = useLanguage();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await api.POST("/organizations/", {
        body: { name: name.trim(), slug: slug.trim() },
      });
      if (error) throw new Error(extractApiError(error, t("failedCreateOrg")));
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["organizations"] });
      toast.success(t("orgCreated"));
      onClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("organizations")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <label htmlFor="org-name" className="text-sm font-medium">
              {t("orgName")}
            </label>
            <Input
              id="org-name"
              placeholder="Club Vanta"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="org-slug" className="text-sm font-medium">
              {t("orgSlug")}
            </label>
            <Input
              id="org-slug"
              placeholder="club-vanta"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!name.trim() || !slug.trim() || mutation.isPending}
          >
            {mutation.isPending ? t("creating") : t("create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function OrganizationsPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { orgs: memberOrgs } = useOrg();
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);
  const isSiteAdmin = user?.role.name === "SITE_ADMIN";

  const allOrgsQ = useQuery({
    queryKey: ["organizations"],
    queryFn: async () => {
      const { data, error } = await api.GET("/organizations/");
      if (error) throw new Error("Failed to load organizations");
      return data;
    },
    enabled: isSiteAdmin,
  });

  const memberOrgIds = memberOrgs.map((o) => o.org_id);
  const memberOrgsQ = useQuery({
    queryKey: ["org-details-for-member", memberOrgIds],
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

  const data = isSiteAdmin
    ? allOrgsQ.data
    : { organizations: memberOrgsQ.data ?? [] };
  const isLoading = isSiteAdmin ? allOrgsQ.isLoading : memberOrgsQ.isLoading;
  const isError = isSiteAdmin ? allOrgsQ.isError : memberOrgsQ.isError;
  const refetch = isSiteAdmin ? allOrgsQ.refetch : memberOrgsQ.refetch;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t("organizations")}</h1>
        {isSiteAdmin && (
          <Button onClick={() => setCreateOpen(true)}>{t("create")}</Button>
        )}
      </div>

      {isError && (
        <Alert variant="destructive">
          <AlertDescription className="flex items-center justify-between">
            {t("failedLoadOrgs")}
            <Button variant="ghost" size="sm" onClick={() => refetch()}>
              {t("retry")}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-3">
        {isLoading &&
          Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rounded-lg border border-border p-4 space-y-2"
            >
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
          ))}

        {!isLoading && (data?.organizations.length ?? 0) === 0 && (
          <p className="text-center text-muted-foreground py-12">
            {t("noOrgsYet")}
          </p>
        )}

        {data?.organizations.map((org) => (
          <button
            key={org.id}
            onClick={() => navigate(`/organizations/${org.id}`)}
            className="w-full text-left rounded-lg border border-border p-4 hover:bg-secondary/40 active:bg-secondary/60 transition-colors flex items-center gap-3"
          >
            <div className="flex-1 min-w-0 space-y-1">
              <p className="font-semibold truncate">{org.name}</p>
              <Badge variant="secondary" className="text-xs">
                {org.slug}
              </Badge>
              <p className="text-xs text-muted-foreground">
                {t("createdAt")}: {formatDateTime(org.created_at)}
              </p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
          </button>
        ))}
      </div>

      {isSiteAdmin && createOpen && (
        <CreateOrgDialog onClose={() => setCreateOpen(false)} />
      )}
    </div>
  );
}
