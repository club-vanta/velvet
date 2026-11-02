import { Link, type LinkProps } from "react-router-dom";
import { cn } from "@/lib/utils";

/** A link to a guest or meetup inside a stats list. */
export function StatsLink({ className, ...props }: LinkProps) {
  return (
    <Link
      className={cn(
        "min-w-0 rounded-sm font-medium break-words underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50",
        className,
      )}
      {...props}
    />
  );
}
