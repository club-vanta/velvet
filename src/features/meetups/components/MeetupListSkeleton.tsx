import { Skeleton } from "@/components/ui/skeleton";

/** The meetup list's shape while it loads. */
export function MeetupListSkeleton() {
  return (
    <ul
      className="divide-y overflow-hidden rounded-xl border bg-card"
      data-cy="meetups-loading"
    >
      {Array.from({ length: 5 }).map((_, i) => (
        <li key={i} className="flex items-center gap-4 px-4 py-3">
          <Skeleton className="size-14 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-56" />
          </div>
        </li>
      ))}
    </ul>
  );
}
