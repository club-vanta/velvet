import {
  FilterChips,
  ListToolbarRow,
  ShowMoreButton,
  SortMenu,
} from "@/components/ListToolbar";
import { useBannedGuests } from "@/domain/guest";
import { useLanguage } from "@/lib/i18n";
import { useUnbanGuest } from "../api/useUnbanGuest";
import { useVantedView } from "../hooks/useVantedView";
import { VANTED_SORT_KEYS } from "../lib/guestDirectoryView";
import { SORT_DIR_LABEL, VANTED_SORT_LABEL } from "../lib/directoryLabels";
import { GuestList } from "./GuestList";
import { GuestListError } from "./GuestListError";
import { VantedRow } from "./VantedRow";

/** The guests vanted in this org, with the reason and when. */
export function VantedGuestsTab({
  isOrgAdmin,
  orgId,
}: {
  isOrgAdmin: boolean;
  orgId: string;
}) {
  const { t } = useLanguage();
  const { data, isLoading, isError, refetch } = useBannedGuests(orgId);
  const view = useVantedView(data?.guests);
  const unban = useUnbanGuest(orgId);
  const total = data?.guests.length ?? 0;

  return (
    <>
      {isError && (
        <GuestListError
          message={t("failedLoadBanned")}
          onRetry={() => void refetch()}
        />
      )}
      {!isLoading && total > 0 && (
        <div className="space-y-2">
          <ListToolbarRow search={view.search} onSearch={view.setSearch}>
            <SortMenu
              sort={view.sort}
              onSort={view.setSort}
              keys={VANTED_SORT_KEYS}
              label={(k) => t(VANTED_SORT_LABEL[k])}
              dirLabel={(k, d) => t(SORT_DIR_LABEL[k][d])}
            />
          </ListToolbarRow>
          <FilterChips
            chips={[]}
            narrowed={view.searching}
            shown={view.shown}
            total={total}
            onClear={() => {}}
          />
        </div>
      )}
      <GuestList
        data-cy="guests-vanted"
        label={t("bannedGuests")}
        isLoading={isLoading}
        total={total}
        shown={view.shown}
        emptyMessage={t("noBannedGuests")}
        noMatchMessage={t("noGuestsMatchSearch")}
      >
        {view.visible?.map((guest) => (
          <VantedRow
            key={guest.id}
            guest={guest}
            canUnban={isOrgAdmin}
            unbanPending={unban.isPending}
            onUnban={unban.mutate}
          />
        ))}
      </GuestList>
      <ShowMoreButton count={view.nextCount} onShowMore={view.showMore} />
    </>
  );
}
