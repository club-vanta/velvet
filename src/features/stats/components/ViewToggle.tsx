import { Button } from "@/components/ui/button";

/**
 * Two or more ways of showing the same cards, as pressed buttons in one
 * group. One switch per section, so the cards it drives never disagree.
 */
export function ViewToggle<V extends string>({
  label,
  options,
  value,
  onChange,
  "data-cy": dataCy,
}: {
  /** Names the group for screen readers. */
  label: string;
  options: readonly { value: V; label: string }[];
  value: V;
  onChange: (value: V) => void;
  /** Names the group; each option is `<data-cy>-<value>`. */
  "data-cy": string;
}) {
  return (
    <div
      role="group"
      data-cy={dataCy}
      aria-label={label}
      className="inline-flex gap-1 rounded-lg border p-1"
    >
      {options.map((o) => (
        <Button
          key={o.value}
          data-cy={`${dataCy}-${o.value}`}
          size="sm"
          variant={value === o.value ? "secondary" : "ghost"}
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </Button>
      ))}
    </div>
  );
}
