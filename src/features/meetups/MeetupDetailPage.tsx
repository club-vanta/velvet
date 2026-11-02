import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { useIsOrgAdmin, useOrg } from "@/domain/session";
import { useLanguage } from "@/lib/i18n";
import type { components } from "@/api/types";
import { useCheckInGuest } from "./api/useCheckInGuest";
import { useMeetup } from "./api/useMeetup";
import { useMeetupGuests } from "./api/useMeetupGuests";
import { GuestList } from "./components/GuestList";
import { GuestListToolbar } from "./components/GuestListToolbar";
import { GuestProfileSheet } from "./components/GuestProfileSheet";
import { MeetupDialogs } from "./components/MeetupDialogs";
import { MeetupHeader } from "./components/MeetupHeader";
import { MeetupHeaderSkeleton } from "./components/MeetupHeaderSkeleton";
import { MeetupStats } from "./components/MeetupStats";
import { MeetupToolbar } from "./components/MeetupToolbar";
import { MeetupWeather } from "./components/MeetupWeather";
import { NoActiveOrg } from "./components/NoActiveOrg";
import { RetryAlert } from "./components/RetryAlert";
import { useGuestListView } from "./hooks/useGuestListView";
import { useMeetupDialogs } from "./hooks/useMeetupDialogs";
import { useProfileSheet } from "./hooks/useProfileSheet";
import { checkedInMessage, type GuestRowContext } from "./lib/guestRow";

type MeetupGuest = components["schemas"]["MeetupGuestPublic"];

/**
 * The door: one meetup's header and tools, its weather and stats, and the
 * guest list staff check people in from. Rendered by MeetupDetailRoute,
 * keyed by the meetup id.
 */
export function MeetupDetailPage() {
  const { t } = useLanguage();
  const { id: meetupId = "" } = useParams<{ id: string }>();
  const { activeOrg } = useOrg();
  const orgId = activeOrg?.org_id ?? "";
  const isOrgAdmin = useIsOrgAdmin();

  const meetupQ = useMeetup(orgId, meetupId);
  const guestsQ = useMeetupGuests(orgId, meetupId);
  const checkIn = useCheckInGuest(orgId, meetupId);
  const dialogs = useMeetupDialogs();
  const profile = useProfileSheet();

  const meetup = meetupQ.data;
  const requiresPayment = meetup?.requires_payment ?? false;
  const allGuests = guestsQ.data?.guests ?? [];
  const list = useGuestListView(allGuests, requiresPayment);
  const hasGuests = !guestsQ.isLoading && allGuests.length > 0;

  function checkInGuest(guest: MeetupGuest) {
    if (guest.guest.is_banned) {
      dialogs.open({ kind: "checkInBanned", guest });
      return;
    }
    checkIn.mutate(guest.guest.id, {
      onSuccess: (data) => toast.success(checkedInMessage(t, data)),
      onError: (err) => toast.error(err.message),
    });
  }

  const ctx: GuestRowContext = {
    orgId,
    meetupId,
    isOrgAdmin,
    isFinalized: meetup?.is_finalized ?? false,
    requiresPayment,
    paymentStateKnown: meetupQ.isSuccess,
    checkingInId: checkIn.isPending ? checkIn.variables : null,
    onCheckIn: checkInGuest,
    onUndoCheckIn: (guest) => dialogs.open({ kind: "undoCheckIn", guest }),
    onMarkPaid: (guest) => dialogs.open({ kind: "markPaid", guest }),
    onUndoPayment: (guest) => dialogs.open({ kind: "undoPayment", guest }),
    onViewProfile: profile.show,
  };

  if (!activeOrg) return <NoActiveOrg />;

  return (
    <div className="@container space-y-6" data-cy="meetup-page">
      {meetupQ.isLoading ? (
        <MeetupHeaderSkeleton />
      ) : meetupQ.isError || !meetup ? (
        <RetryAlert
          message={t("failedLoadMeetup")}
          onRetry={() => meetupQ.refetch()}
          data-cy="meetup-error"
        />
      ) : (
        <MeetupHeader
          orgId={orgId}
          meetup={meetup}
          canEditLocation={isOrgAdmin}
          toolbar={
            <MeetupToolbar
              orgId={orgId}
              meetup={meetup}
              isOrgAdmin={isOrgAdmin}
              onAddWalkin={() => dialogs.open({ kind: "walkin" })}
              onTogglePayment={() =>
                dialogs.open({ kind: "paymentRequirement" })
              }
              onFinalize={() => dialogs.open({ kind: "finalize" })}
            />
          }
        />
      )}

      {meetupQ.isSuccess && (
        <MeetupWeather
          orgId={orgId}
          meetupId={meetupId}
          canRefresh={isOrgAdmin}
        />
      )}

      {meetupQ.isSuccess && hasGuests && (
        <MeetupStats
          orgId={orgId}
          meetupId={meetupId}
          requiresPayment={requiresPayment}
        />
      )}

      {hasGuests && (
        <GuestListToolbar
          search={list.search}
          onSearch={list.setSearch}
          filters={list.filters}
          onFilters={list.setFilters}
          sort={list.sort}
          onSort={list.setSort}
          requiresPayment={requiresPayment}
          shown={list.shown.length}
          total={allGuests.length}
        />
      )}

      {guestsQ.isError && (
        <RetryAlert
          message={t("failedLoadGuestList")}
          onRetry={() => guestsQ.refetch()}
          data-cy="guest-list-error"
        />
      )}

      <GuestList
        guests={list.shown}
        total={allGuests.length}
        loading={guestsQ.isLoading}
        loaded={guestsQ.isSuccess}
        searching={list.search.trim() !== ""}
        ctx={ctx}
        sort={list.sort}
        onSort={list.toggleSort}
      />

      <MeetupDialogs
        dialog={dialogs.dialog}
        orgId={orgId}
        meetupId={meetupId}
        meetup={meetup}
        rsvpedIds={new Set(allGuests.map((g) => g.guest.id))}
        onClose={dialogs.close}
      />
      <GuestProfileSheet
        orgId={orgId}
        orgName={activeOrg.org_name}
        guest={profile.guest}
        open={profile.open}
        onOpenChange={profile.setOpen}
      />
    </div>
  );
}
