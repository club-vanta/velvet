import { useLanguage } from "@/lib/i18n";
import { useGuestHistory } from "../api/useGuestHistory";
import { NameHistoryItem } from "./NameHistoryItem";
import {
  SectionError,
  SectionSkeleton,
  SectionTitle,
  Timeline,
} from "./ProfileSection";

/** Every name the guest has had, newest (current) first. */
export function NameHistory({
  guestId,
  headingAs,
}: {
  guestId: string;
  headingAs: "h2" | "h3";
}) {
  const { t } = useLanguage();
  const historyQ = useGuestHistory(guestId);
  const history = historyQ.data?.history;

  return (
    <section className="space-y-3" data-cy="guest-history">
      <SectionTitle as={headingAs}>{t("nameHistory")}</SectionTitle>
      {historyQ.isLoading && <SectionSkeleton />}
      {historyQ.isError && (
        <SectionError
          message={t("failedLoadHistory")}
          onRetry={() => void historyQ.refetch()}
        />
      )}
      {history?.length === 0 && (
        <p
          className="text-sm text-muted-foreground"
          data-cy="guest-history-empty"
        >
          {t("historyEmpty")}
        </p>
      )}
      {history && history.length > 0 && (
        <Timeline>
          {history.map((entry, i) => (
            <NameHistoryItem
              // The API has no row id; the timestamp plus value is unique
              // per guest in practice.
              key={`${entry.recorded_at}-${entry.displayname}`}
              entry={entry}
              isCurrent={i === 0}
            />
          ))}
        </Timeline>
      )}
    </section>
  );
}
