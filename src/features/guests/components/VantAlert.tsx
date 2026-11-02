import { ShieldBan } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { formatFullDateTime } from "@/lib/format";
import { useLanguage } from "@/lib/i18n";
import type { components } from "@/api/types";

type BannedGuest = components["schemas"]["BannedGuestPublic"];

/** The guest's vant in this org: why, and since when. */
export function VantAlert({
  ban,
  orgName,
}: {
  ban: BannedGuest;
  orgName?: string;
}) {
  const { t } = useLanguage();
  return (
    <Alert variant="destructive" data-cy="guest-vant-alert">
      <ShieldBan />
      <AlertTitle data-cy="guest-vant-title">
        {orgName
          ? t("vantedInOrg").replace("{0}", orgName)
          : t("vantedInThisOrg")}
      </AlertTitle>
      <AlertDescription className="[&_p:not(:last-child)]:mb-1">
        <p className="break-words" data-cy="guest-vant-reason">
          {ban.banned_reason}
        </p>
        <p className="text-xs" data-cy="guest-vant-since">
          {t("vantedSince").replace("{0}", formatFullDateTime(ban.banned_at))}
        </p>
      </AlertDescription>
    </Alert>
  );
}
