import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";
import type { components } from "@/api/types";
import { canMarkPaid, type GuestRowContext } from "../lib/guestRow";

type MeetupGuest = components["schemas"]["MeetupGuestPublic"];

/**
 * "Mark paid", or nothing when there is no fee to collect from this guest or
 * the backend would refuse it (a finalized meetup, a viewer who is not an
 * admin).
 */
export function MarkPaidButton({
  guest,
  ctx,
}: {
  guest: MeetupGuest;
  ctx: GuestRowContext;
}) {
  const { t } = useLanguage();
  if (!canMarkPaid(guest, ctx)) return null;
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => ctx.onMarkPaid(guest)}
      data-cy="guest-mark-paid"
    >
      {t("markPaid")}
    </Button>
  );
}
