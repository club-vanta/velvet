import type { ChartConfig } from "@/components/ui/chart";

/** The y axis width every strip shares, so their plot areas and the icon row line up. */
export const Y_AXIS_WIDTH = 32;

export const STRIP_MARGIN = { top: 4, right: 0, bottom: 0, left: 0 };

/**
 * Pixels per hour at each zoom step. The chart keeps at least this width and
 * scrolls sideways when the card is narrower, so a phone shows every hour's
 * icon, rain label and time without squeezing them.
 */
export const HOUR_WIDTHS = [48, 72, 112] as const;

export const METEOGRAM_CONFIG: ChartConfig = {
  temperature: { color: "var(--chart-3)" },
  rain: { color: "var(--chart-2)" },
  arrivals: { color: "var(--chart-1)" },
};
