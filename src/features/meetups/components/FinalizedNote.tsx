import { Lock } from "lucide-react";
import { formatDateTime } from "@/lib/format";
import { useLanguage } from "@/lib/i18n";

/** Says the door is closed, in place of the door tools of a finalized meetup. */
export function FinalizedNote({ finalizedAt }: { finalizedAt: string | null }) {
  const { t } = useLanguage();
  return (
    <div
      className="flex min-w-0 flex-1 basis-full items-start gap-2 text-sm @md:basis-0"
      data-cy="meetup-finalized-note"
    >
      <Lock
        className="mt-0.5 size-4 shrink-0 text-muted-foreground"
        aria-hidden="true"
      />
      <p className="min-w-0">
        {/* With no date, the Finalized badge above already says it. */}
        {finalizedAt && (
          <>
            <span className="font-medium" data-cy="meetup-finalized-on">
              {t("finalizedOn").replace("{0}", formatDateTime(finalizedAt))}
            </span>{" "}
          </>
        )}
        <span className="text-muted-foreground">
          {t("finalizedLockedHint")}
        </span>
      </p>
    </div>
  );
}
