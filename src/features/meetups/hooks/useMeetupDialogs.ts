import { useState } from "react";
import type { components } from "@/api/types";

type MeetupGuest = components["schemas"]["MeetupGuestPublic"];

/** The one dialog the meetup page has open, and the guest it is about. */
export type MeetupDialog =
  | {
      kind: "undoCheckIn" | "checkInBanned" | "markPaid" | "undoPayment";
      guest: MeetupGuest;
    }
  | { kind: "walkin" | "paymentRequirement" | "finalize" };

/** Dialogs are modal, so the page has at most one open at a time. */
export function useMeetupDialogs() {
  const [dialog, setDialog] = useState<MeetupDialog | null>(null);
  return { dialog, open: setDialog, close: () => setDialog(null) };
}
