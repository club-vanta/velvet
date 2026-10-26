import type { ReactNode } from "react";
import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * One guest of the meetup list below the table breakpoint, in three bands
 * read top to bottom: who the guest is, where they stand at the door and
 * with the payment, and the next step to take. The states sit in fixed
 * columns so they line up card after card, and the steps band only shows
 * while there is a step left.
 */
export function GuestCard({
  identity,
  order,
  menu,
  checkIn,
  payment,
  actions,
  dimmed,
}: {
  identity: ReactNode;
  order: ReactNode;
  menu: ReactNode;
  checkIn: ReactNode;
  /** Left out when the meetup has no entrance fee. */
  payment?: ReactNode;
  /** Null when the guest has no step left. */
  actions: ReactNode;
  dimmed: boolean;
}) {
  const { t } = useLanguage();
  return (
    <li
      className={cn("flex flex-col rounded-lg border", dimmed && "opacity-50")}
    >
      <div className="flex items-start gap-2 p-3">
        <div className="min-w-0 flex-1">{identity}</div>
        <div className="-mt-1 -mr-1 flex shrink-0 items-center gap-1">
          {order}
          {menu}
        </div>
      </div>
      <dl
        className={cn(
          "grid gap-3 border-t px-3 py-2.5",
          payment !== undefined && "grid-cols-2",
        )}
      >
        <GuestCardState label={t("checkInStatus")}>{checkIn}</GuestCardState>
        {payment !== undefined && (
          <GuestCardState label={t("payment")}>{payment}</GuestCardState>
        )}
      </dl>
      {actions && (
        // Full-width steps on phones; on wider cards they keep their size
        // and line up on the right, where the eye ends the row.
        <div className="flex gap-2 border-t p-3 *:flex-1 [&_button]:w-full @xl:justify-end @xl:*:flex-none @xl:[&_button]:w-auto">
          {actions}
        </div>
      )}
    </li>
  );
}

function GuestCardState({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1">{children}</dd>
    </div>
  );
}
