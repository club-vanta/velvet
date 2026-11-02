import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { GuestAvatar } from "@/components/GuestAvatar";
import {
  GuestTypeBadge,
  MazmoFlagBadges,
  PronounPill,
} from "@/components/GuestBadges";
import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { components } from "@/api/types";

type MeetupGuest = components["schemas"]["MeetupGuestPublic"];

/**
 * Who the guest is: avatar, name (which opens the profile), Mazmo handle,
 * pronoun, and the badges for this RSVP. `meta` is an extra line under the
 * name, in the same text column.
 */
export function GuestIdentity({
  guest: { guest, rsvp },
  onViewProfile,
  meta,
}: {
  guest: MeetupGuest;
  onViewProfile: () => void;
  meta?: ReactNode;
}) {
  const { t } = useLanguage();
  return (
    <div className="flex items-center gap-3 min-w-0">
      <GuestAvatar
        name={guest.displayname}
        src={guest.mazmo_profile?.avatar_url}
      />
      <div className="min-w-0 space-y-1">
        <div className="flex items-center gap-x-2 gap-y-1 flex-wrap">
          <button
            type="button"
            onClick={onViewProfile}
            className={cn(
              "rounded-sm text-left font-medium underline-offset-4 outline-none break-words hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50",
              guest.is_banned && "text-destructive",
            )}
            data-cy="guest-name"
          >
            {guest.displayname}
          </button>
          <span
            className="text-muted-foreground text-sm break-all"
            data-cy="guest-handle"
          >
            {guest.mazmo_handle ? `@${guest.mazmo_handle}` : t("noMazmoHandle")}
          </span>
          <PronounPill pronoun={guest.mazmo_profile?.pronoun} />
        </div>
        <div
          className="flex items-center gap-1.5 flex-wrap empty:hidden"
          data-cy="guest-badges"
        >
          <GuestTypeBadge guestType={rsvp.guest_type} />
          {rsvp.cancelled_rsvp && (
            <Badge variant="outline">{t("rsvpCancelled")}</Badge>
          )}
          {rsvp.is_walkin && (
            <Badge variant="outline">{t("walkinLabel")}</Badge>
          )}
          {guest.is_banned && (
            <Badge variant="destructive">{t("banned")}</Badge>
          )}
          <MazmoFlagBadges profile={guest.mazmo_profile} />
        </div>
        {meta}
      </div>
    </div>
  );
}
