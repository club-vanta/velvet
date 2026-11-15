import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";
import { useLanguage } from "@/lib/i18n";
import type { components } from "@/api/types";
import { GuestIdentity } from "./GuestIdentity";
import { GuestRow } from "./GuestRow";

type BannedGuest = components["schemas"]["BannedGuestPublic"];

/** One row of the Vanted tab; see DirectoryRow for why it's a component. */
export function VantedRow({
  guest,
  canUnban,
  unbanPending,
  onUnban,
}: {
  guest: BannedGuest;
  canUnban: boolean;
  unbanPending: boolean;
  onUnban: (guest: BannedGuest) => void;
}) {
  const { t } = useLanguage();
  return (
    <GuestRow data-cy={`vanted-row-${guest.id}`}>
      <GuestIdentity guest={guest} isBanned />
      <div className="flex items-end justify-between gap-3 @3xl:contents">
        <dl className="min-w-0 space-y-1 text-sm @3xl:contents">
          <div className="text-xs text-muted-foreground @3xl:w-52 @3xl:shrink-0 @3xl:whitespace-nowrap">
            <dt className="inline font-medium">{t("bannedAt")}</dt>{" "}
            <dd className="inline" data-cy="vanted-at">
              {formatDateTime(guest.banned_at)}
            </dd>
          </div>
          <div className="@3xl:w-72 @3xl:shrink-0">
            <dt className="sr-only">{t("reason")}</dt>
            <dd className="break-words" data-cy="vanted-reason">
              {guest.banned_reason}
            </dd>
          </div>
        </dl>
        {canUnban && (
          <Button
            variant="outline"
            size="sm"
            className="shrink-0"
            data-cy="vanted-unban"
            onClick={() => onUnban(guest)}
            disabled={unbanPending}
          >
            {t("unban")}
          </Button>
        )}
      </div>
    </GuestRow>
  );
}
