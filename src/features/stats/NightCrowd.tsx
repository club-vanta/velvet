import type { components } from "@/api/types";
import { useLanguage, type TranslationKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { ChartTextTable } from "./ChartTextTable";
import { Face } from "./CrowdFace";
import {
  bandStyle,
  FADED,
  formatGap,
  groupByVisits,
  visitLabel,
  type VisitBand,
} from "./nightCrowd";
import { useFaceCard } from "./useFaceCard";
import { formatCount, NO_VALUE } from "./statsFormat";

type NightGuest = components["schemas"]["NightGuestPublic"];

const BAND_LABELS: Record<VisitBand, TranslationKey> = {
  first: "statsBandFirst",
  second: "statsBandSecond",
  few: "statsBandFew",
  regular: "statsBandRegular",
};

/** The faces ripple in one after another, but the last starts within this. */
const MAX_DELAY_MS = 700;

/** The share of each band as one bar across the card, growing in from the left. */
function CompositionBar({
  groups,
}: {
  groups: ReturnType<typeof groupByVisits>;
}) {
  return (
    <div className="flex h-2.5 w-full origin-left animate-bar-grow gap-0.5 overflow-hidden rounded-full motion-reduce:animate-none">
      {groups
        .filter((g) => g.guests.length > 0)
        .map(({ band, guests }) => (
          <div
            key={band}
            data-share={band}
            className="h-full bg-(--band)"
            style={{ ...bandStyle(band), flexGrow: guests.length }}
          />
        ))}
    </div>
  );
}

/** A sample face for the legend: a ring, vivid or faded. */
function LegendFace({ faded }: { faded: boolean }) {
  return (
    <span
      className="rounded-full ring-2 ring-(--band)"
      style={bandStyle("regular")}
    >
      <span
        className={cn("block size-3 rounded-full bg-(--band)", faded && FADED)}
      />
    </span>
  );
}

/**
 * Everyone who came that night as a face, in rows by how many times they had
 * come, vivid when they came back later and faded when they have not. The
 * faces are a picture for pointer users; screen readers get each person as a
 * table row instead.
 */
export function NightCrowd({
  guests,
  labelledBy,
}: {
  guests: NightGuest[];
  labelledBy: string;
}) {
  const { t, lang } = useLanguage();
  const { show, card, containerProps } = useFaceCard({ showBack: true });
  const groups = groupByVisits(guests);
  const step = Math.min(18, MAX_DELAY_MS / Math.max(1, guests.length));
  // Where each row starts in the ripple, so it runs top to bottom.
  const firstIndex = groups.map((_, i) =>
    groups.slice(0, i).reduce((n, g) => n + g.guests.length, 0),
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <p>{t("statsNightCrowdHint")}</p>
        <p className="flex items-center gap-1.5">
          <LegendFace faded={false} />
          {t("statsCameBackLater")}
        </p>
        <p className="flex items-center gap-1.5">
          <LegendFace faded />
          {t("statsNotBackYet")}
        </p>
      </div>
      <div aria-hidden className="space-y-4">
        <CompositionBar groups={groups} />
        <div data-crowd className="relative space-y-3" {...containerProps}>
          {groups.map(({ band, guests: members }, row) => (
            <div
              key={band}
              data-band={band}
              className="grid gap-2 sm:grid-cols-[10rem_1fr] sm:items-center sm:gap-3"
            >
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <span
                  className="size-2 shrink-0 rounded-full bg-(--band)"
                  style={bandStyle(band)}
                />
                <span
                  data-slot="count"
                  className="text-sm font-semibold text-foreground tabular-nums"
                >
                  {formatCount(members.length, lang)}
                </span>
                {t(BAND_LABELS[band])}
              </p>
              {members.length > 0 && (
                <div className="flex flex-wrap gap-2.5">
                  {members.map((guest, i) => (
                    <Face
                      key={guest.guest_id}
                      guest={guest}
                      faded={!guest.came_back}
                      delayMs={(firstIndex[row] + i) * step}
                      onShow={show}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
          {card}
        </div>
      </div>
      <ChartTextTable
        labelledBy={labelledBy}
        headers={[
          t("statsPersonHeader"),
          t("statsVisitHeader"),
          t("statsSincePrevious"),
          t("statsCameBackHeader"),
        ]}
        rows={groups.flatMap(({ guests: members }) =>
          members.map((g) => ({
            key: g.guest_id,
            cells: [
              g.displayname,
              visitLabel(g.visit, t, lang),
              g.days_since_previous === null
                ? NO_VALUE
                : formatGap(g.days_since_previous, t),
              t(g.came_back ? "statsCameBackLater" : "statsNotBackYet"),
            ],
          })),
        )}
      />
    </div>
  );
}
