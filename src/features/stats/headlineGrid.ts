import { cn } from "@/lib/utils";

/** One layout for the skeleton and the cards, so nothing jumps on load. */
export function headlineGrid(single: boolean): string {
  return cn(
    "grid grid-cols-2 gap-2 sm:gap-3",
    single ? "xl:grid-cols-4" : "xl:grid-cols-3",
  );
}
