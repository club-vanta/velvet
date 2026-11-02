import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * A low-key undo under a state, so it never competes with the next step.
 * On a tinted line it takes the line's color through `className`, since
 * muted grey on the tint falls under 4.5:1 in the light theme.
 */
export function InlineUndo({
  onClick,
  className,
  children,
  "data-cy": dataCy,
}: {
  onClick: () => void;
  className?: string;
  children: ReactNode;
  "data-cy"?: string;
}) {
  return (
    <Button
      variant="link"
      size="xs"
      className={cn(
        "h-auto px-0 text-xs text-muted-foreground hover:text-foreground",
        className,
      )}
      onClick={onClick}
      data-cy={dataCy}
    >
      {children}
    </Button>
  );
}
