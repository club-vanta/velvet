import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/StatCard";
import { useLanguage } from "@/lib/i18n";

/**
 * How many guests come for the first time and how many of them are in, with
 * a shortcut that narrows the list to them before or during the night.
 */
export function FirstTimeStat({
  total,
  arrived,
  onShowOnly,
}: {
  total: number;
  arrived: number;
  onShowOnly: () => void;
}) {
  const { t } = useLanguage();
  return (
    <StatCard title={t("meetupNewGuests")}>
      <p
        className="text-2xl sm:text-3xl font-semibold tabular-nums"
        data-cy="meetup-stats-first-time"
      >
        {total}
      </p>
      <p
        className="text-sm text-muted-foreground"
        data-cy="meetup-stats-first-time-arrived"
      >
        {t("meetupNewArrived").replace("{0}", String(arrived))}
      </p>
      {/* Half a phone screen is narrow: let the label wrap, not overflow. */}
      <Button
        variant="outline"
        size="sm"
        className="h-auto w-full whitespace-normal py-1.5"
        onClick={onShowOnly}
      >
        <Sparkles aria-hidden="true" />
        {t("meetupShowOnlyNew")}
      </Button>
    </StatCard>
  );
}
