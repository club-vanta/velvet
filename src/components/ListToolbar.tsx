import { useCallback } from "react";
import { ArrowDownUp, ListFilter, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage } from "@/lib/i18n";
import type { SortDir } from "@/lib/sortNames";

// Building blocks for a list's search, filter, and sort bar. Lists that used
// to be tables are cards on most screens now, so sorting can't live in
// column headers alone. Needs an `@container` ancestor.

const TRIGGER_CLASS = "flex-1 gap-2 @md:flex-none";

/** Search field, then the filter and sort menus; wraps on narrow lists. */
export function ListToolbarRow({
  search,
  onSearch,
  children,
}: {
  search: string;
  onSearch: (value: string) => void;
  children: React.ReactNode;
}) {
  const { t } = useLanguage();
  return (
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
      {children}
    </div>
  );
}

/** A radio section of a filter or sort menu. */
export function MenuRadios<V extends string>({
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

/** The "Filter" button, with the number of active filters on it. */
export function FilterMenu({
  activeCount,
  children,
}: {
  activeCount: number;
  children: React.ReactNode;
}) {
  const { t } = useLanguage();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="outline" className={TRIGGER_CLASS} />}
      >
        <ListFilter aria-hidden="true" />
        {t("filterGuests")}
        {activeCount > 0 && (
          <span className="rounded-full bg-foreground px-1.5 text-xs font-semibold text-background tabular-nums">
            {activeCount}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * The "Sort" button. Picking a field sorts it ascending; the direction is a
 * second choice, labelled per field ("A to Z", "Newest first").
 */
export function SortMenu<K extends string>({
  sort,
  onSort,
  keys,
  label,
  dirLabel,
}: {
  sort: { key: K; dir: SortDir };
  onSort: (sort: { key: K; dir: SortDir }) => void;
  keys: readonly K[];
  label: (key: K) => string;
  dirLabel: (key: K, dir: SortDir) => string;
}) {
  const { t } = useLanguage();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="outline" className={TRIGGER_CLASS} />}
      >
        <ArrowDownUp aria-hidden="true" />
        <span className="sr-only">{t("sortBy")}:</span>
        {label(sort.key)}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <MenuRadios
          label={t("sortBy")}
          value={sort.key}
          onChange={(key) => onSort({ key, dir: "asc" })}
          options={keys.map((k) => ({ value: k, label: label(k) }))}
        />
        <DropdownMenuSeparator />
        <MenuRadios
          label={t("sortDirection")}
          value={sort.dir}
          onChange={(dir) => onSort({ ...sort, dir })}
          options={(["asc", "desc"] as const).map((d) => ({
            value: d,
            label: dirLabel(sort.key, d),
          }))}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Removable chips for the active filters, with the result count. Renders
 * nothing while the list is neither filtered nor searched.
 */
export function FilterChips({
  chips,
  narrowed,
  shown,
  total,
  onClear,
}: {
  chips: readonly { key: string; label: string; onRemove: () => void }[];
  narrowed: boolean;
  shown: number;
  total: number;
  onClear: () => void;
}) {
  const { t } = useLanguage();
  if (!narrowed && chips.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={chip.onRemove}
          aria-label={t("removeFilter").replace("{0}", chip.label)}
          className="inline-flex h-7 items-center gap-1 rounded-full border bg-muted/40 pr-2 pl-3 text-xs font-medium transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          {chip.label}
          <X className="size-3.5 text-muted-foreground" aria-hidden="true" />
        </button>
      ))}
      <span className="text-muted-foreground tabular-nums" aria-live="polite">
        {t("showingGuests")
          .replace("{0}", String(shown))
          .replace("{1}", String(total))}
      </span>
      {chips.length > 0 && (
        <Button variant="ghost" size="sm" onClick={onClear}>
          {t("clearFilters")}
        </Button>
      )}
    </div>
  );
}

/**
 * The nearest ancestor that actually scrolls (a dialog's list), or null for
 * the viewport. An overflow:auto box that grows with its content, like the
 * app's <main>, doesn't count: the window scrolls instead.
 */
function scrollParent(el: HTMLElement): HTMLElement | null {
  for (let p = el.parentElement; p; p = p.parentElement) {
    const scrolls = /(auto|scroll)/.test(getComputedStyle(p).overflowY);
    if (scrolls && p.scrollHeight > p.clientHeight) return p;
  }
  return null;
}

/**
 * Shows the next page of a long list (see useIncrementalList). Also fires on
 * its own when scrolled near, so scrolling feels continuous; clicking it
 * keeps working for keyboard users and where IntersectionObserver is missing.
 */
export function ShowMoreButton({
  count,
  onShowMore,
}: {
  /** Rows the next page adds; renders nothing at 0. */
  count: number;
  onShowMore: () => void;
}) {
  const { t } = useLanguage();
  // A callback ref, so the observer attaches whenever the button mounts,
  // including when a new search brings it back. Stable, so re-renders don't
  // re-observe (a fresh observer reports at once and would load a page).
  const observe = useCallback(
    (el: HTMLButtonElement | null) => {
      if (!el || typeof IntersectionObserver === "undefined") return;
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) onShowMore();
        },
        // The margin only applies relative to whatever scrolls.
        { root: scrollParent(el), rootMargin: "800px 0px" },
      );
      observer.observe(el);
      return () => observer.disconnect();
    },
    [onShowMore],
  );

  if (count <= 0) return null;
  return (
    <div className="flex justify-center">
      <Button ref={observe} variant="outline" onClick={onShowMore}>
        {t("showMoreCount").replace("{0}", String(count))}
      </Button>
    </div>
  );
}
