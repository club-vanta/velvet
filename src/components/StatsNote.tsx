import type { ReactNode } from "react";

/** A small quote-style caveat under the card or chart it qualifies. */
export function StatsNote({ children }: { children: ReactNode }) {
  return (
    <blockquote className="border-l-2 pl-3 text-xs text-muted-foreground">
      {children}
    </blockquote>
  );
}
