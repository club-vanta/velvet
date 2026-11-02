import { useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { components } from "@/api/types";
import { MIN_QUERY_LENGTH, useGeocode } from "../api/useGeocode";

type GeocodeResult = components["schemas"]["GeocodeResult"];

const SEARCH_DEBOUNCE_MS = 300;

const optionId = (baseId: string, index: number) => `${baseId}-option-${index}`;

/**
 * An address search as an ARIA combobox: results show as the text settles,
 * arrow keys move through them, Enter or a click picks one.
 */
export function AddressSearch({
  ref,
  orgId,
  saving,
  onCancel,
  onPick,
}: {
  ref: React.Ref<HTMLInputElement>;
  orgId: string;
  // The input stays enabled (read-only) while saving so it keeps focus.
  saving: boolean;
  /** Offered while changing an existing location; Escape on a closed list also cancels. */
  onCancel?: () => void;
  onPick: (result: GeocodeResult) => void;
}) {
  const { t } = useLanguage();
  const baseId = useId();
  const listId = `${baseId}-list`;
  const inputId = `${baseId}-input`;
  const hintId = `${baseId}-hint`;
  const [input, setInput] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const debounced = useDebouncedValue(input, SEARCH_DEBOUNCE_MS);
  const search = useGeocode(orgId, debounced);

  // The hook keeps the previous results while the next search loads, and also
  // when the input shrinks below the minimum, so gate on the live input.
  const searchable = input.trim().length >= MIN_QUERY_LENGTH;
  const options = searchable ? (search.data ?? []) : [];
  const expanded = open && options.length > 0;
  const settled = searchable && !search.isPlaceholderData;

  // A new result list invalidates the highlighted row.
  const [seenData, setSeenData] = useState(search.data);
  if (seenData !== search.data) {
    setSeenData(search.data);
    setActiveIndex(-1);
  }

  useEffect(() => {
    if (expanded && activeIndex >= 0)
      document
        .getElementById(optionId(baseId, activeIndex))
        ?.scrollIntoView({ block: "nearest" });
  }, [expanded, activeIndex, baseId]);

  const pick = (result: GeocodeResult) => {
    if (saving) return;
    onPick(result);
    setInput("");
    setOpen(false);
    setActiveIndex(-1);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      if (expanded) e.preventDefault();
      else onCancel?.();
      setOpen(false);
      setActiveIndex(-1);
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (options.length === 0) return;
      e.preventDefault();
      setOpen(true);
      const step = e.key === "ArrowDown" ? 1 : -1;
      const from = activeIndex === -1 && step === -1 ? 0 : activeIndex;
      setActiveIndex((from + step + options.length) % options.length);
    } else if (e.key === "Enter" && expanded && options[activeIndex]) {
      e.preventDefault();
      pick(options[activeIndex]);
    }
  };

  return (
    <div className="mx-auto max-w-md text-left @md:mx-0 animate-in duration-200 fade-in slide-in-from-top-1 motion-reduce:animate-none">
      <label
        htmlFor={inputId}
        className="mb-1 block text-xs text-muted-foreground"
      >
        {t("meetupLocationSearch")}
      </label>
      <Input
        ref={ref}
        id={inputId}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={expanded}
        aria-controls={listId}
        aria-activedescendant={
          expanded && activeIndex >= 0
            ? optionId(baseId, activeIndex)
            : undefined
        }
        aria-describedby={hintId}
        autoComplete="off"
        value={input}
        readOnly={saving}
        onChange={(e) => {
          setInput(e.target.value);
          setOpen(true);
          setActiveIndex(-1);
        }}
        onKeyDown={onKeyDown}
        onBlur={() => setOpen(false)}
        data-cy="address-search"
      />
      <ul
        id={listId}
        role="listbox"
        aria-label={t("meetupLocationSearch")}
        aria-busy={search.isPlaceholderData}
        hidden={!expanded}
        className="mt-1 max-h-60 w-full overflow-auto rounded-lg border bg-popover p-1 text-popover-foreground"
        data-cy="address-search-list"
      >
        {options.map((option, index) => (
          <li
            key={`${option.latitude},${option.longitude},${option.label}`}
            id={optionId(baseId, index)}
            role="option"
            aria-selected={index === activeIndex}
            // mousedown, not click: the input blur would close the list first.
            onMouseDown={(e) => {
              e.preventDefault();
              pick(option);
            }}
            className={cn(
              "cursor-pointer rounded-md px-2 py-1.5 text-sm break-words hover:bg-accent hover:text-accent-foreground",
              index === activeIndex && "bg-accent text-accent-foreground",
            )}
            data-cy="address-search-option"
          >
            {option.label}
          </li>
        ))}
      </ul>
      {settled && search.isError && (
        <p
          role="alert"
          className="mt-1 text-xs text-destructive"
          data-cy="address-search-error"
        >
          {search.error.message}
        </p>
      )}
      {settled && search.data?.length === 0 && (
        <p
          role="status"
          className="mt-1 text-xs text-muted-foreground"
          data-cy="address-search-empty"
        >
          {t("meetupLocationNoResults")}
        </p>
      )}
      <div className="mt-1 flex items-start justify-between gap-3">
        <p id={hintId} className="text-xs text-muted-foreground">
          {t("meetupLocationHint")}
        </p>
        {onCancel && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="h-auto shrink-0 px-0 py-0 text-xs text-muted-foreground hover:bg-transparent"
            data-cy="address-search-cancel"
          >
            {t("cancel")}
          </Button>
        )}
      </div>
    </div>
  );
}
