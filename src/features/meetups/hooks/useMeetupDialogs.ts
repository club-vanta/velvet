import { useState } from "react";
import type { components } from "@/api/types";

type MeetupGuest = components["schemas"]["MeetupGuestPublic"];

/** The one dialog the meetup page has open, and the guest it is about. */
export type MeetupDialog =
  | {
      kind: "undoCheckIn" | "checkInBanned" | "markPaid" | "undoPayment";
      guest: MeetupGuest;
    }
  | { kind: "walkin" | "finalize" }
  // Fixed when the dialog opens: the meetup refetches in the background, and
  // the dialog must not flip to the opposite action under the admin's click.
  | { kind: "paymentRequirement"; enabling: boolean };

/** Dialogs are modal, so the page has at most one open at a time. */
export function useMeetupDialogs() {
  const [dialog, setDialog] = useState<MeetupDialog | null>(null);
  return { dialog, open: setDialog, close: () => setDialog(null) };
}
