import type { components } from "@/api/types";
import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { bandStyle, formatGap, visitBand, visitLabel } from "./nightCrowd";
import { TooltipBox } from "../../components/TooltipBox";

type NightGuest = components["schemas"]["NightGuestPublic"];

/** Where the card sits over a face: centred, or flush with the face near an edge. */
export type Align = "start" | "center" | "end";

export type Shown = {
  guest: NightGuest;
  x: number;
  y: number;
  align: Align;
};

const ALIGN_CLASS: Record<Align, string> = {
  start: "",
  center: "-translate-x-1/2",
  end: "-translate-x-full",
};

/**
 * The card of one face: who it is, which visit that night was, the time since
 * their previous one, and, with `showBack`, whether they came back.
 */
export function FaceCard({
  shown,
  showBack,
}: {
  shown: Shown;
  showBack: boolean;
}) {
  const { t, lang } = useLanguage();
  const { guest, x, y, align } = shown;
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
        <p data-cy="stats-face-card-name" className="font-medium">
          {guest.displayname}
        </p>
        <p className="flex items-center gap-1.5 text-muted-foreground">
          <span
            className="size-2 rounded-full bg-(--band)"
            style={bandStyle(visitBand(guest.visit))}
          />
          <span data-cy="stats-face-card-visit">
            {t("statsThatNightVisit").replace(
              "{0}",
              visitLabel(guest.visit, t, lang),
            )}
          </span>
        </p>
        {guest.days_since_previous !== null && (
          <p className="text-muted-foreground">
            {t("statsSincePrevious")}:{" "}
            <span data-cy="stats-face-card-gap" className="text-foreground">
              {formatGap(guest.days_since_previous, t)}
            </span>
          </p>
        )}
        {showBack && (
          <p data-cy="stats-face-card-back">
            {t(guest.came_back ? "statsCameBackLater" : "statsNotBackYet")}
          </p>
        )}
      </TooltipBox>
    </div>
  );
}
