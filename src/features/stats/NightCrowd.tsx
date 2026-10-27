import { useEffect, useState, type CSSProperties } from "react";
import type { components } from "@/api/types";
import { GuestAvatar } from "@/components/GuestAvatar";
import { useLanguage, type TranslationKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { ChartTextTable } from "./ChartTextTable";
import { formatGap, groupByVisits, type VisitBand } from "./nightCrowd";
import { formatCount, NO_VALUE } from "./statsFormat";
import { TooltipBox } from "./TooltipBox";

type NightGuest = components["schemas"]["NightGuestPublic"];

const BAND_LABELS: Record<VisitBand, TranslationKey> = {
  first: "statsBandFirst",
  second: "statsBandSecond",
  few: "statsBandFew",
  regular: "statsBandRegular",
};

// First-timers in the "new" colour of the period view, then one blue that
// deepens with the visits, so the eye reads newcomers against regulars.
const BAND_COLORS: Record<VisitBand, string> = {
  first: "var(--chart-1)",
  second: "color-mix(in oklab, var(--chart-2) 50%, var(--card))",
  few: "color-mix(in oklab, var(--chart-2) 75%, var(--card))",
  regular: "var(--chart-2)",
};

/** The faces ripple in one after another, but the last starts within this. */
const MAX_DELAY_MS = 700;

/** The band colour for Tailwind's arbitrary-value classes, set at runtime. */
const bandStyle = (band: VisitBand): CSSProperties =>
  ({ "--band": BAND_COLORS[band] }) as CSSProperties;

/** Who came back looks vivid; who has not, faded. The ring keeps its colour. */
const FADED = "opacity-50 grayscale";

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

/** Where the card sits over a face: centred, or flush with the face near an edge. */
type Align = "start" | "center" | "end";

type Hovered = {
  guest: NightGuest;
  band: VisitBand;
  x: number;
  y: number;
  align: Align;
};

const ALIGN_CLASS: Record<Align, string> = {
  start: "",
  center: "-translate-x-1/2",
  end: "-translate-x-full",
};

/** "Primera vez" for a first visit, else "Visita 4". */
function visitLabel(
  visit: number,
  t: (key: TranslationKey) => string,
  lang: string,
): string {
  return visit === 1
    ? t("statsBandFirst")
    : t("statsVisitNumber").replace("{0}", formatCount(visit, lang));
}

function GuestTooltip({ hovered }: { hovered: Hovered }) {
  const { t, lang } = useLanguage();
  const { guest, band, x, y, align } = hovered;
  return (
    <div
      className={cn(
        // w-max: an absolute box is otherwise only as wide as the room to
        // its right, and would wrap word by word near the edge.
        "pointer-events-none absolute z-10 w-max max-w-64 -translate-y-full pb-2",
        ALIGN_CLASS[align],
      )}
      style={{ left: x, top: y }}
    >
      <TooltipBox>
        <p data-slot="name" className="font-medium">
          {guest.displayname}
        </p>
        <p className="flex items-center gap-1.5 text-muted-foreground">
          <span
            className="size-2 rounded-full bg-(--band)"
            style={bandStyle(band)}
          />
          <span data-slot="visit">{visitLabel(guest.visit, t, lang)}</span>
        </p>
        {guest.days_since_previous !== null && (
          <p className="text-muted-foreground">
            {t("statsSincePrevious")}:{" "}
            <span data-slot="gap" className="text-foreground">
              {formatGap(guest.days_since_previous, t)}
            </span>
          </p>
        )}
        <p data-slot="back">
          {t(guest.came_back ? "statsCameBackLater" : "statsNotBackYet")}
        </p>
      </TooltipBox>
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
  const [hovered, setHovered] = useState<Hovered | null>(null);
  const groups = groupByVisits(guests);
  const step = Math.min(18, MAX_DELAY_MS / Math.max(1, guests.length));
  // Where each row starts in the ripple, so it runs top to bottom.
  const firstIndex = groups.map((_, i) =>
    groups.slice(0, i).reduce((n, g) => n + g.guests.length, 0),
  );

  // A finger lifting also "leaves", so a tapped card stays until a tap lands
  // anywhere but a face.
  useEffect(() => {
    if (!hovered) return;
    function close(event: globalThis.PointerEvent) {
      if (!(event.target as Element).closest("[data-guest]")) setHovered(null);
    }
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [hovered]);

  function show(face: HTMLElement, guest: NightGuest, band: VisitBand) {
    const width = face.offsetParent?.clientWidth ?? 0;
    const center = face.offsetLeft + face.offsetWidth / 2;
    // Near an edge a centred card would leave the screen on a phone.
    const align: Align =
      center < width / 3
        ? "start"
        : center > (width * 2) / 3
          ? "end"
          : "center";
    setHovered({
      guest,
      band,
      x: {
        start: face.offsetLeft,
        center,
        end: face.offsetLeft + face.offsetWidth,
      }[align],
      y: face.offsetTop,
      align,
    });
  }

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
        <div
          data-crowd
          className="relative space-y-3"
          onPointerLeave={(e) => {
            if (e.pointerType !== "touch") setHovered(null);
          }}
        >
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
                    <span
                      key={guest.guest_id}
                      data-guest={guest.guest_id}
                      data-came-back={guest.came_back}
                      className="group inline-flex animate-in rounded-full ring-2 ring-(--band) transition-transform duration-150 fill-mode-both fade-in zoom-in-50 hover:scale-110 motion-reduce:animate-none"
                      style={{
                        ...bandStyle(band),
                        animationDelay: `${(firstIndex[row] + i) * step}ms`,
                      }}
                      onPointerEnter={(e) => {
                        // A finger passing over while scrolling is not a pick.
                        if (e.pointerType !== "touch") {
                          show(e.currentTarget, guest, band);
                        }
                      }}
                      // A tap on a phone shows the same card as a hover. A
                      // scroll ends in pointercancel, not pointerup.
                      onPointerUp={(e) => {
                        if (e.pointerType === "touch") {
                          show(e.currentTarget, guest, band);
                        }
                      }}
                    >
                      <GuestAvatar
                        name={guest.displayname}
                        src={guest.avatar_url}
                        className={cn(
                          "transition duration-150 group-hover:opacity-100 group-hover:grayscale-0 sm:size-10 sm:text-sm",
                          !guest.came_back && FADED,
                        )}
                      />
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
          {hovered && <GuestTooltip hovered={hovered} />}
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
