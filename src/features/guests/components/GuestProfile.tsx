import { useBannedGuests } from "@/domain/guest";
import type { components } from "@/api/types";
import { GuestNotFoundError, useGuest } from "../api/useGuest";
import { GuestMeetups } from "./GuestMeetups";
import { GuestProfileSkeleton } from "./GuestProfileSkeleton";
import { GuestProfileUnavailable } from "./GuestProfileUnavailable";
import { IdentityCard } from "./IdentityCard";
import { MazmoFlagAlerts } from "./MazmoFlagAlerts";
import { NameHistory } from "./NameHistory";
import { VantAlert } from "./VantAlert";
import { VantStatusError } from "./VantStatusError";

type Guest = components["schemas"]["GuestPublic"];
type BannedGuest = components["schemas"]["BannedGuestPublic"];

/**
 * Everything known about a guest: identity, org vant status, Mazmo's own
 * account flags, the Mazmo profile snapshot, the displayname history, and
 * the meetups of this org the guest signed up for.
 *
 * Rendered both as the /guests/:guestId page and inside a side sheet on the
 * meetup page, so the heading level and the actions are passed in.
 *
 * Actions get `banKnown`: until the org's vanted list has loaded, `ban`
 * being undefined does not mean the guest is not vanted.
 */
export function GuestProfile({
  guestId,
  orgId,
  orgName,
  titleAs: Title = "h1",
  knownBanned = false,
  actions,
}: {
  guestId: string;
  orgId: string;
  orgName?: string;
  titleAs?: "h1" | "h2";
  // Vant state already known by the caller (the meetup list has it), shown
  // while the vanted list is loading or if it fails.
  knownBanned?: boolean;
  actions?: (
    guest: Guest,
    ban: BannedGuest | undefined,
    banKnown: boolean,
  ) => React.ReactNode;
}) {
  const sectionAs = Title === "h1" ? "h2" : "h3";
  const guestQ = useGuest(guestId);
  // Same key as the Vanted tab, so the list is shared from cache.
  const bannedQ = useBannedGuests(orgId);

  if (guestQ.isLoading) return <GuestProfileSkeleton />;

  if (guestQ.isError || !guestQ.data) {
    return (
      <GuestProfileUnavailable
        Title={Title}
        notFound={guestQ.error instanceof GuestNotFoundError}
        onRetry={() => void guestQ.refetch()}
      />
    );
  }

  const guest = guestQ.data;
  const banKnown = bannedQ.isSuccess;
  const ban = bannedQ.data?.guests.find((g) => g.id === guest.id);

  return (
    <div className="@container space-y-6" data-cy="guest-profile">
      <IdentityCard
        guest={guest}
        Title={Title}
        detailsAs={sectionAs}
        showBanned={banKnown ? !!ban : knownBanned}
      />
      {actions && (
        <div className="flex flex-wrap gap-2">
          {actions(guest, ban, banKnown)}
        </div>
      )}
      {ban && <VantAlert ban={ban} orgName={orgName} />}
      {bannedQ.isError && (
        <VantStatusError onRetry={() => void bannedQ.refetch()} />
      )}
      <MazmoFlagAlerts profile={guest.mazmo_profile} />
      <NameHistory guestId={guest.id} headingAs={sectionAs} />
      <GuestMeetups guestId={guest.id} orgId={orgId} headingAs={sectionAs} />
    </div>
  );
}
