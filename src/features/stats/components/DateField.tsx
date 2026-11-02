import { Input } from "@/components/ui/input";

/** A labelled date picker of the custom range; clearing it changes nothing. */
export function DateField({
  label,
  value,
  min,
  max,
  onChange,
  "data-cy": dataCy,
}: {
  label: string;
  value: string;
  min?: string;
  max?: string;
  onChange: (value: string) => void;
  "data-cy": string;
}) {
  return (
    <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs text-muted-foreground sm:flex-none">
      {label}
      <Input
        type="date"
        data-cy={dataCy}
        value={value}
        min={min}
        max={max}
        onChange={(e) => {
          if (e.target.value) onChange(e.target.value);
        }}
      />
    </label>
  );
}
