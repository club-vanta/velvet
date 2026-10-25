import { cn } from "@/lib/utils";

/**
 * The grid for `cards` headline cards, shared by the tab and its skeleton so
 * nothing jumps on load. Three columns when the count divides by 3 and not
 * by 4, else four. Below xl there are two columns, so an odd count's last
 * card spans both instead of leaving an empty cell.
 */
export function headlineGrid(cards: number): string {
  return cn(
    "grid grid-cols-2 gap-2 sm:gap-3",
    cards % 4 !== 0 && cards % 3 === 0 ? "xl:grid-cols-3" : "xl:grid-cols-4",
    cards % 2 !== 0 &&
      "[&>*:last-child]:col-span-2 xl:[&>*:last-child]:col-span-1",
  );
}
