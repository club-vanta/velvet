import { useMemo, useState } from "react";
import { ShowMoreButton } from "@/components/ListToolbar";
import { useAllGuests, useBannedGuests } from "@/domain/guest";
import { useLanguage } from "@/lib/i18n";
import type { components } from "@/api/types";
import { useUnbanGuest } from "../api/useUnbanGuest";
import { useDirectoryView } from "../hooks/useDirectoryView";
import type { GuestAction } from "../lib/guestActions";
import { vantStatus } from "../lib/vantStatus";
import { DirectoryRow } from "./DirectoryRow";
import { DirectoryToolbar } from "./DirectoryToolbar";
import { GuestDialog, type OpenGuestDialog } from "./GuestDialog";
import { GuestList } from "./GuestList";
import { GuestListError } from "./GuestListError";

type Guest = components["schemas"]["GuestPublic"];

/** Every known guest, with the actions staff and admins can take on each. */
export function AllGuestsTab({
  isOrgAdmin,
  orgId,
}: {
  isOrgAdmin: boolean;
  orgId: string;
}) {
  const { t } = useLanguage();
  const [dialog, setDialog] = useState<OpenGuestDialog | null>(null);
  const { data, isLoading, isError, refetch } = useAllGuests();
  // GuestPublic has no org vant state, so it comes from the org's list
  // (same query and cache as the Vanted tab).
  const bannedQ = useBannedGuests(orgId);
  // An explicit memo: a new Set each render would defeat the one in
  // useDirectoryView and re-sort a thousand guests per keystroke (measured).
  const vantedIds = useMemo(
    () => new Set(bannedQ.data?.guests.map((g) => g.id) ?? []),
    [bannedQ.data],
  );
  const view = useDirectoryView(data?.guests, vantedIds);
  const unban = useUnbanGuest(orgId);
  const total = data?.guests.length ?? 0;

  const onAction = (action: GuestAction, guest: Guest) => {
    if (action === "unban") unban.mutate(guest);
    else setDialog({ kind: action, guest });
  };

  return (
    <>
      {isError && (
        <GuestListError
          message={t("failedLoadGuests")}
          onRetry={() => void refetch()}
        />
      )}
      {!isLoading && total > 0 && (
        <DirectoryToolbar
          search={view.search}
          onSearch={view.setSearch}
          filters={view.filters}
          onFilters={view.setFilters}
          sort={view.sort}
          onSort={view.setSort}
          searching={view.searching}
          shown={view.shown}
          total={total}
        />
      )}
      <GuestList
        data-cy="guests-directory"
        label={t("allGuests")}
        isLoading={isLoading}
        total={total}
        shown={view.shown}
        emptyMessage={t("noGuestsYet")}
        noMatchMessage={
          view.searching ? t("noGuestsMatchSearch") : t("noGuestsMatchFilters")
        }
      >
        {view.visible?.map((guest) => (
          <DirectoryRow
            key={guest.id}
            guest={guest}
            status={vantStatus(bannedQ.isSuccess, vantedIds.has(guest.id))}
            isOrgAdmin={isOrgAdmin}
            unbanPending={unban.isPending}
            onAction={onAction}
          />
        ))}
      </GuestList>
      <ShowMoreButton count={view.nextCount} onShowMore={view.showMore} />
      <GuestDialog
        dialog={dialog}
        orgId={orgId}
        onClose={() => setDialog(null)}
      />
    </>
  );
}
