import { ReasonDialog } from "@/components/ReasonDialog";
import { useLanguage } from "@/lib/i18n";
import { useBanGuest } from "../api/useBanGuest";

/** Asks for the reason of a vant (5 to 500 characters) and sends it. */
export function BanDialog({
  guest,
  orgId,
  onClose,
}: {
  guest: { id: string; displayname: string };
  orgId: string;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const mutation = useBanGuest(orgId);

  return (
    <ReasonDialog
      title={t("banDialogTitle").replace("{0}", guest.displayname)}
      placeholder={t("banReasonPlaceholder")}
      confirmLabel={t("banGuest")}
      pendingLabel={t("banning")}
      isPending={mutation.isPending}
      onConfirm={(reason) =>
        mutation.mutate({ guest, reason }, { onSuccess: onClose })
      }
      onClose={onClose}
    />
  );
}
