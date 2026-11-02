import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/lib/i18n";
import { useBanGuest } from "../api/useBanGuest";
import { GuestActionDialog } from "./GuestActionDialog";

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
  const [reason, setReason] = useState("");
  const mutation = useBanGuest(orgId);
  const length = reason.trim().length;

  return (
    <GuestActionDialog
      data-cy="ban-guest-dialog"
      title={t("banDialogTitle").replace("{0}", guest.displayname)}
      confirmLabel={t("banGuest")}
      pendingLabel={t("banning")}
      isPending={mutation.isPending}
      canConfirm={length >= 5 && length <= 500}
      destructive
      onConfirm={() =>
        mutation.mutate({ guest, reason }, { onSuccess: onClose })
      }
      onClose={onClose}
    >
      <div className="space-y-2 py-2">
        <label htmlFor="ban-reason" className="text-sm font-medium">
          {t("reasonRequired")}
        </label>
        <Textarea
          id="ban-reason"
          placeholder={t("banReasonPlaceholder")}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
        />
        <p className="text-xs text-muted-foreground">{length}/500</p>
      </div>
    </GuestActionDialog>
  );
}
