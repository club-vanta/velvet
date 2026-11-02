import { ReferenceArea, ReferenceLine } from "recharts";
import type { Domain } from "./meteogramData";

/**
 * The before window shaded and the start marked, on every strip. The shade
 * ends where the during window begins, the hour that contains the start.
 */
export function StartMarks({
  domain,
  startHour,
  label,
}: {
  domain: Domain;
  startHour: number;
  label?: string;
}) {
  return (
    <>
      <ReferenceArea
        x1={domain[0]}
        x2={startHour}
        fill="var(--muted-foreground)"
        fillOpacity={0.08}
        ifOverflow="hidden"
      />
      <ReferenceLine
        x={0}
        stroke="var(--muted-foreground)"
        strokeDasharray="3 3"
        label={
          label
            ? {
                value: label,
                position: "insideTopLeft",
                fill: "var(--muted-foreground)",
                fontSize: 11,
              }
            : undefined
        }
      />
    </>
  );
}
