import { useLanguage } from "@/lib/i18n";
import { ChartCard } from "../../components/ChartCard";
import type { NoShowView } from "./noShowShare";
import { RateBars, type RateRow } from "./RateBars";

/** A card of rate bars, one per group. */
export function RateCard({
  title,
  rows,
  view,
}: {
  title: string;
  rows: RateRow[];
  view: NoShowView;
}) {
  const { t } = useLanguage();
  return (
    <ChartCard title={title}>
      {(headingId) => (
        <RateBars
          rows={rows}
          groupHeader={t("statsGroupHeader")}
          rateHeader={t(
            view === "share" ? "statsShareOfNoShows" : "statsNoShowRate",
          )}
          labelledBy={headingId}
          // A share is an exact count of who missed, not a shaky rate.
          dimSmallSamples={view === "rate"}
        />
      )}
    </ChartCard>
  );
}
