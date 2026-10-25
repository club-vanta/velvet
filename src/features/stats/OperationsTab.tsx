import { Link } from "react-router-dom";
import type { components } from "@/api/types";
import { useOperationsStats } from "@/hooks/useOperationsStats";
import { parseApiDateTime } from "@/lib/apiDateTime";
import { formatDate } from "@/lib/format";
import { GUEST_TYPE_LABEL } from "@/lib/guestType";
import { useLanguage } from "@/lib/i18n";
import { ChartCard } from "./ChartCard";
import { HeadlineStat } from "./HeadlineStat";
import { StatsNote } from "./StatsNote";
import { headlineGrid } from "./headlineGrid";
import { StatsEmptyState, StatsTabGate } from "./StatsTabState";
import {
  NO_VALUE,
  formatChange,
  formatCount,
  formatPointChange,
  formatRate,
} from "./statsFormat";
import type { StatsTabProps } from "./statsTab";
import { useComparisonLine } from "./useComparisonLine";

type Operations = components["schemas"]["OperationsStatsPublic"];
type Payments = components["schemas"]["OperationsPaymentStatsPublic"];
type GuestTypeRow = components["schemas"]["GuestTypeRowPublic"];

/** One chart color per guest type, in the order the API sends them. */
const TYPE_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
];

const LINK_CLASS =
  "min-w-0 rounded-sm font-medium break-words underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50";

