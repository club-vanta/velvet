import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useSyncMeetup } from "../api/useSyncMeetup";

/** Loads the meetup's RSVPs from Mazmo and says how many were new. */
export function SyncButton({
  orgId,
  meetupId,
}: {
  orgId: string;
  meetupId: string;
}) {
  const { t } = useLanguage();
  const sync = useSyncMeetup(orgId, meetupId);

  return (
    <Button
      variant="outline"
      onClick={() =>
        sync.mutate(undefined, {
          onSuccess: (data) =>
            toast.success(
              t("syncDoneToast")
                .replace("{0}", String(data.inserted))
                .replace("{1}", String(data.skipped)),
            ),
          onError: (err) => toast.error(err.message),
        })
      }
      disabled={sync.isPending}
      className="gap-2"
      data-cy="meetup-sync"
    >
      <RefreshCw
        className={cn(sync.isPending && "animate-spin")}
        aria-hidden="true"
      />
      {t("syncFromMazmo")}
    </Button>
  );
}
