import { Badge } from "@/components/ui/badge";
import { GuestAvatar } from "@/components/GuestAvatar";
import { MazmoFlagBadges } from "@/components/GuestBadges";
import { MAZMO_PRONOUN_SHORT, mazmoLabel } from "@/domain/guest";
import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { components } from "@/api/types";
import { ProfileBackdrop } from "./ProfileBackdrop";
import { ProfileFacts } from "./ProfileFacts";
import { ProfileHandle } from "./ProfileHandle";
import { ProfileIds } from "./ProfileIds";

type Guest = components["schemas"]["GuestPublic"];

/** The top card of a profile: who the guest is and what Mazmo says. */
export function IdentityCard({
  guest,
  Title,
  detailsAs: DetailsHeading,
  showBanned,
}: {
  guest: Guest;
  Title: "h1" | "h2";
  detailsAs: "h2" | "h3";
  showBanned: boolean;
}) {
  const { t } = useLanguage();
  const profile = guest.mazmo_profile;
  const mazmoFlagged = !!profile?.mazmo_banned || !!profile?.mazmo_suspended;
  const mazmoDeleted = !!profile?.mazmo_deleted;

  // The ring repeats the status badges in the one place the eye lands
  // first: red for an org vant, orange for Mazmo's own flags.
  const ringClass = showBanned
    ? "ring-destructive"
    : mazmoFlagged
      ? "ring-orange-500"
      : "ring-border";

  return (
    <section className="relative isolate overflow-hidden rounded-xl border bg-card text-card-foreground">
      <ProfileBackdrop src={profile?.avatar_url} />

      <div className="flex flex-col items-start gap-4 px-4 pt-6 pb-5 @md:flex-row @md:items-center @md:gap-6 @md:px-6 @md:pt-8">
        <GuestAvatar
          name={guest.displayname}
          src={profile?.avatar_url}
          size="lg"
          alt={t("avatarOf").replace("{0}", guest.displayname)}
          className={cn(
            "ring-2 ring-offset-4 ring-offset-card @md:size-24 @md:text-3xl",
            ringClass,
          )}
        />
        <div className="min-w-0 space-y-2">
          <Title
            data-cy="guest-profile-name"
            className="text-2xl leading-tight font-semibold tracking-tight break-words @md:text-3xl"
          >
            {guest.displayname}
          </Title>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-muted-foreground">
            <ProfileHandle guest={guest} />
            {profile?.pronoun && (
              <span
                data-cy="guest-profile-pronoun"
                className="rounded-full border border-foreground/15 bg-background/40 px-2.5 py-0.5 text-xs font-medium text-foreground"
              >
                {mazmoLabel(MAZMO_PRONOUN_SHORT, profile.pronoun, t)}
              </span>
            )}
          </div>
          {(showBanned || mazmoFlagged || mazmoDeleted) && (
            <div className="flex flex-wrap gap-1.5">
              {showBanned && (
                <Badge variant="destructive" data-cy="guest-badge-vanted">
                  {t("banned")}
                </Badge>
              )}
              <MazmoFlagBadges profile={profile} />
            </div>
          )}
        </div>
      </div>

      <DetailsHeading className="sr-only">{t("guestDetails")}</DetailsHeading>
      <ProfileFacts guest={guest} />
      <ProfileIds guest={guest} />
    </section>
  );
}
