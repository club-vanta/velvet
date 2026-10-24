import { cn } from "@/lib/utils";

/** One layout for the skeleton and the cards, so nothing jumps on load and no card is left alone in a row. */
export function headlineGrid(cards: number): string {
  return cn(
    "grid grid-cols-2 gap-2 sm:gap-3",
    cards % 4 !== 0 && cards % 3 === 0 ? "xl:grid-cols-3" : "xl:grid-cols-4",
  );
}
