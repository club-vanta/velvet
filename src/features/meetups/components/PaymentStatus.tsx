import { Badge } from "@/components/ui/badge";
import { isPaymentExempt } from "@/domain/guest";
import { formatDateTime } from "@/lib/format";
import { useLanguage } from "@/lib/i18n";
import type { components } from "@/api/types";
import { InlineUndo } from "./InlineUndo";

type MeetupGuest = components["schemas"]["MeetupGuestPublic"];

/**
 * Where the guest stands with the entrance fee: the badge, when it was paid
 * and, for admins, the undo. "Mark paid" is the next step, so callers place
 * it with the other actions.
 */
export function PaymentStatus({
  guest,
  isOrgAdmin,
  onUndoPayment,
}: {
  guest: MeetupGuest;
  isOrgAdmin: boolean;
  onUndoPayment: () => void;
}) {
  const { t } = useLanguage();
  const { has_paid, paid_at, guest_type } = guest.rsvp;
  const undo = isOrgAdmin && (
    <InlineUndo onClick={onUndoPayment} data-cy="guest-undo-payment">
      {t("undoPayment")}
    </InlineUndo>
  );

  // Exempt guests never need "Mark paid", but someone who paid before being
  // reclassified keeps "Undo payment" so a refund can be recorded.
  if (isPaymentExempt(guest_type)) {
    return (
      <div className="flex flex-col items-start gap-0.5">
        <Badge variant="outline" title={t("paymentExemptHint")}>
          {t("paymentExempt")}
        </Badge>
        {has_paid && (
          <>
            <p className="text-xs text-muted-foreground">
              {t("paidBeforeExempt")}
              {paid_at ? ` · ${formatDateTime(paid_at)}` : ""}
            </p>
            {undo}
          </>
        )}
      </div>
    );
  }

  if (!has_paid)
    return <Badge variant="secondary">{t("paymentPending")}</Badge>;

  return (
    <div className="flex flex-col items-start gap-0.5">
      <Badge>{t("paid")}</Badge>
      {paid_at && (
        <p className="text-xs text-muted-foreground">
          {formatDateTime(paid_at)}
        </p>
      )}
      {undo}
    </div>
  );
}
