import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Fact, FactStrip } from "@/components/FactStrip";
import { useMeetupStats } from "@/domain/meetup";
import { useLanguage } from "@/lib/i18n";
import { arrivedPercent } from "../lib/arrivedPercent";

/** The featured meetup's live numbers, across the bottom of its panel. */
export function FeaturedStats({
  orgId,
  meetupId,
}: {
  orgId: string;
  meetupId: string;
}) {
  const { t } = useLanguage();
  const statsQ = useMeetupStats(orgId, meetupId);

  if (statsQ.isLoading) {
    return (
      <div
        className="grid gap-px border-t @sm:grid-cols-4"
        data-cy="dashboard-stats-loading"
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2 px-4 py-3 @md:px-5 @md:py-4">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-6 w-10" />
          </div>
        ))}
      </div>
    );
  }

  if (statsQ.isError || !statsQ.data) {
    return (
      <div
        className="flex items-center justify-between gap-2 border-t px-4 py-3 text-sm text-muted-foreground @md:px-6"
        data-cy="dashboard-stats-error"
      >
        {t("failedLoadStats")}
        <Button variant="ghost" size="sm" onClick={() => statsQ.refetch()}>
          {t("retry")}
        </Button>
      </div>
    );
  }

  const { attendance, cancellations } = statsQ.data;
  const percent = arrivedPercent(
    attendance.arrived_count,
    attendance.total_rsvps,
  );

  return (
    <FactStrip cols={4} className="border-t">
      <Fact label={t("statsRsvps")}>
        <span className="tabular-nums" data-cy="dashboard-stat-rsvps">
          {attendance.total_rsvps}
        </span>
      </Fact>
      <Fact
        label={t("statsCheckIns")}
        hint={
          <span className="flex items-center gap-2">
            <Progress
              value={percent}
              aria-label={t("statsCheckIns")}
              getAriaValueText={() => `${percent}%`}
              className="hidden w-16 gap-0 @sm:flex"
            />
            <span data-cy="dashboard-stat-arrived-percent">
              {t("statsArrivedPercent").replace("{0}", String(percent))}
            </span>
          </span>
        }
      >
        <span className="tabular-nums" data-cy="dashboard-stat-checkins">
          {attendance.arrived_count}
        </span>
      </Fact>
      <Fact label={t("statsNotArrived")}>
        <span className="tabular-nums" data-cy="dashboard-stat-not-arrived">
          {attendance.not_arrived_count}
        </span>
      </Fact>
      <Fact label={t("statsCancellations")}>
        <span className="tabular-nums" data-cy="dashboard-stat-cancelled">
          {cancellations.cancelled_count}
        </span>
      </Fact>
    </FactStrip>
  );
}
