import type { components } from "@/api/types";
import { formatApiDate } from "@/lib/format";
import { useLanguage } from "@/lib/i18n";
import { ChartTextTable } from "./ChartTextTable";
import { Face } from "./CrowdFace";
import { useFaceCard } from "./useFaceCard";
import { formatCount, NO_VALUE } from "./statsFormat";

type Night = components["schemas"]["RetentionNightPublic"];

/** Each row's faces ripple in a little after the row before. */
const ROW_DELAY_MS = 120;
const FACE_DELAY_MS = 25;

/**
 * The events after the night, one per row, each with how many of that night's
 * people came and their faces. A row counts only that event, so anyone can
 * read it without adding up the rows before.
 */
export function NightAfterwards({
  night,
  labelledBy,
}: {
  night: Night;
  labelledBy: string;
}) {
  const { t, lang } = useLanguage();
  const { show, card, containerProps } = useFaceCard({ showBack: false });
  const byId = new Map(night.guests.map((g) => [g.guest_id, g]));
  const total = night.guests.length;
  const rows = night.afterwards.map((meetup) => ({
    meetup,
    // The night lists every id the backend sends here.
    faces: meetup.guest_ids.flatMap((id) => byId.get(id) ?? []),
  }));

  function cameLine(count: number): string {
    if (count === 0) return t("statsAfterwardsNobody");
    if (count === total) return t("statsAfterwardsEveryone");
    // Spanish needs "Vino 1" against "Vinieron 2"; English reads the same.
    return t(count === 1 ? "statsAfterwardsCameOne" : "statsAfterwardsCame")
      .replace("{0}", formatCount(count, lang))
      .replace("{1}", formatCount(total, lang));
  }

  return (
    <>
      <div aria-hidden data-afterwards className="relative" {...containerProps}>
        <ol className="divide-y">
          {rows.map(({ meetup, faces }, row) => (
            <li
              key={meetup.meetup_id}
              data-meetup={meetup.meetup_id}
              className="space-y-2 py-3 first:pt-0 last:pb-0"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <p data-slot="event" className="text-sm font-medium">
                  {meetup.name}
                </p>
                <p
                  data-slot="date"
                  className="text-xs text-muted-foreground tabular-nums"
                >
                  {formatApiDate(meetup.date)}
                </p>
              </div>
              <p data-slot="came" className="text-xs text-muted-foreground">
                {cameLine(faces.length)}
              </p>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full origin-left animate-bar-grow rounded-full bg-foreground/70 motion-reduce:animate-none"
                  style={{
                    width: `${total === 0 ? 0 : (faces.length / total) * 100}%`,
                    animationDelay: `${row * ROW_DELAY_MS}ms`,
                  }}
                />
              </div>
              {faces.length > 0 && (
                <div className="flex flex-wrap gap-2.5">
                  {faces.map((guest, i) => (
                    <Face
                      key={guest.guest_id}
                      guest={guest}
                      faded={false}
                      delayMs={row * ROW_DELAY_MS + i * FACE_DELAY_MS}
                      onShow={show}
                    />
                  ))}
                </div>
              )}
            </li>
          ))}
        </ol>
        {card}
      </div>
      <ChartTextTable
        labelledBy={labelledBy}
        headers={[
          t("statsEventHeader"),
          t("statsDateHeader"),
          t("statsAfterwardsCameHeader"),
          t("statsAfterwardsWhoHeader"),
        ]}
        rows={rows.map(({ meetup, faces }) => ({
          key: meetup.meetup_id,
          cells: [
            meetup.name,
            formatApiDate(meetup.date),
            formatCount(faces.length, lang),
            faces.length === 0
              ? NO_VALUE
              : faces.map((g) => g.displayname).join(", "),
          ],
        }))}
      />
    </>
  );
}
