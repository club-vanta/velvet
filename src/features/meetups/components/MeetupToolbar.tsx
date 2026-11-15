import { Banknote, Lock, LockOpen, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { components } from "@/api/types";
import { FinalizedNote } from "./FinalizedNote";
import { SyncButton } from "./SyncButton";

type Meetup = components["schemas"]["MeetupPublic"];

/**
 * The meetup's tools, in a band of their own like the footer of the guest
 * profile card. On phones the buttons stack centered at one width. On medium
 * cards they fill an even two-column grid, so four tools never wrap three
 * and one; once all of them fit they sit in one row from the left. Once
 * finalized the door tools are gone and the band says so, rather than
 * showing dead buttons.
 */
export function MeetupToolbar({
  orgId,
  meetup,
  isOrgAdmin,
  onAddWalkin,
  onTogglePayment,
  onFinalize,
}: {
  orgId: string;
  meetup: Meetup;
  isOrgAdmin: boolean;
  onAddWalkin: () => void;
  onTogglePayment: () => void;
  /** Finalizes the meetup, or reopens a finalized one. */
  onFinalize: () => void;
}) {
  const { t } = useLanguage();
  const { is_finalized: isFinalized, requires_payment: requiresPayment } =
    meetup;

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2 border-t bg-muted/30 px-4 py-3 @md:px-6 [&>button]:w-full [&>button]:max-w-72 @md:[&>button]:max-w-none",
        isFinalized
          ? "@md:flex-row @md:flex-wrap @md:[&>button]:w-auto"
          : "@md:grid @md:grid-cols-2 @4xl:flex @4xl:flex-row @4xl:[&>button]:w-auto",
      )}
      data-cy="meetup-toolbar"
    >
      {isFinalized ? (
        <FinalizedNote finalizedAt={meetup.finalized_at} />
      ) : (
        <>
          <SyncButton orgId={orgId} meetupId={meetup.id} />
          <Button
            variant="outline"
            onClick={onAddWalkin}
            className="gap-2"
            data-cy="meetup-add-walkin"
          >
            <UserPlus aria-hidden="true" />
            {t("addWalkin")}
          </Button>
        </>
      )}
      {isOrgAdmin && (
        <>
          {!isFinalized && (
            <Button
              variant="outline"
              onClick={onTogglePayment}
              className="gap-2"
              data-cy="meetup-payment-toggle"
            >
              <Banknote aria-hidden="true" />
              {requiresPayment ? t("disablePayment") : t("enablePayment")}
            </Button>
          )}
          <Button
            variant="outline"
            onClick={onFinalize}
            className="gap-2"
            data-cy="meetup-finalize"
          >
            {isFinalized ? (
              <LockOpen aria-hidden="true" />
            ) : (
              <Lock aria-hidden="true" />
            )}
            {isFinalized ? t("reopenMeetup") : t("finalizeMeetup")}
          </Button>
        </>
      )}
    </div>
  );
}
