import { usePendingStaff } from "@/features/staff";

/**
 * How many staff accounts wait for a site admin's approval, for the nav
 * badge. Only site admins may list them, so it is 0 for everyone else, and
 * while loading or after an error (the badge then simply does not show).
 */
export function usePendingStaffCount(isSiteAdmin: boolean): number {
  const { data } = usePendingStaff({ enabled: isSiteAdmin });
  return data?.length ?? 0;
}
