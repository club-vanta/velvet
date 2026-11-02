import { useLanguage } from "@/lib/i18n";
import type { components } from "@/api/types";
import { useUnlinkMazmo } from "../api/useMazmoLink";
import { GuestActionDialog } from "./GuestActionDialog";

type Guest = Pick<
  components["schemas"]["GuestPublic"],
  "id" | "displayname" | "mazmo_handle"
>;

export function UnlinkMazmoDialog({
  guest,
  onClose,
}: {
  guest: Guest;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const mutation = useUnlinkMazmo(guest.id);

  return (
    <GuestActionDialog
      data-cy="unlink-mazmo-dialog"
      title={t("unlinkMazmoDialogTitle")}
      confirmLabel={t("unlink")}
      pendingLabel={t("unlinking")}
      isPending={mutation.isPending}
      canConfirm
      destructive
      onConfirm={() => mutation.mutate(undefined, { onSuccess: onClose })}
      onClose={onClose}
    >
      <p className="py-2 text-sm text-muted-foreground">
        {t("unlinkMazmoDialogBody")}{" "}
        <span className="font-medium text-foreground">{guest.displayname}</span>{" "}
        (@{guest.mazmo_handle}).
      </p>
    </GuestActionDialog>
  );
}
