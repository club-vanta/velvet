import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** The count on a nav link, read out as "3 pending approvals". */
export function PendingBadge({
  count,
  className,
}: {
  count: number;
  className?: string;
}) {
  const { t } = useLanguage();
  if (count <= 0) return null;
  return (
    <Badge
      variant="destructive"
      data-cy="shell-pending-badge"
      className={cn("px-1.5", className)}
    >
      {count}
      <span className="sr-only"> {t("navPendingApprovals")}</span>
    </Badge>
  );
}
