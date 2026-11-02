import { useState } from "react";
import { useAuth } from "@/domain/session";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useLanguage } from "@/lib/i18n";
import { useVisibleOrganizations } from "./api/useOrganizations";
import { CreateOrgDialog } from "./components/CreateOrgDialog";
import { OrgCard } from "./components/OrgCard";

export function OrganizationsPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [createOpen, setCreateOpen] = useState(false);
  const isSiteAdmin = user?.role.name === "SITE_ADMIN";
  const { organizations, isLoading, isError, refetch } =
    useVisibleOrganizations();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t("organizations")}</h1>
        {isSiteAdmin && (
          <Button data-cy="org-create" onClick={() => setCreateOpen(true)}>
            {t("create")}
          </Button>
        )}
      </div>

      {isError && (
        <Alert variant="destructive" data-cy="orgs-error">
          <AlertDescription className="flex items-center justify-between">
            {t("failedLoadOrgs")}
            <Button variant="ghost" size="sm" onClick={refetch}>
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
              data-cy="org-row-loading"
            >
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
          ))}

        {!isLoading && organizations.length === 0 && (
          <p
            className="text-center text-muted-foreground py-12"
            data-cy="orgs-empty"
          >
            {t("noOrgsYet")}
          </p>
        )}

        {organizations.map((org) => (
          <OrgCard key={org.id} org={org} />
        ))}
      </div>

      {isSiteAdmin && createOpen && (
        <CreateOrgDialog onClose={() => setCreateOpen(false)} />
      )}
    </div>
  );
}
