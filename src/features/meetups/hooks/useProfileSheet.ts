import { useState } from "react";
import type { components } from "@/api/types";

type MeetupGuest = components["schemas"]["MeetupGuestPublic"];

/**
 * The guest whose profile sheet is open. The guest is kept after the sheet
 * closes so its content stays put during the slide-out animation; `open`
 * drives visibility.
 */
export function useProfileSheet() {
  const [guest, setGuest] = useState<MeetupGuest | null>(null);
  const [open, setOpen] = useState(false);
  return {
    guest,
    open,
    setOpen,
    show: (next: MeetupGuest) => {
      setGuest(next);
      setOpen(true);
    },
  };
}
