import { Skeleton } from "@/components/ui/skeleton";

/** The shape of a profile while the guest loads. */
export function GuestProfileSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" data-cy="guest-profile-loading">
      <div className="flex items-center gap-4">
        <Skeleton className="size-20 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}
