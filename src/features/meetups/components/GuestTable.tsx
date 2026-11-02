import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useLanguage } from "@/lib/i18n";
import type { components } from "@/api/types";
import type { GuestSort, GuestSortKey } from "../lib/guestListView";
import type { GuestRowContext } from "../lib/guestRow";
import { GuestTableRow } from "./GuestTableRow";
import { SortableHead } from "./SortableHead";

type MeetupGuest = components["schemas"]["MeetupGuestPublic"];

/**
 * The guest list as a table, for screens wide enough to reach "Check in"
 * without scrolling sideways. Column headers sort the list.
 */
export function GuestTable({
  guests,
  loading,
  emptyMessage,
  ctx,
  sort,
  onSort,
}: {
  guests: MeetupGuest[];
  loading: boolean;
  /** Shown in place of the rows when there are none to show. */
  emptyMessage: string | null;
  ctx: GuestRowContext;
  sort: GuestSort;
  onSort: (col: GuestSortKey) => void;
}) {
  const { t } = useLanguage();
  const paid = ctx.requiresPayment;
  const columns = paid ? 6 : 5;

  return (
    <div className="rounded-md border" data-cy="guest-table">
      <Table className="xl:table-fixed">
        <TableHeader>
          <TableRow>
            <SortableHead
              col="arrival"
              label={t("order")}
              sort={sort}
              onSort={onSort}
              className="w-16 xl:w-[6%]"
            />
            <SortableHead
              col="name"
              label={t("guest")}
              sort={sort}
              onSort={onSort}
              className={paid ? "xl:w-[32%]" : "xl:w-[44%]"}
            />
            <SortableHead
              col="rsvp"
              label={t("rsvp")}
              sort={sort}
              onSort={onSort}
              className={paid ? "xl:w-[15%]" : "xl:w-[20%]"}
            />
            <SortableHead
              col="status"
              label={t("status")}
              sort={sort}
              onSort={onSort}
              className={paid ? "xl:w-[13%]" : "xl:w-[18%]"}
            />
            {paid && (
              <TableHead className="xl:w-[22%]">{t("payment")}</TableHead>
            )}
            <TableHead className="w-40">
              <span className="sr-only">{t("actions")}</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading &&
            Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i} data-cy="guest-list-loading">
                {["w-8", "w-48", "w-24", "w-20", "w-20"].map((width) => (
                  <TableCell key={width}>
                    <Skeleton className={`h-4 ${width}`} />
                  </TableCell>
                ))}
                {paid && (
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                )}
              </TableRow>
            ))}
          {emptyMessage && (
            <TableRow>
              <TableCell
                colSpan={columns}
                className="text-center text-muted-foreground py-8"
                data-cy="guest-list-empty"
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          )}
          {guests.map((guest) => (
            <GuestTableRow key={guest.guest.id} guest={guest} ctx={ctx} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
