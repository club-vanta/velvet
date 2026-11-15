import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/lib/i18n";
import type { MeetupTiming } from "@/domain/meetup";
import type { components } from "@/api/types";

type Meetup = components["schemas"]["MeetupPublic"];

/** Today, paid event, finalized: the meetup's states worth a glance. */
export function MeetupBadges({
  meetup,
  timing,
}: {
  meetup: Meetup;
  timing: MeetupTiming;
}) {
  const { t } = useLanguage();
  return (
    <>
      {timing === "today" && (
        <Badge
          variant="outline"
          className="border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
          data-cy="meetup-badge-today"
        >
          {t("meetupToday")}
        </Badge>
      )}
      {meetup.requires_payment && (
        <Badge variant="outline" data-cy="meetup-badge-paid">
          {t("paidEvent")}
        </Badge>
      )}
      {meetup.is_finalized && (
        <Badge variant="secondary" data-cy="meetup-badge-finalized">
          {t("meetupFinalized")}
        </Badge>
      )}
    </>
  );
}
