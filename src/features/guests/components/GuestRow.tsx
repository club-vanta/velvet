/**
 * The card every guest list row sits in: stacked on phones, one line from
 * the `@3xl` container width up.
 */
export function GuestRow({
  "data-cy": dataCy,
  children,
}: {
  "data-cy": string;
  children: React.ReactNode;
}) {
  return (
    <li
      data-cy={dataCy}
      className="flex flex-col gap-3 rounded-lg border p-3 @3xl:flex-row @3xl:items-center @3xl:gap-4"
    >
      {children}
    </li>
  );
}
