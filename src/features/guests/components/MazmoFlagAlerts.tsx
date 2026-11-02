import { TriangleAlert, UserX } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useLanguage } from "@/lib/i18n";
import type { components } from "@/api/types";

type MazmoProfile = components["schemas"]["GuestMazmoProfilePublic"];

/**
 * Mazmo's own flags on the account, spelled out: a ban or suspension there,
 * or a deleted account. Neither is an org vant, and neither blocks check-in.
 */
export function MazmoFlagAlerts({
  profile,
}: {
  profile: MazmoProfile | null | undefined;
}) {
  const { t } = useLanguage();
  if (!profile) return null;
  const flagged = profile.mazmo_banned || profile.mazmo_suspended;
  return (
    <>
      {flagged && (
        <Alert
          className="border-orange-500/40 text-orange-700 dark:text-orange-300"
          data-cy="guest-mazmo-flag-alert"
        >
          <TriangleAlert />
          <AlertTitle>
            {profile.mazmo_banned
              ? t("mazmoBannedTitle")
              : t("mazmoSuspendedTitle")}
          </AlertTitle>
          <AlertDescription className="text-orange-700/90 dark:text-orange-300/90">
            {t("mazmoFlagExplanation")}
          </AlertDescription>
        </Alert>
      )}
      {profile.mazmo_deleted && (
        <Alert data-cy="guest-mazmo-deleted-alert">
          <UserX />
          <AlertTitle>{t("mazmoDeletedTitle")}</AlertTitle>
          <AlertDescription>{t("mazmoDeletedExplanation")}</AlertDescription>
        </Alert>
      )}
    </>
  );
}
