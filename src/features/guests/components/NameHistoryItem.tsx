import { Badge } from "@/components/ui/badge";
import { formatFullDateTime } from "@/lib/format";
import { useLanguage, type TranslationKey } from "@/lib/i18n";
import type { components } from "@/api/types";
import { TimelineItem } from "./ProfileSection";

type HistoryEntry = components["schemas"]["GuestDisplaynameHistoryPublic"];

const SOURCE_LABEL: Record<string, TranslationKey> = {
  SYNC: "historySourceSync",
  MANUAL_EDIT: "historySourceManual",
  MAZMO_LINK: "historySourceMazmoLink",
  BACKFILL: "historySourceBackfill",
};

/** One name the guest had: where it came from, who set it, and when. */
export function NameHistoryItem({
  entry,
  isCurrent,
}: {
  entry: HistoryEntry;
  isCurrent: boolean;
}) {
  const { t } = useLanguage();
  const sourceKey = Object.hasOwn(SOURCE_LABEL, entry.source)
    ? SOURCE_LABEL[entry.source]
    : undefined;
  const meta = [
    sourceKey ? t(sourceKey) : entry.source,
    entry.actor
      ? t("historyByActor").replace("{0}", entry.actor.username)
      : null,
    formatFullDateTime(entry.recorded_at),
  ].filter(Boolean);

  return (
    <TimelineItem
      marker={isCurrent ? "filled" : "hollow"}
      data-cy="history-item"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium break-words" data-cy="history-name">
          {entry.displayname}
        </span>
        {isCurrent && (
          <Badge variant="secondary" data-cy="history-current">
            {t("historyCurrent")}
          </Badge>
        )}
      </div>
      <p className="text-xs text-muted-foreground" data-cy="history-meta">
        {meta.join(" · ")}
      </p>
      {entry.source === "BACKFILL" && (
        <p
          className="mt-1 text-xs text-muted-foreground/80"
          data-cy="history-backfill-hint"
        >
          {t("historyBackfillHint")}
        </p>
      )}
    </TimelineItem>
  );
}
