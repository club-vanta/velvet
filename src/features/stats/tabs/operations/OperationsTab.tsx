import type { components } from "@/api/types";
import { StatsNote } from "@/components/StatsNote";
import { formatDecimal } from "@/lib/format";
import { useLanguage } from "@/lib/i18n";
import { useOperationsStats } from "../../api/useOperationsStats";
import { ChartCard } from "../../components/ChartCard";
import { HeadlineStat } from "../../components/HeadlineStat";
import { StatsEmptyState } from "../../components/StatsEmptyState";
import { StatsTabGate } from "../../components/StatsTabGate";
import { useComparisonLine } from "../../hooks/useComparisonLine";
import { headlineGrid } from "../../lib/headlineGrid";
import {
  formatCount,
  formatRate,
  NO_VALUE,
  percentChange,
  pointChange,
} from "../../lib/statsFormat";
import type { StatsPeriodChoice } from "../../lib/statsPeriod";
import type { StatsTabProps } from "../../lib/statsTab";
import { BanList } from "./BanList";
import { GuestTypeBars } from "./GuestTypeBars";
import { PaymentsCounts } from "./PaymentsCounts";
import { StaffList } from "./StaffList";

type Operations = components["schemas"]["OperationsStatsPublic"];

/**
 * Headline cards of the loaded tab. An org that takes no payments has no
 * payment-share card; the skeleton shows the common case.
 */
const CARDS = { withPayments: 4, withoutPayments: 3 };

function OperationsContent({
  data,
  period,
}: {
  data: Operations;
  period: StatsPeriodChoice;
}) {
  const { t, lang } = useLanguage();
  const {
    summary,
    guest_types,
    payments,
    staff,
    busiest,
    ban_list,
    comparison,
    comparison_kind,
  } = data;
  const line = useComparisonLine(comparison_kind, period);
  // For one event the comparison holds period totals and averages.
  const isOneEvent = comparison_kind === "PERIOD_AVERAGE";

  if (summary.attended === 0) {
    return <StatsEmptyState />;
  }

  // A count compared with a period total has no average, so for one event it
  // shows no line at all.
  function compareCount(
    current: number,
    baseline: number | undefined,
  ): string | undefined {
    if (isOneEvent || baseline === undefined) return undefined;
    return line({ unit: "percent", change: percentChange(current, baseline) });
  }

  function comparePaidShare(): string | undefined {
    if (!comparison) return undefined;
    return line({
      unit: "points",
      change: pointChange(summary.paid_share, comparison.paid_share),
      average: formatRate(comparison.paid_share, lang),
    });
  }

  // The API has no previous busiest slot, so only one event compares: its
  // busiest slot against the period's average peak.
  function comparePeak(): string | undefined {
    if (!isOneEvent || !comparison) return undefined;
    const average = comparison.avg_peak_checkins;
    return line({
      unit: "percent",
      change: null,
      average: average === null ? NO_VALUE : formatDecimal(average, lang),
    });
  }

  return (
    <div className="space-y-3">
      <div
        className={headlineGrid(
          payments ? CARDS.withPayments : CARDS.withoutPayments,
        )}
      >
        <HeadlineStat
          data-cy="stats-headline-came-in"
          label={t("statsCameIn")}
          value={formatCount(summary.attended, lang)}
          comparison={compareCount(summary.attended, comparison?.attended)}
        />
        {payments && (
          <HeadlineStat
            data-cy="stats-headline-paid"
            label={t("statsPaid")}
            value={formatRate(payments.paid_share, lang)}
            comparison={comparePaidShare()}
            n={
              payments.paid_share === null
                ? undefined
                : payments.paid + payments.pending
            }
          />
        )}
        <HeadlineStat
          data-cy="stats-headline-door-peak"
          label={t("statsDoorPeak")}
          value={formatCount(busiest?.checkins ?? null, lang)}
          subline={
            busiest
              ? isOneEvent
                ? busiest.local_time
                : `${busiest.meetup_name} · ${busiest.local_time}`
              : undefined
          }
          comparison={comparePeak()}
        />
        <HeadlineStat
          data-cy="stats-headline-bans"
          label={t("statsBans")}
          value={formatCount(summary.bans, lang)}
          comparison={compareCount(summary.bans, comparison?.bans)}
        />
      </div>
      <StatsNote>{t("statsNoteOperations")}</StatsNote>
      <ChartCard title={t("statsGuestTypes")}>
        <GuestTypeBars rows={guest_types} />
      </ChartCard>
      {payments && (
        <>
          <ChartCard title={t("statsPayments")}>
            <PaymentsCounts payments={payments} />
          </ChartCard>
          <StatsNote>{t("statsNotePayments")}</StatsNote>
        </>
      )}
      <ChartCard title={t("statsStaffCheckins")}>
        <StaffList staff={staff} />
      </ChartCard>
      {ban_list.length > 0 && (
        <ChartCard title={t("statsBans")}>
          <BanList bans={ban_list} total={summary.bans} />
        </ChartCard>
      )}
    </div>
  );
}

export function OperationsTab({
  orgId,
  query,
  period,
  onShowAll,
}: StatsTabProps) {
  const statsQ = useOperationsStats(orgId, query);

  return (
    <StatsTabGate
      statsQ={statsQ}
      single={!!query?.meetupId}
      cards={CARDS.withPayments}
      tab="operations"
      onShowAll={onShowAll}
    >
      {(data) => <OperationsContent data={data} period={period} />}
    </StatsTabGate>
  );
}
