import type { TranslationKey } from "@/lib/i18n";

/** Stack order, bottom to top. The legend follows it. */
export const SERIES = [
  { key: "attended", label: "statsSeriesAttended", color: "var(--chart-2)" },
  { key: "no_show", label: "statsSeriesNoShow", color: "var(--destructive)" },
  {
    key: "cancelled",
    label: "statsSeriesCancelled",
    color: "var(--chart-4)",
  },
] as const satisfies readonly {
  key: string;
  label: TranslationKey;
  color: string;
}[];

/**
 * Recharts sorts legend items by name unless told otherwise, which would
 * read attended, cancelled, no-show. This keeps the stack order.
 */
export function legendOrder(item: { dataKey?: unknown }): number {
  return SERIES.findIndex(({ key }) => key === item.dataKey);
}
