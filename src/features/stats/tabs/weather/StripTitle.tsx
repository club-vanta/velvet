/**
 * What a strip's y axis measures, over its top left. Sticky, so it stays in
 * view while the chart scrolls sideways.
 */
export function StripTitle({ children }: { children: string }) {
  return (
    <p className="sticky left-0 w-fit pt-1 text-xs text-muted-foreground">
      {children}
    </p>
  );
}
