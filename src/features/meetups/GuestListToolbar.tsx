import {
  DropdownMenuCheckboxItem,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  FilterChips,
  FilterMenu,
  ListToolbarRow,
  MenuRadios,
  SortMenu,
} from "@/components/ListToolbar";
import { useLanguage, type TranslationKey } from "@/lib/i18n";
import { GUEST_TYPES, GUEST_TYPE_LABEL } from "@/lib/guestType";
import {
  DEFAULT_GUEST_FILTERS,
  GUEST_SORT_KEYS,
  activeGuestFilters,
  type GuestFilters,
  type GuestSort,
  type GuestSortKey,
  type SortDir,
} from "@/lib/guestListView";

const SORT_LABEL: Record<GuestSortKey, TranslationKey> = {
  name: "sortName",
  rsvp: "sortRsvp",
  arrival: "sortArrival",
  status: "sortStatus",
};

const SORT_DIR_LABEL: Record<GuestSortKey, Record<SortDir, TranslationKey>> = {
  name: { asc: "sortNameAsc", desc: "sortNameDesc" },
  rsvp: { asc: "sortRsvpAsc", desc: "sortRsvpDesc" },
  arrival: { asc: "sortArrivalAsc", desc: "sortArrivalDesc" },
  status: { asc: "sortStatusAsc", desc: "sortStatusDesc" },
};

const STATUS_LABEL: Record<GuestFilters["status"], TranslationKey> = {
  all: "filterAll",
  pending: "statsNotArrived",
  arrived: "filterArrived",
};

const RSVP_LABEL: Record<GuestFilters["rsvp"], TranslationKey> = {
  all: "filterAll",
  active: "filterRsvpActive",
  cancelled: "filterRsvpCancelled",
};

const PAYMENT_LABEL: Record<GuestFilters["payment"], TranslationKey> = {
  all: "filterAll",
  paid: "filterPaid",
  unpaid: "filterUnpaid",
  exempt: "filterExempt",
};

/**
 * Search, filter and sort for a meetup's guest list. The list is cards on
 * most screens, so sorting can't live in column headers alone.
 */
export function GuestListToolbar({
  search,
  onSearch,
  filters,
  onFilters,
  sort,
  onSort,
  requiresPayment,
  shown,
  total,
}: {
  search: string;
  onSearch: (value: string) => void;
  filters: GuestFilters;
  onFilters: (filters: GuestFilters) => void;
  sort: GuestSort;
  onSort: (sort: GuestSort) => void;
  requiresPayment: boolean;
  shown: number;
  total: number;
}) {
  const { t } = useLanguage();
  const active = activeGuestFilters(filters, requiresPayment);
  const set = <K extends keyof GuestFilters>(key: K, value: GuestFilters[K]) =>
    onFilters({ ...filters, [key]: value });

  const chipLabel: Record<keyof GuestFilters, string> = {
    status: t(STATUS_LABEL[filters.status]),
    rsvp: t(RSVP_LABEL[filters.rsvp]),
    type: filters.type === "all" ? "" : t(GUEST_TYPE_LABEL[filters.type]),
    payment: t(PAYMENT_LABEL[filters.payment]),
    walkinOnly: t("filterWalkins"),
    bannedOnly: t("filterBanned"),
  };

  return (
    <div className="space-y-2">
      <ListToolbarRow search={search} onSearch={onSearch}>
        <FilterMenu activeCount={active.length}>
          <MenuRadios
            label={t("status")}
            value={filters.status}
            onChange={(v) => set("status", v)}
            options={(["all", "pending", "arrived"] as const).map((v) => ({
              value: v,
              label: t(STATUS_LABEL[v]),
            }))}
          />
          <DropdownMenuSeparator />
          <MenuRadios
            label={t("rsvp")}
            value={filters.rsvp}
            onChange={(v) => set("rsvp", v)}
            options={(["all", "active", "cancelled"] as const).map((v) => ({
              value: v,
              label: t(RSVP_LABEL[v]),
            }))}
          />
          <DropdownMenuSeparator />
          <MenuRadios
            label={t("guestType")}
            value={filters.type}
            onChange={(v) => set("type", v)}
            options={[
              { value: "all" as const, label: t("filterAll") },
              ...GUEST_TYPES.map((v) => ({
                value: v,
                label: t(GUEST_TYPE_LABEL[v]),
              })),
            ]}
          />
          {requiresPayment && (
            <>
              <DropdownMenuSeparator />
              <MenuRadios
                label={t("payment")}
                value={filters.payment}
                onChange={(v) => set("payment", v)}
                options={(["all", "paid", "unpaid", "exempt"] as const).map(
                  (v) => ({ value: v, label: t(PAYMENT_LABEL[v]) }),
                )}
              />
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuLabel>{t("filterShowOnly")}</DropdownMenuLabel>
            <DropdownMenuCheckboxItem
              checked={filters.walkinOnly}
              onCheckedChange={(v: boolean) => set("walkinOnly", v)}
            >
              {t("filterWalkins")}
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={filters.bannedOnly}
              onCheckedChange={(v: boolean) => set("bannedOnly", v)}
            >
              {t("filterBanned")}
            </DropdownMenuCheckboxItem>
          </DropdownMenuGroup>
        </FilterMenu>
        <SortMenu
          sort={sort}
          onSort={onSort}
          keys={GUEST_SORT_KEYS}
          label={(k) => t(SORT_LABEL[k])}
          dirLabel={(k, d) => t(SORT_DIR_LABEL[k][d])}
        />
      </ListToolbarRow>
      <FilterChips
        chips={active.map((key) => ({
          key,
          label: chipLabel[key],
          onRemove: () => set(key, DEFAULT_GUEST_FILTERS[key]),
        }))}
        narrowed={search.trim() !== ""}
        shown={shown}
        total={total}
        onClear={() => onFilters(DEFAULT_GUEST_FILTERS)}
      />
    </div>
  );
}
