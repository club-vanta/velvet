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
import { MAZMO_PRONOUN_SHORT, mazmoLabel } from "@/domain/guest";
import { useLanguage } from "@/lib/i18n";
import {
  DEFAULT_DIRECTORY_FILTERS,
  DIRECTORY_SORT_KEYS,
  activeDirectoryFilters,
  type DirectoryFilters,
  type DirectorySortKey,
  type ListSort,
} from "../lib/guestDirectoryView";
import {
  DIRECTORY_SORT_LABEL,
  INSTAGRAM_FILTER_LABEL,
  MAZMO_FILTER_LABEL,
  PRONOUN_FILTERS,
  SORT_DIR_LABEL,
  directoryFilterChipLabel,
} from "../lib/directoryLabels";

/** Search, filters and sort of the guest directory, with the active chips. */
export function DirectoryToolbar({
  search,
  onSearch,
  filters,
  onFilters,
  sort,
  onSort,
  searching,
  shown,
  total,
}: {
  search: string;
  onSearch: (search: string) => void;
  filters: DirectoryFilters;
  onFilters: (filters: DirectoryFilters) => void;
  sort: ListSort<DirectorySortKey>;
  onSort: (sort: ListSort<DirectorySortKey>) => void;
  searching: boolean;
  shown: number;
  total: number;
}) {
  const { t } = useLanguage();
  const active = activeDirectoryFilters(filters);
  const setFilter = <K extends keyof DirectoryFilters>(
    key: K,
    value: DirectoryFilters[K],
  ) => onFilters({ ...filters, [key]: value });

  return (
    <div className="space-y-2">
      <ListToolbarRow search={search} onSearch={onSearch}>
        <FilterMenu activeCount={active.length}>
          <MenuRadios
            label={t("filterMazmoAccount")}
            value={filters.mazmo}
            onChange={(v) => setFilter("mazmo", v)}
            options={(["all", "linked", "unlinked"] as const).map((v) => ({
              value: v,
              label: t(MAZMO_FILTER_LABEL[v]),
            }))}
          />
          <DropdownMenuSeparator />
          <MenuRadios
            label={t("instagramCol")}
            value={filters.instagram}
            onChange={(v) => setFilter("instagram", v)}
            options={(["all", "with", "without"] as const).map((v) => ({
              value: v,
              label: t(INSTAGRAM_FILTER_LABEL[v]),
            }))}
          />
          <DropdownMenuSeparator />
          <MenuRadios
            label={t("pronouns")}
            value={filters.pronoun}
            onChange={(v) => setFilter("pronoun", v)}
            options={[
              { value: "all" as const, label: t("filterAll") },
              ...PRONOUN_FILTERS.map((v) => ({
                value: v,
                label: mazmoLabel(MAZMO_PRONOUN_SHORT, v, t),
              })),
            ]}
          />
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuLabel>{t("filterShowOnly")}</DropdownMenuLabel>
            <DropdownMenuCheckboxItem
              checked={filters.vantedOnly}
              onCheckedChange={(v: boolean) => setFilter("vantedOnly", v)}
            >
              {t("filterBanned")}
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={filters.mazmoFlaggedOnly}
              onCheckedChange={(v: boolean) => setFilter("mazmoFlaggedOnly", v)}
            >
              {t("filterMazmoFlagged")}
            </DropdownMenuCheckboxItem>
          </DropdownMenuGroup>
        </FilterMenu>
        <SortMenu
          sort={sort}
          onSort={onSort}
          keys={DIRECTORY_SORT_KEYS}
          label={(k) => t(DIRECTORY_SORT_LABEL[k])}
          dirLabel={(k, d) => t(SORT_DIR_LABEL[k][d])}
        />
      </ListToolbarRow>
      <FilterChips
        chips={active.map((key) => ({
          key,
          label: directoryFilterChipLabel(key, filters, t),
          onRemove: () => setFilter(key, DEFAULT_DIRECTORY_FILTERS[key]),
        }))}
        narrowed={searching}
        shown={shown}
        total={total}
        onClear={() => onFilters(DEFAULT_DIRECTORY_FILTERS)}
      />
    </div>
  );
}
