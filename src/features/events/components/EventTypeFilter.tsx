import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/lib/i18n";
import { eventTypeLabel, FILTER_EVENT_TYPES } from "../lib/eventTypes";

/** Narrows the audit log to one event type; "all" shows every type. */
export function EventTypeFilter({
  value,
  onChange,
}: {
  value: string;
  onChange: (type: string) => void;
}) {
  const { t } = useLanguage();
  return (
    <Select value={value} onValueChange={(v) => onChange(v ?? "all")}>
      <SelectTrigger
        className="w-48"
        aria-label={t("type")}
        data-cy="events-type-filter"
      >
        <SelectValue
          placeholder={t("allEvents")}
          data-cy="events-type-filter-value"
        >
          {value === "all" ? t("allEvents") : eventTypeLabel(value, t)}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{t("allEvents")}</SelectItem>
        {FILTER_EVENT_TYPES.map((type) => (
          <SelectItem key={type} value={type}>
            {eventTypeLabel(type, t)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
