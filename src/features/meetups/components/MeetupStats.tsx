import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { StatCard } from "@/components/StatCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/lib/i18n";
import { useMeetupStats } from "@/domain/meetup";
import { cn } from "@/lib/utils";
import { StatRows } from "./StatRows";

/** The meetup's live numbers: check-ins, guest types and, if paid, payments. */
export function MeetupStats({
  orgId,
  meetupId,
  requiresPayment,
}: {
  orgId: string;
  meetupId: string;
  requiresPayment: boolean;
}) {
  const { t } = useLanguage();

  const statsQ = useMeetupStats(orgId, meetupId);

  const cardCount = requiresPayment ? 3 : 2;
  const gridClass = cn(
    "grid gap-2 sm:gap-3 grid-cols-2",
    cardCount === 3 && "xl:grid-cols-3",
  );

  if (statsQ.isLoading) {
    return (
      <div className={gridClass} data-cy="meetup-stats-loading">
        {Array.from({ length: cardCount }).map((_, i) => (
          <Skeleton key={i} className="h-28 sm:h-32 rounded-xl" />
        ))}
      </div>
    );
  }

  if (statsQ.isError || !statsQ.data) {
    return (
      <div
        className="flex items-center justify-between gap-2 rounded-xl px-4 py-3 text-sm text-muted-foreground ring-1 ring-foreground/10"
        data-cy="meetup-stats-error"
      >
        {t("failedLoadStats")}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => statsQ.refetch()}
          data-cy="retry"
        >
          {t("retry")}
        </Button>
      </div>
    );
  }

  const { attendance, cancellations, guest_types, payment } = statsQ.data;
  const percent =
    attendance.total_rsvps > 0
      ? Math.round((attendance.arrived_count / attendance.total_rsvps) * 100)
      : 0;

  return (
    <div className={gridClass} data-cy="meetup-stats">
      <StatCard title={t("statsCheckIns")}>
        <div className="flex items-baseline justify-between gap-2">
          <p
            className="text-2xl sm:text-3xl font-semibold tabular-nums"
            data-cy="meetup-stats-arrived"
          >
            {attendance.arrived_count}
            <span className="text-base font-normal text-muted-foreground">
              {" "}
              / {attendance.total_rsvps}
            </span>
          </p>
          <span
            className="text-sm text-muted-foreground tabular-nums"
            data-cy="meetup-stats-percent"
          >
            {percent}%
          </span>
        </div>
        <Progress
          value={percent}
          aria-label={t("statsCheckIns")}
          getAriaValueText={() => `${percent}%`}
          className="gap-0"
        />
        <StatRows
          rows={[
            {
              id: "not-arrived",
              label: t("statsNotArrived"),
              value: attendance.not_arrived_count,
            },
            {
              id: "walkins",
              label: t("statsWalkins"),
              value: attendance.walkin_count,
            },
          ]}
        />
      </StatCard>

      <StatCard title={t("statsGuestTypes")}>
        <StatRows
          rows={[
            {
              id: "normal",
              label: t("guestTypeNormal"),
              value: guest_types.normal_count,
              dotClass: "bg-muted-foreground/50",
            },
            {
              id: "invited",
              label: t("guestTypeInvited"),
              value: guest_types.invited_count,
              dotClass: "bg-violet-500",
            },
            {
              id: "vendor",
              label: t("guestTypeVendor"),
              value: guest_types.vendor_count,
              dotClass: "bg-emerald-500",
            },
            {
              id: "staff",
              label: t("guestTypeStaff"),
              value: guest_types.staff_count,
              dotClass: "bg-sky-500",
            },
          ]}
        />
      </StatCard>

      {requiresPayment && (
        <StatCard title={t("payment")}>
          <StatRows
            rows={[
              { id: "paid", label: t("paid"), value: payment.paid_count },
              {
                id: "unpaid",
                label: t("paymentPending"),
                value: payment.unpaid_count,
              },
              {
                id: "exempt",
                label: t("paymentExempt"),
                value: payment.exempt_from_payment_count,
              },
              // Only worth a line when someone needs a refund check.
              ...(cancellations.cancelled_but_paid_count > 0
                ? [
                    {
                      id: "cancelled-paid",
                      label: t("statsCancelledButPaidRefund"),
                      value: cancellations.cancelled_but_paid_count,
                      emphasis: true,
                    },
                  ]
                : []),
            ]}
          />
          {cancellations.cancelled_but_paid_count > 0 ? (
            <p className="text-xs text-muted-foreground">
              {t("statsRefundHint")}
            </p>
          ) : (
            <p className="hidden sm:block text-xs text-muted-foreground">
              {t("statsExemptHint")}
            </p>
          )}
        </StatCard>
      )}
    </div>
  );
}
