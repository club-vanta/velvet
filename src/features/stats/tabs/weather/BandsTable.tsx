import type { components } from "@/api/types";
import { useLanguage } from "@/lib/i18n";
import { ColumnHeader } from "../../components/ColumnHeader";
import { RateCell } from "../../components/RateCell";
import { formatCount } from "../../lib/statsFormat";
import { BAND_LABEL, roundAverage } from "./temperatureBands";

type Band = components["schemas"]["TemperatureBandRowPublic"];

/** The chart's numbers for screen readers and anyone who cannot hover. */
export function BandsTable({
  rows,
  labelledBy,
}: {
  rows: Band[];
  labelledBy: string;
}) {
  const { t, lang } = useLanguage();

  return (
    <table
      aria-labelledby={labelledBy}
      className="mt-3 w-full text-sm tabular-nums"
    >
      <thead>
        <tr className="border-b">
          <ColumnHeader align="left">{t("statsBandHeader")}</ColumnHeader>
          <ColumnHeader align="right">{t("statsEvents")}</ColumnHeader>
          <ColumnHeader align="right">{t("statsAvgAttended")}</ColumnHeader>
          <ColumnHeader align="right">{t("statsNoShowRate")}</ColumnHeader>
        </tr>
      </thead>
      <tbody className="divide-y">
        {rows.map((r) => (
          <tr key={r.band}>
            <th
              scope="row"
              data-slot="band"
              className="py-1.5 text-left font-normal"
            >
              {t(BAND_LABEL[r.band])}
            </th>
            <td data-slot="events" className="py-1.5 text-right">
              {formatCount(r.events, lang)}
            </td>
            <td data-slot="avg" className="py-1.5 text-right">
              {formatCount(roundAverage(r.avg_attended), lang)}
            </td>
            <RateCell rate={r.no_show_rate} n={r.events} />
          </tr>
        ))}
      </tbody>
    </table>
  );
}
