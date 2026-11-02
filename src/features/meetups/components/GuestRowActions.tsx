import { useId } from "react";
import { toast } from "sonner";
import { MoreHorizontal, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage } from "@/lib/i18n";
import {
  GUEST_TYPES,
  GUEST_TYPE_DESCRIPTION,
  GUEST_TYPE_LABEL,
  isGuestType,
} from "@/domain/guest";
import type { components } from "@/api/types";
import { useSetGuestType } from "../api/useSetGuestType";
import type { GuestRowContext } from "../lib/guestRow";

type MeetupGuest = components["schemas"]["MeetupGuestPublic"];

/**
 * The "…" menu of a guest row: the profile for everyone, and the guest type
 * for admins. A finalized meetup keeps the types visible but locked, with
 * the reason announced alongside.
 */
export function GuestRowActions({
  guest,
  ctx,
}: {
  guest: MeetupGuest;
  ctx: GuestRowContext;
}) {
  const { t } = useLanguage();
  const lockedHintId = useId();
  const setType = useSetGuestType(ctx.orgId, ctx.meetupId);
  const currentType = guest.rsvp.guest_type;
  const typeLocked = ctx.isFinalized || setType.isPending;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            aria-label={`${t("guestActions")}: ${guest.guest.displayname}`}
            data-cy="guest-actions"
          />
        }
      >
        <MoreHorizontal className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-64"
        data-cy="guest-actions-menu"
      >
        <DropdownMenuItem onClick={() => ctx.onViewProfile(guest)}>
          <UserRound />
          {t("viewProfile")}
        </DropdownMenuItem>
        {ctx.isOrgAdmin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel>{t("guestType")}</DropdownMenuLabel>
              {/* Base UI's GroupLabel only labels the outer Group, so the
                  radio group gets its own accessible name. */}
              <DropdownMenuRadioGroup
                aria-label={t("guestType")}
                aria-describedby={ctx.isFinalized ? lockedHintId : undefined}
                value={currentType}
                onValueChange={(value: string) => {
                  if (!isGuestType(value) || value === currentType) return;
                  setType.mutate(
                    { guestId: guest.guest.id, guestType: value },
                    {
                      onSuccess: (data) =>
                        toast.success(
                          t("guestTypeChanged")
                            .replace("{0}", data.guest.displayname)
                            .replace("{1}", t(GUEST_TYPE_LABEL[value])),
                        ),
                      onError: (err) => toast.error(err.message),
                    },
                  );
                }}
              >
                {GUEST_TYPES.map((type) => (
                  <DropdownMenuRadioItem
                    key={type}
                    value={type}
                    disabled={typeLocked}
                    closeOnClick
                  >
                    <span className="flex flex-col gap-0.5">
                      <span>{t(GUEST_TYPE_LABEL[type])}</span>
                      <span className="text-xs text-muted-foreground">
                        {t(GUEST_TYPE_DESCRIPTION[type])}
                      </span>
                    </span>
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
              {ctx.isFinalized && (
                <p
                  id={lockedHintId}
                  className="px-1.5 py-1 text-xs text-muted-foreground"
                >
                  {t("guestTypeLockedFinalized")}
                </p>
              )}
            </DropdownMenuGroup>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
