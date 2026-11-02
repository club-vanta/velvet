import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { components } from "@/api/types";
import { ATTENDANCE_VIEW, attendanceSummaryItems } from "../lib/attendanceView";

type Summary = components["schemas"]["GuestAttendanceSummary"];

/** How often the guest came, didn't, cancelled, or is still to come. */
export function GuestMeetupsSummary({ summary }: { summary: Summary }) {
  const { t } = useLanguage();
  return (
    <div
      role="group"
      aria-label={t("guestMeetupsSummary")}
      data-cy="guest-meetups-summary"
    >
      <dl className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
        {attendanceSummaryItems(summary).map((item) => (
          <div
            key={item.status}
            className="flex items-baseline gap-1.5"
            data-cy={`guest-meetups-total-${item.status}`}
          >
            <dt>{t(ATTENDANCE_VIEW[item.status].label)}</dt>
            <dd
              data-cy="guest-meetups-count"
              className={cn(
                "font-semibold text-foreground tabular-nums",
                item.danger && "text-destructive",
              )}
            >
              {item.count}
            </dd>
            {item.walkins > 0 && (
              <dd className="text-xs" data-cy="guest-meetups-walkins">
                ({t(ATTENDANCE_VIEW.WALKIN.label)}: {item.walkins})
              </dd>
            )}
          </div>
        ))}
      </dl>
    </div>
  );
}
