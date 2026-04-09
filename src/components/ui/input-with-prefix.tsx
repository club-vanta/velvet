import * as React from "react";
import { cn } from "@/lib/utils";

interface InputWithPrefixProps extends React.ComponentProps<"input"> {
  prefix: string;
}

function InputWithPrefix({ prefix, className, disabled, ...props }: InputWithPrefixProps) {
  return (
    <div
      className={cn(
        "flex h-8 w-full overflow-hidden rounded-lg border border-input transition-colors",
        "focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
        disabled && "pointer-events-none cursor-not-allowed opacity-50",
      )}
    >
      <span className="flex items-center border-r border-input bg-input/30 px-2.5 text-sm text-muted-foreground select-none">
        {prefix}
      </span>
      <input
        disabled={disabled}
        className={cn(
          "min-w-0 flex-1 bg-transparent px-2.5 py-1 text-sm outline-none placeholder:text-muted-foreground dark:bg-transparent",
          className,
        )}
        {...props}
      />
    </div>
  );
}

export { InputWithPrefix };
