import * as React from "react";
import { Input as InputPrimitive } from "@base-ui/react/input";
import { cn } from "@/lib/utils";

interface InputWithPrefixProps extends React.ComponentProps<"input"> {
  prefix: string;
  inputClassName?: string;
}

function InputWithPrefix({
  prefix,
  className,
  inputClassName,
  disabled,
  "aria-invalid": ariaInvalid,
  ...props
}: InputWithPrefixProps) {
  const prefixId = React.useId();
  return (
    <div
      data-slot="input-with-prefix"
      aria-invalid={ariaInvalid}
      className={cn(
        "flex h-8 w-full overflow-hidden rounded-lg border border-input transition-colors",
        "focus-within:has-[input:focus-visible]:border-ring focus-within:has-[input:focus-visible]:ring-3 focus-within:has-[input:focus-visible]:ring-ring/50",
        "aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        disabled && "pointer-events-none cursor-not-allowed opacity-50",
        className,
      )}
    >
      <span
        id={prefixId}
        className="flex items-center border-r border-input bg-input/30 px-2.5 text-sm text-muted-foreground select-none"
      >
        {prefix}
      </span>
      <InputPrimitive
        data-slot="input"
        disabled={disabled}
        aria-describedby={prefixId}
        className={cn(
          "min-w-0 flex-1 bg-transparent px-2.5 py-1 text-sm outline-none placeholder:text-muted-foreground dark:bg-transparent",
          inputClassName,
        )}
        {...props}
      />
    </div>
  );
}

export { InputWithPrefix };
