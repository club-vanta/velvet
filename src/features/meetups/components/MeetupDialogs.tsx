import type { components } from "@/api/types";
import type { MeetupDialog } from "../hooks/useMeetupDialogs";
import { CheckInBannedDialog } from "./CheckInBannedDialog";
import { FinalizeMeetupDialog } from "./FinalizeMeetupDialog";
import { MarkPaidDialog } from "./MarkPaidDialog";
import { PaymentRequirementDialog } from "./PaymentRequirementDialog";
import { UndoCheckInDialog } from "./UndoCheckInDialog";
import { UndoPaymentDialog } from "./UndoPaymentDialog";
import { WalkinDialog } from "./WalkinDialog";

type Meetup = components["schemas"]["MeetupPublic"];

/** Renders the meetup page's open dialog, if any. */
export function MeetupDialogs({
  dialog,
  orgId,
  meetupId,
  meetup,
  rsvpedIds,
  onClose,
}: {
  dialog: MeetupDialog | null;
  orgId: string;
  meetupId: string;
  /**
   * Undefined until the meetup loads. The guest dialogs work without it;
   * the meetup-wide ones open from the header, which needs it anyway.
   */
  meetup: Meetup | undefined;
  /** Guests already on the list, whom the walk-in picker leaves out. */
  rsvpedIds: Set<string>;
  onClose: () => void;
}) {
  if (!dialog) return null;
  const props = { orgId, meetupId, onClose };
  switch (dialog.kind) {
    case "undoCheckIn":
      return <UndoCheckInDialog {...props} guest={dialog.guest} />;
    case "checkInBanned":
      return <CheckInBannedDialog {...props} guest={dialog.guest} />;
    case "markPaid":
      return <MarkPaidDialog {...props} guest={dialog.guest} />;
    case "undoPayment":
      return <UndoPaymentDialog {...props} guest={dialog.guest} />;
    case "walkin":
      return <WalkinDialog {...props} alreadyRsvped={rsvpedIds} />;
    case "paymentRequirement":
      return (
        <PaymentRequirementDialog
          {...props}
          enabling={!meetup?.requires_payment}
        />
      );
    case "finalize":
      return (
        meetup && (
          <FinalizeMeetupDialog
            orgId={orgId}
            meetup={meetup}
            onClose={onClose}
          />
        )
      );
  }
}
