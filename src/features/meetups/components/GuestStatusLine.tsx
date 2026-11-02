import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** What the line says about the guest, which sets its tint. */
export type StatusTone = "done" | "paid" | "missing" | "neutral";

const TONE_CLASS: Record<StatusTone, string> = {
  done: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  paid: "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300",
  missing:
    "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  neutral: "bg-muted/40 text-muted-foreground",
};

/**
 * One state of a guest card as a tinted band: the sentence on the left and,
 * when there is one, its undo on the right. The tint lets the list be
 * scanned by color without reading each card.
 */
export function GuestStatusLine({
  tone,
  icon: Icon,
  children,
  action,
  id,
}: {
  tone: StatusTone;
  icon?: LucideIcon;
  children: ReactNode;
  action?: ReactNode;
  /** Lets a disabled button point `aria-describedby` at this line. */
  id?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 border-t px-3 py-2 text-sm",
        TONE_CLASS[tone],
      )}
    >
      {Icon && <Icon className="size-4 shrink-0" aria-hidden="true" />}
      <p id={id} className="min-w-0 flex-1">
        {children}
      </p>
      {action}
    </div>
  );
}
