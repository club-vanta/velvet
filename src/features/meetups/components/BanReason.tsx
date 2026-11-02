import { Skeleton } from "@/components/ui/skeleton";
import { useBannedGuests } from "@/domain/guest";
import { useLanguage } from "@/lib/i18n";

/**
 * Why the org vanted this guest, and who did it, from the org's vanted list.
 * A cached list can predate a ban made on another device, so a missing guest
 * only counts as "no reason" once the refetch has settled.
 */
export function BanReason({
  orgId,
  guestId,
}: {
  orgId: string;
  guestId: string;
}) {
  const { t } = useLanguage();
  const bannedQ = useBannedGuests(orgId);
  const ban = bannedQ.data?.guests.find((g) => g.id === guestId);

  if (ban)
    return (
      <figure className="space-y-1 border-l-2 pl-3" data-cy="ban-reason">
        <blockquote className="break-words text-muted-foreground">
          <p data-cy="ban-reason-text">{ban.banned_reason}</p>
        </blockquote>
        {ban.banned_by && (
          <figcaption
            className="italic text-muted-foreground"
            data-cy="ban-reason-author"
          >
            <span aria-hidden="true">– </span>
            <span className="sr-only">{t("banReasonBy")} </span>
            {ban.banned_by.username}
          </figcaption>
        )}
      </figure>
    );
  if (bannedQ.isFetching)
    return (
      <Skeleton
        role="status"
        aria-label={t("banReasonLoading")}
        className="h-4 w-48"
        data-cy="ban-reason-loading"
      />
    );
  return (
    <p className="text-muted-foreground" data-cy="ban-reason-message">
      {t(bannedQ.isError ? "banReasonUnavailable" : "banReasonMissing")}
    </p>
  );
}
