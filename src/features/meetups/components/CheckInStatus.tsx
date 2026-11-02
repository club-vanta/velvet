import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/format";
import { useLanguage } from "@/lib/i18n";
import type { components } from "@/api/types";

type MeetupGuest = components["schemas"]["MeetupGuestPublic"];

/** Whether the guest is in, and since when: the table's status cell. */
export function CheckInStatus({ guest }: { guest: MeetupGuest }) {
  const { t } = useLanguage();
  const { has_arrived, arrival_time } = guest.rsvp;

  if (!has_arrived) return <Badge variant="secondary">{t("pending")}</Badge>;

  return (
    <div className="flex flex-col items-start gap-0.5">
      <Badge>{t("checkedIn")}</Badge>
      {arrival_time && (
        <p className="text-xs text-muted-foreground">
          {formatDateTime(arrival_time)}
        </p>
      )}
    </div>
  );
}
