import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { GuestAvatar } from "@/components/GuestAvatar";
import { MazmoFlagBadges, PronounPill } from "@/components/GuestBadges";
import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { components } from "@/api/types";

type Guest = Pick<
  components["schemas"]["GuestPublic"],
  "id" | "displayname" | "mazmo_handle" | "mazmo_profile"
>;

/** Avatar, name linked to the profile, handle, pronoun, and badges. */
export function GuestIdentity({
  guest,
  isBanned = false,
}: {
  guest: Guest;
  isBanned?: boolean;
}) {
  const { t } = useLanguage();
  const profile = guest.mazmo_profile;
  const flagged =
    !!profile?.mazmo_banned ||
    !!profile?.mazmo_suspended ||
    !!profile?.mazmo_deleted;
  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      <GuestAvatar name={guest.displayname} src={profile?.avatar_url} />
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Link
            to={`/guests/${guest.id}`}
            data-cy="guest-name"
            className={cn(
              "rounded-sm font-medium break-words underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50",
              isBanned && "text-destructive",
            )}
          >
            {guest.displayname}
          </Link>
          <span
            data-cy="guest-handle"
            className="text-sm break-all text-muted-foreground"
          >
            {guest.mazmo_handle ? `@${guest.mazmo_handle}` : t("noMazmoHandle")}
          </span>
          <PronounPill pronoun={profile?.pronoun} />
        </div>
        {(isBanned || flagged) && (
          <div className="flex flex-wrap items-center gap-1.5">
            {isBanned && (
              <Badge variant="destructive" data-cy="guest-badge-vanted">
                {t("banned")}
              </Badge>
            )}
            <MazmoFlagBadges profile={profile} />
          </div>
        )}
      </div>
    </div>
  );
}
