import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { components } from "@/api/types";
import { useLanguage, type TranslationKey } from "@/lib/i18n";
import { ChartTextTable } from "../../components/ChartTextTable";
import { BAR_END_UP } from "../../lib/chartMarks";
import { formatCount } from "../../lib/statsFormat";

type FrequencyRow = components["schemas"]["FrequencyRowPublic"];

const FREQUENCY_LABELS: Record<FrequencyRow["bucket"], TranslationKey> = {
  ONE: "statsFreqOne",
  TWO: "statsFreqTwo",
  THREE_FIVE: "statsFreqThreeFive",
  SIX_PLUS: "statsFreqSixPlus",
};

/** How many people came once, twice, and so on in the period. */
export function FrequencyChart({
  rows,
  labelledBy,
}: {
  rows: FrequencyRow[];
  labelledBy: string;
}) {
  const { t, lang } = useLanguage();
  const config: ChartConfig = {
    guests: { label: t("statsPeople"), color: "var(--chart-1)" },
  };
  const data = rows.map((r) => ({
    label: t(FREQUENCY_LABELS[r.bucket]),
    guests: r.guests,
  }));

  return (
    <>
      <ChartContainer config={config} className="aspect-auto h-56 w-full">
        <BarChart data={data}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            interval={0}
          />
          <YAxis
            width={32}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar
            dataKey="guests"
            fill="var(--color-guests)"
            radius={BAR_END_UP}
          />
        </BarChart>
      </ChartContainer>
      <ChartTextTable
        labelledBy={labelledBy}
        headers={[t("statsFrequencyHeader"), t("statsPeople")]}
        rows={data.map((d) => ({
          key: d.label,
          cells: [d.label, formatCount(d.guests, lang)],
        }))}
      />
    </>
  );
}
