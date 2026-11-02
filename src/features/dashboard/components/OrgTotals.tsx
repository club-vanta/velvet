import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { Fact, FactStrip } from "@/components/FactStrip";
import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export type Total = { value?: number; loading: boolean };

function TotalValue({ total, cy }: { total: Total; cy: string }) {
  if (total.loading) return <Skeleton className="mt-1 h-6 w-10" />;
  return (
    <span className="tabular-nums" data-cy={cy}>
      {total.value ?? 0}
    </span>
  );
}

function PendingApprovals({ total }: { total: Total }) {
  if (total.loading) return <Skeleton className="mt-1 h-6 w-10" />;
  const value = total.value ?? 0;
  return (
    <Link
      to="/staff"
      data-cy="dashboard-pending-approvals"
      className={cn(
        "tabular-nums underline-offset-4 hover:underline",
        value > 0 && "text-amber-600 dark:text-amber-400",
      )}
    >
      {value}
    </Link>
  );
}

/**
 * The org's headline counts. `pending` is only passed for site admins, who
 * approve new staff accounts; it links to the staff page.
 */
export function OrgTotals({
  meetups,
  guests,
  pending,
}: {
  meetups: Total;
  guests: Total;
  pending?: Total;
}) {
  const { t } = useLanguage();

  return (
    <section className="overflow-hidden rounded-xl border bg-card">
      <h2 className="sr-only">{t("orgTotals")}</h2>
      <FactStrip cols={pending ? 3 : 2}>
        <Fact label={t("totalMeetups")}>
          <TotalValue total={meetups} cy="dashboard-total-meetups" />
        </Fact>
        <Fact label={t("totalGuests")}>
          <TotalValue total={guests} cy="dashboard-total-guests" />
        </Fact>
        {pending && (
          <Fact label={t("pendingApprovals")}>
            <PendingApprovals total={pending} />
          </Fact>
        )}
      </FactStrip>
    </section>
  );
}
