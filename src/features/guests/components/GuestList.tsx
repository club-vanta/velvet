import { GuestListEmpty } from "./GuestListEmpty";
import { GuestListSkeleton } from "./GuestListSkeleton";

/**
 * A guest list with its loading, empty and no-match states. `total` is how
 * many guests are loaded, `shown` how many pass the search and filters. A
 * list that failed to load is not empty, so it shows no empty state.
 */
export function GuestList({
  label,
  "data-cy": dataCy,
  isLoading,
  isError,
  total,
  shown,
  emptyMessage,
  noMatchMessage,
  children,
}: {
  label: string;
  "data-cy": string;
  isLoading: boolean;
  isError: boolean;
  total: number;
  shown: number;
  emptyMessage: string;
  noMatchMessage: string;
  children: React.ReactNode;
}) {
  return (
    <ul className="space-y-2" aria-label={label} data-cy={dataCy}>
      {isLoading && <GuestListSkeleton />}
      {!isLoading && !isError && total === 0 && (
        <GuestListEmpty>{emptyMessage}</GuestListEmpty>
      )}
      {!isLoading && total > 0 && shown === 0 && (
        <GuestListEmpty>{noMatchMessage}</GuestListEmpty>
      )}
      {children}
    </ul>
  );
}
