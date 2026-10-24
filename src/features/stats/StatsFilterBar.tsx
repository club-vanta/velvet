import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useOrgMeetups } from "@/hooks/useOrgMeetups";
import { useLanguage, type TranslationKey } from "@/lib/i18n";
import { localDay, type RangePreset } from "./statsPeriod";
import type { useStatsFilters } from "./useStatsFilters";

type Filters = ReturnType<typeof useStatsFilters>;

const PRESET_LABELS: Record<RangePreset, TranslationKey> = {
  "30d": "statsRangeLast30",
  "3m": "statsRangeLast3m",
  "12m": "statsRangeLast12m",
  ytd: "statsRangeYtd",
  all: "statsRangeAll",
  custom: "statsRangeCustom",
};

const PRESET_ORDER = Object.keys(PRESET_LABELS) as RangePreset[];

const ALL_EVENTS = "all";

function DateField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: string;
  min?: string;
  max?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs text-muted-foreground sm:flex-none">
      {label}
      <Input
        type="date"
        value={value}
        min={min}
        max={max}
        onChange={(e) => {
          if (e.target.value) onChange(e.target.value);
        }}
      />
    </label>
  );
}

export function StatsFilterBar({
  orgId,
  filters,
}: {
  orgId: string;
  filters: Filters;
}) {
  const { t } = useLanguage();
  const { data } = useOrgMeetups(orgId);
  const { preset, custom, meetupId, query, setPreset, setCustom, setMeetupId } =
    filters;

  const events = (data?.meetups ?? [])
    .filter((m) => m.is_finalized)
    .map((m) => ({ meetup: m, date: new Date(m.date) }))
    .filter(({ date }) => {
      const day = localDay(date);
      return (
        (!query.from || day >= query.from) && (!query.to || day < query.to)
      );
    })
    .sort((a, b) => b.date.getTime() - a.date.getTime());

  const selected = events.find(({ meetup }) => meetup.id === meetupId);

  const eventName = selected ? eventLabel(selected) : t("statsAllEvents");

  return (
    <div className="flex flex-wrap items-end gap-3">
      <Select
        value={preset}
        onValueChange={(v) => v && setPreset(v as RangePreset)}
      >
        <SelectTrigger
          className="w-full sm:w-48"
          aria-label={t(PRESET_LABELS[preset])}
        >
          <SelectValue>{t(PRESET_LABELS[preset])}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {PRESET_ORDER.map((p) => (
            <SelectItem key={p} value={p}>
              {t(PRESET_LABELS[p])}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {custom && (
        <div className="flex w-full gap-3 sm:w-auto">
          <DateField
            label={t("statsRangeFrom")}
            value={custom.from}
            max={custom.to}
            onChange={(from) => setCustom({ from, to: custom.to })}
          />
          <DateField
            label={t("statsRangeTo")}
            value={custom.to}
            min={custom.from}
            onChange={(to) => setCustom({ from: custom.from, to })}
          />
        </div>
      )}

      <Select
        value={meetupId ?? ALL_EVENTS}
        onValueChange={(v) =>
          setMeetupId(v && v !== ALL_EVENTS ? v : undefined)
        }
      >
        <SelectTrigger className="w-full sm:w-64" aria-label={eventName}>
          <SelectValue>{eventName}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_EVENTS}>{t("statsAllEvents")}</SelectItem>
          {events.map((event) => (
            <SelectItem key={event.meetup.id} value={event.meetup.id}>
              {eventLabel(event)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function eventLabel({
  meetup,
  date,
}: {
  meetup: { name: string };
  date: Date;
}): string {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  return `${meetup.name} · ${dd}/${mm}`;
}
