import type { components } from "@/api/types";
import { useLanguage } from "@/lib/i18n";
import { formatCount } from "../../lib/statsFormat";

type Operations = components["schemas"]["OperationsStatsPublic"];

/** Check-ins of each staff member; those with no recorded checker share one row. */
export function StaffList({ staff }: { staff: Operations["staff"] }) {
  const { t, lang } = useLanguage();

  return (
    <ul className="divide-y text-sm">
      {staff.map((member) => (
        <li
          key={member.user_id ?? "none"}
          data-cy={`stats-staff-${member.user_id ?? "none"}`}
          className="flex items-baseline justify-between gap-3 py-1.5"
        >
          <span data-cy="stats-staff-name" className="min-w-0 break-words">
            {member.username ?? t("statsNoChecker")}
          </span>
          <span data-cy="stats-staff-count" className="tabular-nums">
            {formatCount(member.checkins, lang)}
          </span>
        </li>
      ))}
    </ul>
  );
}
