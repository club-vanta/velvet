/** The one row of a guest list that has nothing to show. */
export function GuestListEmpty({ children }: { children: React.ReactNode }) {
  return (
    <li
      data-cy="guests-empty"
      className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground"
    >
      {children}
    </li>
  );
}
