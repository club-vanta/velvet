import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** A column header of a visible stats table: small and muted, aligned to its cells. */
export function ColumnHeader({
  align,
  className,
  children,
}: {
  align: "left" | "right";
  className?: string;
  children: ReactNode;
}) {
  return (
    <th
      scope="col"
      className={cn(
        "py-1.5 text-xs font-medium text-muted-foreground",
        align === "left" ? "text-left" : "text-right",
        className,
      )}
    >
      {children}
    </th>
  );
}
