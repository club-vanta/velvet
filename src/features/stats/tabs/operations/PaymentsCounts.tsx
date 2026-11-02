import type { components } from "@/api/types";
import { useLanguage } from "@/lib/i18n";
import { formatCount } from "../../lib/statsFormat";

type Payments = components["schemas"]["OperationsPaymentStatsPublic"];

/** One labelled count of the payments card. */
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
      <dd
        data-cy={`stats-payments-${slot}`}
        className="font-medium tabular-nums"
      >
        {value}
      </dd>
    </div>
  );
}

/** Paid, pending and exempt people, and those who cancelled after paying. */
export function PaymentsCounts({ payments }: { payments: Payments }) {
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
          data-cy="stats-payments-cancelled-paid"
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
