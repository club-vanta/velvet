import { StatCard } from "@/components/StatCard";

/** A titled card for a chart, with the look of the meetup stat cards. */
export function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return <StatCard title={title}>{children}</StatCard>;
}
