import { ArrowDownUp, ListFilter, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

/** A radio section of the filter menu, one per filter dimension. */
function FilterRadios<V extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: V;
  options: readonly { value: V; label: string }[];
  onChange: (value: V) => void;
}) {
  return (
    <DropdownMenuGroup>
      <DropdownMenuLabel>{label}</DropdownMenuLabel>
      <DropdownMenuRadioGroup
        aria-label={label}
        value={value}
        onValueChange={(v: string) => onChange(v as V)}
      >
        {options.map((o) => (
          <DropdownMenuRadioItem key={o.value} value={o.value}>
            {o.label}
          </DropdownMenuRadioItem>
        ))}
      </DropdownMenuRadioGroup>
    </DropdownMenuGroup>
  );
}

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

  const narrowed = active.length > 0 || search.trim() !== "";

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <div className="relative basis-full @md:basis-0 @md:flex-1">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            placeholder={t("searchGuestList")}
            aria-label={t("searchGuestList")}
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            className="pl-8"
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="outline"
                className="flex-1 gap-2 @md:flex-none"
              />
            }
          >
            <ListFilter aria-hidden="true" />
            {t("filterGuests")}
            {active.length > 0 && (
              <span className="rounded-full bg-foreground px-1.5 text-xs font-semibold text-background tabular-nums">
                {active.length}
              </span>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <FilterRadios
              label={t("status")}
              value={filters.status}
              onChange={(v) => set("status", v)}
              options={(["all", "pending", "arrived"] as const).map((v) => ({
                value: v,
                label: t(STATUS_LABEL[v]),
              }))}
            />
            <DropdownMenuSeparator />
            <FilterRadios
              label={t("rsvp")}
              value={filters.rsvp}
              onChange={(v) => set("rsvp", v)}
              options={(["all", "active", "cancelled"] as const).map((v) => ({
                value: v,
                label: t(RSVP_LABEL[v]),
              }))}
            />
            <DropdownMenuSeparator />
            <FilterRadios
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
                <FilterRadios
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
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="outline"
                className="flex-1 gap-2 @md:flex-none"
              />
            }
          >
            <ArrowDownUp aria-hidden="true" />
            <span className="sr-only">{t("sortBy")}:</span>
            {t(SORT_LABEL[sort.key])}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <FilterRadios
              label={t("sortBy")}
              value={sort.key}
              onChange={(key) => onSort({ key, dir: "asc" })}
              options={GUEST_SORT_KEYS.map((v) => ({
                value: v,
                label: t(SORT_LABEL[v]),
              }))}
            />
            <DropdownMenuSeparator />
            <FilterRadios
              label={t("sortDirection")}
              value={sort.dir}
              onChange={(dir) => onSort({ ...sort, dir })}
              options={(["asc", "desc"] as const).map((v) => ({
                value: v,
                label: t(SORT_DIR_LABEL[sort.key][v]),
              }))}
            />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {narrowed && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {active.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => set(key, DEFAULT_GUEST_FILTERS[key])}
              aria-label={t("removeFilter").replace("{0}", chipLabel[key])}
              className="inline-flex h-7 items-center gap-1 rounded-full border bg-muted/40 pr-2 pl-3 text-xs font-medium transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              {chipLabel[key]}
              <X
                className="size-3.5 text-muted-foreground"
                aria-hidden="true"
              />
            </button>
          ))}
          <span
            className="text-muted-foreground tabular-nums"
            aria-live="polite"
          >
            {t("showingGuests")
              .replace("{0}", String(shown))
              .replace("{1}", String(total))}
          </span>
          {active.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onFilters(DEFAULT_GUEST_FILTERS)}
            >
              {t("clearFilters")}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
