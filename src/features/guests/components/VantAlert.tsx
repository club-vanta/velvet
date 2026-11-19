import { ShieldBan } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { formatFullDateTime } from "@/lib/format";
import { useLanguage } from "@/lib/i18n";
import type { components } from "@/api/types";

type BannedGuest = components["schemas"]["BannedGuestPublic"];

/** The guest's vant in this org: why, since when, and who vanted. */
export function VantAlert({
  ban,
  orgName,
}: {
  ban: BannedGuest;
  orgName?: string;
}) {
  const { t } = useLanguage();
  const since = formatFullDateTime(ban.banned_at);
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
          {ban.banned_by
            ? t("vantedSinceBy")
                .replace("{0}", since)
                .replace("{1}", ban.banned_by.username)
            : t("vantedSince").replace("{0}", since)}
        </p>
      </AlertDescription>
    </Alert>
  );
}
