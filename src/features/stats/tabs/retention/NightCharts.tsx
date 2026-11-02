import type { components } from "@/api/types";
import { useLanguage } from "@/lib/i18n";
import { ChartCard } from "../../components/ChartCard";
import { NightAfterwards } from "./NightAfterwards";
import { NightCrowd } from "./NightCrowd";

type Night = components["schemas"]["RetentionNightPublic"];

/** Who came to the one event and how many of them came back afterwards. */
export function NightCharts({ night }: { night: Night }) {
  const { t } = useLanguage();
  return (
    <>
      <ChartCard title={t("statsNightCrowd")}>
        {(headingId) => (
          <NightCrowd guests={night.guests} labelledBy={headingId} />
        )}
      </ChartCard>
      <ChartCard title={t("statsAfterwards")}>
        {(headingId) =>
          night.afterwards.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("statsAfterwardsNone")}
            </p>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                {t("statsAfterwardsHint")}
              </p>
              <NightAfterwards night={night} labelledBy={headingId} />
            </div>
          )
        }
      </ChartCard>
    </>
  );
}
