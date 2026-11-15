import type { components } from "@/api/types";
import { GUEST_TYPE_LABEL, isGuestType } from "@/domain/guest";
import type { TranslationKey } from "@/lib/i18n";

type EventLog = components["schemas"]["EventLogPublic"];
type Translate = (key: TranslationKey) => string;

export type EventBadgeVariant =
  "default" | "secondary" | "destructive" | "outline";

// EventLogPublic.event_type is a plain string in the API, so these maps cover
// the types the backend writes today and unknown ones fall back gracefully.
const EVENT_TYPES = {
  CHECK_IN: { label: "eventCheckIn", variant: "default" },
  UNDO_CHECK_IN: { label: "eventUndo", variant: "secondary" },
  BAN: { label: "eventBan", variant: "destructive" },
  UNBAN: { label: "eventUnban", variant: "outline" },
  MEETUP_FINALIZED: { label: "eventFinalized", variant: "secondary" },
  MEETUP_UNFINALIZED: { label: "eventUnfinalized", variant: "outline" },
  WALKIN: { label: "eventWalkin", variant: "outline" },
  GUEST_CREATED: { label: "eventGuestCreated", variant: "outline" },
  GUEST_MAZMO_LINKED: { label: "eventGuestMazmoLinked", variant: "outline" },
  GUEST_MAZMO_UNLINKED: {
    label: "eventGuestMazmoUnlinked",
    variant: "outline",
  },
  PAYMENT_RECORDED: { label: "eventPaymentRecorded", variant: "default" },
  PAYMENT_REVOKED: { label: "eventPaymentRevoked", variant: "secondary" },
  PAYMENT_REQUIREMENT_ENABLED: {
    label: "eventPaymentEnabled",
    variant: "outline",
  },
  PAYMENT_REQUIREMENT_DISABLED: {
    label: "eventPaymentDisabled",
    variant: "outline",
  },
  GUEST_TYPE_CHANGED: { label: "eventGuestTypeChanged", variant: "outline" },
  GUEST_DISPLAYNAME_CHANGED: {
    label: "eventGuestDisplaynameChanged",
    variant: "outline",
  },
} as const satisfies Record<
  string,
  { label: TranslationKey; variant: EventBadgeVariant }
>;

export type EventType = keyof typeof EVENT_TYPES;

function isEventType(value: string): value is EventType {
  return Object.hasOwn(EVENT_TYPES, value);
}

/** The types the audit log can be filtered by, in menu order. */
export const FILTER_EVENT_TYPES: readonly EventType[] = [
  "CHECK_IN",
  "UNDO_CHECK_IN",
  "BAN",
  "UNBAN",
  "WALKIN",
  "PAYMENT_RECORDED",
  "PAYMENT_REVOKED",
  "GUEST_TYPE_CHANGED",
];

/** The type's name in the UI language; an unknown type shows as is. */
export function eventTypeLabel(type: string, t: Translate): string {
  return isEventType(type) ? t(EVENT_TYPES[type].label) : type;
}

export function eventBadgeVariant(type: string): EventBadgeVariant {
  return isEventType(type) ? EVENT_TYPES[type].variant : "outline";
}

const GUEST_TYPE_CHANGE_REASON = /^Changed guest_type from (\w+) to (\w+)$/;

/**
 * The event's reason, or null when it has none. The backend writes guest
 * type changes in English with raw enum values; those show as
 * "Regular → Vendor" in the UI language. Anything else shows as written.
 */
export function eventReason(event: EventLog, t: Translate): string | null {
  if (!event.reason) return null;
  if (event.event_type !== "GUEST_TYPE_CHANGED") return event.reason;
  const [, from, to] = GUEST_TYPE_CHANGE_REASON.exec(event.reason) ?? [];
  if (!from || !to || !isGuestType(from) || !isGuestType(to))
    return event.reason;
  return `${t(GUEST_TYPE_LABEL[from])} → ${t(GUEST_TYPE_LABEL[to])}`;
}
