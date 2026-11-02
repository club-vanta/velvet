import { Skeleton } from "@/components/ui/skeleton";

/** Placeholder rows while a guest list loads. */
export function GuestListSkeleton() {
  return Array.from({ length: 5 }).map((_, i) => (
    <li
      key={i}
      data-cy="guests-loading"
      className="flex items-center gap-3 rounded-lg border p-3"
    >
      <Skeleton className="size-8 rounded-full" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-24" />
      </div>
    </li>
  ));
}
