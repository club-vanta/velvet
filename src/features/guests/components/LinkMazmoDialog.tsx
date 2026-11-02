import { useState } from "react";
import { InputWithPrefix } from "@/components/ui/input-with-prefix";
import { useLanguage } from "@/lib/i18n";
import { useLinkMazmo } from "../api/useMazmoLink";
import { DialogField } from "./DialogField";
import { GuestActionDialog } from "./GuestActionDialog";

export function LinkMazmoDialog({
  guest,
  onClose,
}: {
  guest: { id: string };
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const [username, setUsername] = useState("");
  const mutation = useLinkMazmo(guest.id);

  return (
    <GuestActionDialog
      data-cy="link-mazmo-dialog"
      title={t("linkMazmoDialogTitle")}
      confirmLabel={t("link")}
      pendingLabel={t("linking")}
      isPending={mutation.isPending}
      canConfirm={!!username.trim()}
      onConfirm={() => mutation.mutate(username.trim(), { onSuccess: onClose })}
      onClose={onClose}
    >
      <div className="py-2">
        <DialogField htmlFor="link-mazmo-username" label={t("mazmoUsername")}>
          <InputWithPrefix
            id="link-mazmo-username"
            data-cy="link-mazmo-username"
            prefix="@"
            placeholder="cindydark"
            autoComplete="off"
            autoCapitalize="none"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={mutation.isPending}
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
          />
        </DialogField>
      </div>
    </GuestActionDialog>
  );
}
