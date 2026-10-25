import { useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";
import { ExternalLink, MapPin, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useGeocode } from "@/hooks/useGeocode";
import { useSetMeetupLocation } from "@/hooks/useSetMeetupLocation";
import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { components } from "@/api/types";

type Meetup = components["schemas"]["MeetupPublic"];
type GeocodeResult = components["schemas"]["GeocodeResult"];

const SEARCH_DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 3;

function mapUrl(latitude: number, longitude: number) {
  return `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=17/${latitude}/${longitude}`;
}

/**
 * Where the meetup happens: the address with a map link for every member, and
 * for org admins an address search (an ARIA combobox) plus a remove action.
 * Not a FactStrip: this block is editable and has to grow for the search list.
 */
export function MeetupLocation({
  orgId,
  meetup,
  canEdit,
}: {
  orgId: string;
  meetup: Meetup;
  canEdit: boolean;
}) {
  const { t } = useLanguage();
  const { location_label: label, latitude, longitude } = meetup;
  const setLocation = useSetMeetupLocation(orgId, meetup.id);
  const searchRef = useRef<HTMLInputElement>(null);

  const save = (location: components["schemas"]["MeetupLocationUpdate"]) =>
    setLocation.mutate(location, {
      onSuccess: () => {
        toast.success(t("meetupLocationSaved"));
        searchRef.current?.focus();
      },
      onError: (err) => toast.error(err.message),
    });

  return (
    <div className="space-y-2 text-sm">
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
        <MapPin
          className="size-4 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
        <span className="sr-only">{t("meetupLocation")}</span>
        {label !== null && latitude !== null && longitude !== null ? (
          <>
            <span className="min-w-0 break-words">{label}</span>
            <a
              href={mapUrl(latitude, longitude)}
              target="_blank"
              rel="noreferrer"
              aria-label={`${t("meetupLocationOpenMap")}: ${label}`}
              className="inline-flex items-center gap-1 rounded-sm text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              {t("meetupLocationOpenMap")}
              <ExternalLink className="size-3" aria-hidden="true" />
            </a>
            {canEdit && (
              <Button
                variant="ghost"
                size="sm"
                disabled={setLocation.isPending}
                onClick={() =>
                  save({
                    location_label: null,
                    latitude: null,
                    longitude: null,
                  })
                }
                className="gap-1 text-muted-foreground"
              >
                <X className="size-3.5" aria-hidden="true" />
                {t("meetupLocationRemove")}
              </Button>
            )}
          </>
        ) : (
          <span className="text-muted-foreground">
            {t("meetupLocationNone")}
          </span>
        )}
      </div>
      {canEdit && (
        <AddressSearch
          ref={searchRef}
          orgId={orgId}
          saving={setLocation.isPending}
          onPick={(result) =>
            save({
              location_label: result.label,
              latitude: result.latitude,
              longitude: result.longitude,
            })
          }
        />
      )}
    </div>
  );
}

function AddressSearch({
  ref,
  orgId,
  saving,
  onPick,
}: {
  ref: React.Ref<HTMLInputElement>;
  orgId: string;
  // The input stays enabled (read-only) while saving so it keeps focus.
  saving: boolean;
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
  const optionId = (index: number) => `${baseId}-option-${index}`;

  // A new result list invalidates the highlighted row.
  const [seenData, setSeenData] = useState(search.data);
  if (seenData !== search.data) {
    setSeenData(search.data);
    setActiveIndex(-1);
  }

  useEffect(() => {
    if (expanded && activeIndex >= 0)
      document
        .getElementById(`${baseId}-option-${activeIndex}`)
        ?.scrollIntoView?.({ block: "nearest" });
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
    <div className="max-w-md">
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
          expanded && activeIndex >= 0 ? optionId(activeIndex) : undefined
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
      />
      <ul
        id={listId}
        role="listbox"
        aria-label={t("meetupLocationSearch")}
        aria-busy={search.isPlaceholderData}
        hidden={!expanded}
        className="mt-1 max-h-60 w-full overflow-auto rounded-lg border bg-popover p-1 text-popover-foreground"
      >
        {options.map((option, index) => (
          <li
            key={`${option.latitude},${option.longitude},${option.label}`}
            id={optionId(index)}
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
          >
            {option.label}
          </li>
        ))}
      </ul>
      {settled && search.isError && (
        <p role="alert" className="mt-1 text-xs text-destructive">
          {t("meetupLocationSearchFailed")}
        </p>
      )}
      {settled && search.data?.length === 0 && (
        <p role="status" className="mt-1 text-xs text-muted-foreground">
          {t("meetupLocationNoResults")}
        </p>
      )}
      <p id={hintId} className="mt-1 text-xs text-muted-foreground">
        {t("meetupLocationHint")}
      </p>
    </div>
  );
}
