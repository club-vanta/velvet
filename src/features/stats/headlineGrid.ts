import { cn } from "@/lib/utils";

/** The grid for `cards` headline cards, shared by the tab and its skeleton so nothing jumps on load. Three columns when the count divides by 3 and not by 4, else four. */
export function headlineGrid(cards: number): string {
  return cn(
    "grid grid-cols-2 gap-2 sm:gap-3",
    cards % 4 !== 0 && cards % 3 === 0 ? "xl:grid-cols-3" : "xl:grid-cols-4",
  );
}
