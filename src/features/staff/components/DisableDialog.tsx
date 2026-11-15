import { ReasonDialog } from "@/components/ReasonDialog";
import type { components } from "@/api/types";
import { useLanguage } from "@/lib/i18n";
import { useDisableStaff } from "../api/useStaffMutations";

type User = components["schemas"]["UserPublic"];

/** Disables `user` with a reason, which the backend keeps on the account. */
export function DisableDialog({
  user,
  onClose,
}: {
  user: User;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const disable = useDisableStaff();

  return (
    <ReasonDialog
      title={t("disableDialogTitle").replace("{0}", user.username)}
      placeholder={t("disableReasonPlaceholder")}
      confirmLabel={t("disableAccount")}
      pendingLabel={t("disabling")}
      isPending={disable.isPending}
      onConfirm={(reason) =>
        disable.mutate({ user, reason }, { onSuccess: onClose })
      }
      onClose={onClose}
    />
  );
}
