import { TooltipBox } from "./TooltipBox";

/** What a meteogram point shows on hover: when it is, then each value with its name. */
export type MeteogramTip = { title: string; lines: [string, string][] };

/**
 * The tooltip of every meteogram strip. Each data point carries its own
 * `tip`, so one component serves the hour and the quarter hour strips.
 */
export function MeteogramTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: readonly { payload?: unknown }[];
}) {
  const tip = (payload?.[0]?.payload as { tip?: MeteogramTip } | undefined)
    ?.tip;
  if (!active || !tip) return null;
  return (
    <TooltipBox>
      <p className="font-medium tabular-nums">{tip.title}</p>
      <ul className="grid gap-0.5">
        {tip.lines.map(([name, value]) => (
          <li key={name} className="flex justify-between gap-4">
            <span className="text-muted-foreground">{name}</span>
            <span className="font-mono font-medium tabular-nums">{value}</span>
          </li>
        ))}
      </ul>
    </TooltipBox>
  );
}
