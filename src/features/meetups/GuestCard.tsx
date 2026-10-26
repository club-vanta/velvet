import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * One guest of the meetup list below the table breakpoint, in three bands
 * read top to bottom: who the guest is, one tinted line per state (in, paid,
 * owing), and the next step to take. A guest with nothing done yet has no
 * state lines, and the steps band only shows while there is a step left.
 */
export function GuestCard({
  identity,
  menu,
  statuses,
  actions,
  dimmed,
}: {
  identity: ReactNode;
  menu: ReactNode;
  statuses: ReactNode;
  /** Null when the guest has no step left. */
  actions: ReactNode;
  dimmed: boolean;
}) {
  return (
    <li
      className={cn(
        "flex flex-col overflow-hidden rounded-lg border",
        dimmed && "opacity-50",
      )}
    >
      <div className="flex items-start gap-2 p-3">
        <div className="min-w-0 flex-1">{identity}</div>
        <div className="-mt-1 -mr-1 shrink-0">{menu}</div>
      </div>
      <div className="peer contents">{statuses}</div>
      {actions && (
        // Full-width steps on phones; on wider cards they keep their size
        // and line up on the right, where the eye ends the row. Under a
        // state line the band joins it as one block, so it only draws its
        // own rule when it sits right under the header.
        <div className="flex gap-2 p-3 peer-empty:border-t *:flex-1 [&_button]:w-full @xl:justify-end @xl:*:flex-none @xl:[&_button]:w-auto">
          {actions}
        </div>
      )}
    </li>
  );
}
