import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { components } from "@/api/types";
import { formatDateTime } from "@/lib/format";
import { useLanguage } from "@/lib/i18n";

type Org = components["schemas"]["OrgPublic"];

/** One org in the list; opens its detail page. */
export function OrgCard({ org }: { org: Org }) {
  const { t } = useLanguage();
  const navigate = useNavigate();

  return (
    <button
      data-cy={`org-row-${org.id}`}
      onClick={() => navigate(`/organizations/${org.id}`)}
      className="w-full text-left rounded-lg border border-border p-4 hover:bg-secondary/40 active:bg-secondary/60 transition-colors flex items-center gap-3"
    >
      <div className="flex-1 min-w-0 space-y-1">
        <p className="font-semibold truncate" data-cy="org-name">
          {org.name}
        </p>
        <Badge variant="secondary" className="text-xs" data-cy="org-slug">
          {org.slug}
        </Badge>
        <p className="text-xs text-muted-foreground">
          {t("createdAt")}: {formatDateTime(org.created_at)}
        </p>
      </div>
      <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
    </button>
  );
}
