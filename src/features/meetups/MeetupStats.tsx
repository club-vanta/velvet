import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/lib/i18n";
import { useMeetupStats } from "@/hooks/useMeetupStats";
import { cn } from "@/lib/utils";

function StatCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-label={title}
      className="rounded-xl bg-card p-3 sm:p-4 ring-1 ring-foreground/10 space-y-2 sm:space-y-3 min-w-0"
    >
      <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}

function StatRows({
  rows,
}: {
  rows: {
    label: string;
    value: number;
    dotClass?: string;
    emphasis?: boolean;
  }[];
}) {
  return (
    <dl className="space-y-1 text-sm">
      {rows.map((row) => (
        <div
          key={row.label}
          className="flex items-center justify-between gap-2"
        >
          <dt className="flex items-center gap-2 text-muted-foreground min-w-0">
            {row.dotClass && (
              <span
                aria-hidden="true"
                className={cn("size-2 shrink-0 rounded-full", row.dotClass)}
              />
            )}
            <span className="truncate">{row.label}</span>
          </dt>
          <dd
            className={cn(
              "font-medium tabular-nums",
              row.emphasis && "text-amber-600 dark:text-amber-400",
            )}
          >
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

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
      <div className={gridClass}>
        {Array.from({ length: cardCount }).map((_, i) => (
          <Skeleton key={i} className="h-28 sm:h-32 rounded-xl" />
        ))}
      </div>
    );
  }

  if (statsQ.isError || !statsQ.data) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-xl px-4 py-3 text-sm text-muted-foreground ring-1 ring-foreground/10">
        {t("failedLoadStats")}
        <Button variant="ghost" size="sm" onClick={() => statsQ.refetch()}>
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
    <div className={gridClass}>
      <StatCard title={t("statsCheckIns")}>
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-2xl sm:text-3xl font-semibold tabular-nums">
            {attendance.arrived_count}
            <span className="text-base font-normal text-muted-foreground">
              {" "}
              / {attendance.total_rsvps}
            </span>
          </p>
          <span className="text-sm text-muted-foreground tabular-nums">
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
              label: t("statsNotArrived"),
              value: attendance.not_arrived_count,
            },
            { label: t("statsWalkins"), value: attendance.walkin_count },
          ]}
        />
      </StatCard>

      <StatCard title={t("statsGuestTypes")}>
        <StatRows
          rows={[
            {
              label: t("guestTypeNormal"),
              value: guest_types.normal_count,
              dotClass: "bg-muted-foreground/50",
            },
            {
              label: t("guestTypeInvited"),
              value: guest_types.invited_count,
              dotClass: "bg-violet-500",
            },
            {
              label: t("guestTypeVendor"),
              value: guest_types.vendor_count,
              dotClass: "bg-emerald-500",
            },
            {
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
              { label: t("paid"), value: payment.paid_count },
              { label: t("paymentPending"), value: payment.unpaid_count },
              {
                label: t("paymentExempt"),
                value: payment.exempt_from_payment_count,
              },
              // Only worth a line when someone needs a refund check.
              ...(cancellations.cancelled_but_paid_count > 0
                ? [
                    {
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
