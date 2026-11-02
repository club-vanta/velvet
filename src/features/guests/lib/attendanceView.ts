import type { components } from "@/api/types";
import type { TranslationKey } from "@/lib/i18n";
import type { TimelineMarker } from "./timelineMarker";

type AttendanceStatus = components["schemas"]["GuestAttendanceStatus"];
type Summary = components["schemas"]["GuestAttendanceSummary"];

// The backend decides the status; this only maps it to how it looks.
export const ATTENDANCE_VIEW: Record<
  AttendanceStatus,
  {
    label: TranslationKey;
    marker: TimelineMarker;
    badge: "secondary" | "destructive" | "outline";
  }
> = {
  ATTENDED: {
    label: "attendanceAttended",
    marker: "filled",
    badge: "secondary",
  },
  WALKIN: { label: "walkinLabel", marker: "filled", badge: "secondary" },
  NO_SHOW: {
    label: "attendanceNoShow",
    marker: "danger",
    badge: "destructive",
  },
  CANCELLED: {
    label: "attendanceCancelled",
    marker: "hollow",
    badge: "outline",
  },
  UPCOMING: {
    label: "attendanceUpcoming",
    marker: "faint",
    badge: "outline",
  },
};

export type SummaryItem = {
  status: Exclude<AttendanceStatus, "WALKIN">;
  count: number;
  /** Walk-ins are part of attended, not a separate bucket. */
  walkins: number;
  danger: boolean;
};

/** The summary's non-zero totals, in reading order. */
export function attendanceSummaryItems(summary: Summary): SummaryItem[] {
  const items: SummaryItem[] = [
    {
      status: "ATTENDED",
      count: summary.attended,
      walkins: summary.walkin,
      danger: false,
    },
    { status: "NO_SHOW", count: summary.no_show, walkins: 0, danger: true },
    {
      status: "CANCELLED",
      count: summary.cancelled,
      walkins: 0,
      danger: false,
    },
    { status: "UPCOMING", count: summary.upcoming, walkins: 0, danger: false },
  ];
  return items.filter((item) => item.count > 0);
}
