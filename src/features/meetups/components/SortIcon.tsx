import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import type { SortDir } from "../lib/guestListView";

/** A sort control's arrow: faint both ways when inactive, else the direction. */
export function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
  return dir === "asc" ? (
    <ArrowUp className="h-3 w-3" />
  ) : (
    <ArrowDown className="h-3 w-3" />
  );
}
