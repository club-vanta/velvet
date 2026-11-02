import type { components } from "@/api/types";
import { useLanguage } from "@/lib/i18n";
import { ColumnHeader } from "../../components/ColumnHeader";
import { RateCell } from "../../components/RateCell";
import { useGroupLabels } from "../../lib/groupLabels";
import { formatCount } from "../../lib/statsFormat";

type LeadRow = components["schemas"]["LeadTimeRowPublic"];

/** Sign-ups and the no-show rate of each lead-time bucket; a rate from few people is dimmed with its n. */
export function LeadTimeTable({
  rows,
  labelledBy,
}: {
  rows: LeadRow[];
  labelledBy: string;
}) {
  const { t, lang } = useLanguage();
  const labels = useGroupLabels();

  return (
    <table
      aria-labelledby={labelledBy}
      className="mt-3 w-full text-sm tabular-nums"
    >
      <thead>
        <tr className="border-b">
          <ColumnHeader align="left">{t("statsLeadTimeHeader")}</ColumnHeader>
          <ColumnHeader align="right">{t("statsSeriesSignedUp")}</ColumnHeader>
          <ColumnHeader align="right">{t("statsNoShowRate")}</ColumnHeader>
        </tr>
      </thead>
      <tbody className="divide-y">
        {rows.map((r) => (
          <tr key={r.bucket} data-cy={`stats-lead-row-${r.bucket}`}>
            <th
              scope="row"
              data-cy="stats-lead-bucket"
              className="py-1.5 text-left font-normal"
            >
              {labels.leadTime(r.bucket)}
            </th>
            <td data-cy="stats-lead-signed-up" className="py-1.5 text-right">
              {formatCount(r.signed_up, lang)}
            </td>
            <RateCell rate={r.no_show_rate} n={r.signed_up - r.cancelled} />
          </tr>
        ))}
      </tbody>
    </table>
  );
}
