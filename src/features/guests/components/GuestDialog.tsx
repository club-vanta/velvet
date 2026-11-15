import type { components } from "@/api/types";
import type { GuestDialogKind } from "../lib/guestActions";
import { BanDialog } from "./BanDialog";
import { EditGuestDialog } from "./EditGuestDialog";
import { LinkMazmoDialog } from "./LinkMazmoDialog";
import { UnlinkMazmoDialog } from "./UnlinkMazmoDialog";

type Guest = components["schemas"]["GuestPublic"];

export type OpenGuestDialog = { kind: GuestDialogKind; guest: Guest };

/** The dialog a guest action opened, or nothing. */
export function GuestDialog({
  dialog,
  orgId,
  onClose,
}: {
  dialog: OpenGuestDialog | null;
  orgId: string;
  onClose: () => void;
}) {
  switch (dialog?.kind) {
    case "edit":
      return <EditGuestDialog guest={dialog.guest} onClose={onClose} />;
    case "link":
      return <LinkMazmoDialog guest={dialog.guest} onClose={onClose} />;
    case "unlink":
      return <UnlinkMazmoDialog guest={dialog.guest} onClose={onClose} />;
    case "ban":
      return <BanDialog guest={dialog.guest} orgId={orgId} onClose={onClose} />;
    case undefined:
      return null;
  }
}