/** Everyone who came in by guest type: a bar sized by its share of all. */
function GuestTypeBars({ rows }: { rows: GuestTypeRow[] }) {
  const { t, lang } = useLanguage();

  return (
    <ul className="space-y-2 text-sm">
      {rows.map((row, i) => (
        <li key={row.guest_type} className="space-y-1">
          <div className="flex items-baseline justify-between gap-3">
            <span data-slot="name" className="min-w-0 break-words">
              {t(GUEST_TYPE_LABEL[row.guest_type])}
            </span>
            <span className="text-muted-foreground tabular-nums">
              <span data-slot="count">{formatCount(row.attended, lang)}</span>
              {" · "}
              <span data-slot="share">{formatRate(row.share, lang)}</span>
            </span>
          </div>
          <div
            aria-hidden
            className="h-2 rounded-full bg-muted"
            data-slot="bar-track"
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${(row.share ?? 0) * 100}%`,
                backgroundColor: TYPE_COLORS[i % TYPE_COLORS.length],
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function PaymentCount({
  slot,
  label,
  value,
}: {
  slot: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd data-slot={slot} className="font-medium tabular-nums">
        {value}
      </dd>
    </div>
  );
}

/** Paid, pending and exempt people, and those who cancelled after paying. */
function PaymentsCounts({ payments }: { payments: Payments }) {
  const { t, lang } = useLanguage();

  return (
    <>
      <dl className="space-y-1 text-sm">
        <PaymentCount
          slot="paid"
          label={t("statsPaymentPaid")}
          value={formatCount(payments.paid, lang)}
        />
        <PaymentCount
          slot="pending"
          label={t("statsPaymentPending")}
          value={formatCount(payments.pending, lang)}
        />
        <PaymentCount
          slot="exempt"
          label={t("statsPaymentExempt")}
          value={formatCount(payments.exempt, lang)}
        />
      </dl>
      {payments.cancelled_but_paid > 0 && (
        <p
          data-slot="cancelled-paid"
          className="text-sm text-muted-foreground tabular-nums"
        >
          {t("statsCancelledButPaid").replace(
            "{0}",
            formatCount(payments.cancelled_but_paid, lang),
          )}
        </p>
      )}
    </>
  );
}

/** Check-ins of each staff member; those with no recorded checker share one row. */
function StaffList({ staff }: { staff: Operations["staff"] }) {
  const { t, lang } = useLanguage();

  return (
    <ul className="divide-y text-sm">
      {staff.map((member) => (
        <li
          key={member.user_id ?? "none"}
          className="flex items-baseline justify-between gap-3 py-1.5"
        >
          <span data-slot="name" className="min-w-0 break-words">
            {member.username ?? t("statsNoChecker")}
          </span>
          <span data-slot="count" className="tabular-nums">
            {formatCount(member.checkins, lang)}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** The newest bans, each guest linked to their page. */
function BanList({
  bans,
  total,
}: {
  bans: Operations["ban_list"];
  total: number;
}) {
  const { t, lang } = useLanguage();
  const more = total - bans.length;

  return (
    <>
      <ul className="divide-y text-sm">
        {bans.map((ban) => (
          <li
            key={`${ban.guest_id}-${ban.timestamp}`}
            className="space-y-0.5 py-1.5"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <Link to={`/guests/${ban.guest_id}`} className={LINK_CLASS}>
                {ban.displayname}
              </Link>
              <span
                data-slot="date"
                className="text-muted-foreground tabular-nums"
              >
                {formatDate(parseApiDateTime(ban.timestamp).toISOString())}
              </span>
            </div>
            <p className="text-muted-foreground break-words">
              <span data-slot="reason">{ban.reason ?? NO_VALUE}</span>
              {" · "}
              <span data-slot="actor">{ban.actor_username ?? NO_VALUE}</span>
            </p>
          </li>
        ))}
      </ul>
      {more > 0 && (
        <p data-slot="bans-more" className="pt-2 text-sm text-muted-foreground">
          {t("statsLapsedMore").replace("{0}", formatCount(more, lang))}
        </p>
      )}
    </>
  );
}

function OperationsContent({ data }: { data: Operations }) {
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
  const line = useComparisonLine(comparison_kind);

  if (summary.attended === 0) {
    return <StatsEmptyState />;
  }

  // The comparison's counts are period totals for one event, so they have no
  // average and only compare against the previous period.
  function compareCount(
    current: number,
    baseline: number | undefined,
  ): string | undefined {
    if (baseline === undefined) return undefined;
    return line({ unit: "percent", change: formatChange(current, baseline) });
  }

  function comparePaidShare(): string | undefined {
    if (!comparison) return undefined;
    return line({
      unit: "points",
      change: formatPointChange(summary.paid_share, comparison.paid_share),
      average: formatRate(comparison.paid_share, lang),
    });
  }

  function comparePeak(): string | undefined {
    if (!comparison) return undefined;
    const baseline = comparison.avg_peak_checkins;
    return line({
      unit: "percent",
      change: formatChange(summary.avg_peak_checkins, baseline),
      average:
        baseline === null
          ? NO_VALUE
          : formatCount(Math.round(baseline * 10) / 10, lang),
    });
  }

  const cards = payments ? 4 : 3;

  return (
    <div className="space-y-3">
      <div className={headlineGrid(cards)}>
        <HeadlineStat
          label={t("statsCameIn")}
          value={formatCount(summary.attended, lang)}
          comparison={compareCount(summary.attended, comparison?.attended)}
        />
        {payments && (
          <HeadlineStat
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
          label={t("statsDoorPeak")}
          value={formatCount(busiest?.checkins ?? null, lang)}
          subline={
            busiest
              ? comparison_kind === "PERIOD_AVERAGE"
                ? busiest.local_time
                : `${busiest.meetup_name} · ${busiest.local_time}`
              : undefined
          }
          comparison={comparePeak()}
        />
        <HeadlineStat
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
      {summary.bans > 0 && (
        <ChartCard title={t("statsBans")}>
          <BanList bans={ban_list} total={summary.bans} />
        </ChartCard>
      )}
    </div>
  );
}

export function OperationsTab({ orgId, query, onShowAll }: StatsTabProps) {
  const statsQ = useOperationsStats(orgId, query);

  return (
    <StatsTabGate
      statsQ={statsQ}
      single={!!query?.meetupId}
      cards={4}
      testId="operations-skeleton"
      onShowAll={onShowAll}
    >
      {(data) => <OperationsContent data={data} />}
    </StatsTabGate>
  );
}
