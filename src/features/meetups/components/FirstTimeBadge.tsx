import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/lib/i18n";

/** Marks a guest who comes to the org for the first time, for the welcome at the door. */
export function FirstTimeBadge() {
  const { t } = useLanguage();
  return (
    <Badge
      variant="outline"
      className="border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300"
      data-cy="guest-first-time-badge"
    >
      <Sparkles aria-hidden="true" />
      {t("firstTimeBadge")}
    </Badge>
  );
}
