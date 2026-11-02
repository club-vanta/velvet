import type { components } from "@/api/types";
import { cn } from "@/lib/utils";

type NoShowGuest = components["schemas"]["NoShowGuestPublic"];

/** Sign-ups drawn as dots per guest; more show as a count. */
const MAX_DOTS = 12;

/**
 * One dot per sign-up that was not cancelled: filled for each time the guest
 * did not come, hollow for each time they came. Past MAX_DOTS the rest is a
 * count. Decorative: the text beside it says the same.
 */
export function MissDots({ guest }: { guest: NoShowGuest }) {
  const dots = [
    ...Array.from({ length: guest.no_show }, () => true),
    ...Array.from({ length: guest.attended }, () => false),
  ];
  const extra = dots.length - MAX_DOTS;

  return (
    <span
      aria-hidden="true"
      className="inline-flex shrink-0 items-center gap-1"
    >
      {dots.slice(0, MAX_DOTS).map((missed, i) => (
        <span
          key={i}
          data-slot={missed ? "dot-missed" : "dot-came"}
          className={cn(
            "size-2 rounded-full",
            missed
              ? "bg-chart-2"
              : "ring-1 ring-muted-foreground/60 ring-inset",
          )}
        />
      ))}
      {extra > 0 && (
        <span className="text-xs text-muted-foreground">+{extra}</span>
      )}
    </span>
  );
}
