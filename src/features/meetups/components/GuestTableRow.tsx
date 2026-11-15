import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { formatDateTime, ordinal } from "@/lib/format";
import { useLanguage } from "@/lib/i18n";
import type { components } from "@/api/types";
import type { GuestRowContext } from "../lib/guestRow";
import { CheckInButton } from "./CheckInButton";
import { CheckInStatus } from "./CheckInStatus";
import { GuestIdentity } from "./GuestIdentity";
import { GuestRowActions } from "./GuestRowActions";
import { MarkPaidButton } from "./MarkPaidButton";
import { PaymentStatus } from "./PaymentStatus";

type MeetupGuest = components["schemas"]["MeetupGuestPublic"];

/** One guest of the list on wide screens. */
export function GuestTableRow({
  guest,
  ctx,
}: {
  guest: MeetupGuest;
  ctx: GuestRowContext;
}) {
  const { t } = useLanguage();
  const { rsvp } = guest;
  return (
    <TableRow
      className={rsvp.cancelled_rsvp ? "opacity-50" : ""}
      data-cy={`guest-row-${guest.guest.id}`}
    >
      <TableCell
        className="text-muted-foreground text-sm"
        data-cy="guest-arrival-order"
      >
        {rsvp.arrival_order != null ? (
          <Badge variant="secondary">{ordinal(rsvp.arrival_order)}</Badge>
        ) : (
          "—"
        )}
      </TableCell>
      <TableCell>
        <GuestIdentity
          guest={guest}
          onViewProfile={() => ctx.onViewProfile(guest)}
        />
      </TableCell>
      <TableCell
        className="text-muted-foreground text-sm"
        data-cy="guest-rsvp-time"
      >
        {formatDateTime(rsvp.rsvp_time)}
      </TableCell>
      <TableCell data-cy="guest-check-in-status">
        <CheckInStatus guest={guest} />
      </TableCell>
      {ctx.requiresPayment && (
        <TableCell data-cy="guest-payment-status">
          <div className="flex flex-wrap items-center gap-2">
            <PaymentStatus
              guest={guest}
              isOrgAdmin={ctx.isOrgAdmin}
              onUndoPayment={() => ctx.onUndoPayment(guest)}
            />
            <MarkPaidButton guest={guest} ctx={ctx} />
          </div>
        </TableCell>
      )}
      <TableCell>
        <div className="flex items-center justify-end gap-1">
          {rsvp.has_arrived ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => ctx.onUndoCheckIn(guest)}
              data-cy="guest-undo-check-in"
            >
              {t("undo")}
            </Button>
          ) : (
            <CheckInButton guest={guest} ctx={ctx} />
          )}
          <GuestRowActions guest={guest} ctx={ctx} />
        </div>
      </TableCell>
    </TableRow>
  );
}
