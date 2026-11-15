import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/lib/i18n";
import type { components } from "@/api/types";
import type { GuestRowContext } from "../lib/guestRow";
import { MeetupGuestCard } from "./MeetupGuestCard";

type MeetupGuest = components["schemas"]["MeetupGuestPublic"];

/** The guest list as cards, for phones and narrow screens. */
export function GuestCardList({
  guests,
  loading,
  emptyMessage,
  ctx,
}: {
  guests: MeetupGuest[];
  loading: boolean;
  /** Shown in place of the cards when there are none to show. */
  emptyMessage: string | null;
  ctx: GuestRowContext;
}) {
  const { t } = useLanguage();
  return (
    <ul className="space-y-2" aria-label={t("guestList")} data-cy="guest-cards">
      {loading &&
        Array.from({ length: 5 }).map((_, i) => (
          <li key={i} data-cy="guest-list-loading">
            <Skeleton className="h-44 w-full rounded-lg" />
          </li>
        ))}
      {emptyMessage && (
        <li
          className="py-8 text-center text-sm text-muted-foreground"
          data-cy="guest-list-empty"
        >
          {emptyMessage}
        </li>
      )}
      {guests.map((guest) => (
        <MeetupGuestCard key={guest.guest.id} guest={guest} ctx={ctx} />
      ))}
    </ul>
  );
}
