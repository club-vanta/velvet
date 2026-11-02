import { Skeleton } from "@/components/ui/skeleton";

/** The meetup header's shape while the meetup loads. */
export function MeetupHeaderSkeleton() {
  return (
    <div
      className="flex items-center gap-4 rounded-xl border p-4 @md:p-6"
      data-cy="meetup-header-loading"
    >
      <Skeleton className="size-20 rounded-xl" />
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
      </div>
    </div>
  );
}
