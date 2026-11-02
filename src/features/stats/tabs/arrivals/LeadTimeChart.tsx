import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { components } from "@/api/types";
import { useLanguage } from "@/lib/i18n";
import { useGroupLabels } from "../../lib/groupLabels";
import { BAR_END_RIGHT } from "../../lib/chartMarks";

type LeadRow = components["schemas"]["LeadTimeRowPublic"];

/** How many signed up in each lead-time bucket, as horizontal bars. */
export function LeadTimeChart({ rows }: { rows: LeadRow[] }) {
  const { t } = useLanguage();
  const labels = useGroupLabels();
  const config: ChartConfig = {
    signed_up: { label: t("statsSeriesSignedUp"), color: "var(--chart-2)" },
  };
  const data = rows.map((r) => ({
    label: labels.leadTime(r.bucket),
    signed_up: r.signed_up,
  }));

  return (
    <ChartContainer config={config} className="aspect-auto h-56 w-full">
      <BarChart data={data} layout="vertical">
        <CartesianGrid horizontal={false} />
        <XAxis
          type="number"
          allowDecimals={false}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          type="category"
          dataKey="label"
          width={80}
          tickLine={false}
          axisLine={false}
          interval={0}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar
          dataKey="signed_up"
          fill="var(--color-signed_up)"
          radius={BAR_END_RIGHT}
        />
      </BarChart>
    </ChartContainer>
  );
}
