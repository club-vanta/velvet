import { useNavigate } from "react-router-dom";
import { ArrowLeft, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { components } from "@/api/types";
import { useLanguage } from "@/lib/i18n";

type Org = components["schemas"]["OrgPublic"];

/** The org's name and slug, a way back to the list, and (optionally) edit. */
export function OrgHeader({
  org,
  isLoading,
  isError,
  onEdit,
}: {
  org: Org | undefined;
  isLoading: boolean;
  isError: boolean;
  /** Only passed for viewers who may edit the org (site admins). */
  onEdit?: () => void;
}) {
  const { t } = useLanguage();
  const navigate = useNavigate();

  return (
    <div className="flex items-start gap-3">
      <Button
        variant="ghost"
        size="sm"
        data-cy="org-back"
        onClick={() => navigate("/organizations")}
        className="h-8 w-8 p-0 mt-1 shrink-0"
      >
        <ArrowLeft className="h-4 w-4" />
      </Button>
      <div className="flex-1 min-w-0">
        {isLoading ? (
          <div className="space-y-2" data-cy="org-loading">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-5 w-24" />
          </div>
        ) : isError ? (
          <Alert variant="destructive" data-cy="org-error">
            <AlertDescription>{t("failedLoadOrgs")}</AlertDescription>
          </Alert>
        ) : (
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1 min-w-0">
              <h1 className="text-2xl font-semibold truncate">{org?.name}</h1>
              <Badge variant="secondary" data-cy="org-slug">
                {org?.slug}
              </Badge>
            </div>
            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 gap-1.5"
                data-cy="org-edit"
                onClick={onEdit}
              >
                <Pencil className="h-3.5 w-3.5" />
                {t("editOrg")}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
