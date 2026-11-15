import { toast } from "sonner";
import { useLanguage } from "@/lib/i18n";
import { useSetPaymentRequirement } from "../api/useSetPaymentRequirement";
import { ConfirmDialog } from "./ConfirmDialog";

/** Confirms turning the meetup into a paid event (`enabling`) or a free one. */
export function PaymentRequirementDialog({
  orgId,
  meetupId,
  enabling,
  onClose,
}: {
  orgId: string;
  meetupId: string;
  enabling: boolean;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const setRequirement = useSetPaymentRequirement(orgId, meetupId);

  return (
    <ConfirmDialog
      data-cy="payment-requirement-dialog"
      title={
        enabling
          ? t("enablePaymentDialogTitle")
          : t("disablePaymentDialogTitle")
      }
      confirmLabel={enabling ? t("enablePayment") : t("disablePayment")}
      isPending={setRequirement.isPending}
      onConfirm={() =>
        setRequirement.mutate(enabling, {
          onSuccess: () => {
            toast.success(t("paymentRequirementUpdated"));
            onClose();
          },
          onError: (err) => toast.error(err.message),
        })
      }
      onClose={onClose}
    >
      <p className="text-sm text-muted-foreground py-2">
        {enabling
          ? t("enablePaymentDialogBody")
          : t("disablePaymentDialogBody")}
      </p>
    </ConfirmDialog>
  );
}
