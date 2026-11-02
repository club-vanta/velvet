import { useState } from "react";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/lib/i18n";
import type { components } from "@/api/types";
import { useEditGuest } from "../api/useEditGuest";
import { editGuestBody } from "../lib/editGuestBody";
import { DialogField } from "./DialogField";
import { GuestActionDialog } from "./GuestActionDialog";
import { InstagramField } from "./InstagramField";

// Only the identity fields are needed, so both GuestPublic and the
// meetup-scoped GuestWithBanPublic can be passed in.
type Guest = Pick<
  components["schemas"]["GuestPublic"],
  "id" | "displayname" | "instagram_username"
>;

export function EditGuestDialog({
  guest,
  onClose,
}: {
  guest: Guest;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const [displayname, setDisplayname] = useState(guest.displayname);
  const [instagram, setInstagram] = useState(guest.instagram_username ?? "");
  const mutation = useEditGuest(guest.id);

  return (
    <GuestActionDialog
      data-cy="edit-guest-dialog"
      title={t("editGuestDialogTitle")}
      confirmLabel={t("saveChanges")}
      pendingLabel={t("savingChanges")}
      isPending={mutation.isPending}
      canConfirm={!!displayname.trim()}
      onConfirm={() =>
        mutation.mutate(editGuestBody(guest, { displayname, instagram }), {
          onSuccess: onClose,
        })
      }
      onClose={onClose}
    >
      <div className="space-y-3 py-2">
        <DialogField htmlFor="edit-guest-displayname" label={t("displayName")}>
          <Input
            id="edit-guest-displayname"
            data-cy="edit-guest-displayname"
            value={displayname}
            onChange={(e) => setDisplayname(e.target.value)}
            disabled={mutation.isPending}
          />
        </DialogField>
        <InstagramField
          id="edit-guest-instagram"
          value={instagram}
          onChange={setInstagram}
          disabled={mutation.isPending}
        />
      </div>
    </GuestActionDialog>
  );
}
