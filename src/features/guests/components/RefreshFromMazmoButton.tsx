import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useRefreshFromMazmo } from "../api/useRefreshFromMazmo";

/** Re-fetches every linked guest's name and profile from Mazmo. */
export function RefreshFromMazmoButton() {
  const { t } = useLanguage();
  const refresh = useRefreshFromMazmo();

  return (
    <Button
      variant="outline"
      data-cy="guests-refresh-mazmo"
      onClick={() => refresh.mutate()}
      disabled={refresh.isPending}
      className="gap-2"
    >
      <RefreshCw
        className={cn(refresh.isPending && "animate-spin")}
        aria-hidden="true"
      />
      {t("syncFromMazmo")}
    </Button>
  );
}
