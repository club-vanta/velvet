import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { extractApiError } from "@/api/errors";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Banknote,
  Check,
  Lock,
  LockOpen,
  RefreshCw,
  UserPlus,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ReasonDialog } from "@/components/ReasonDialog";
import { GuestAvatar } from "@/components/GuestAvatar";
import {
  GuestTypeBadge,
  MazmoFlagBadges,
  PronounPill,
} from "@/components/GuestBadges";
import { GuestProfile } from "@/features/guests/GuestProfile";
import { api } from "@/api/client";
import { useIsOrgAdmin, useOrg } from "@/lib/org";
import { formatDate, formatDateTime, ordinal } from "@/lib/format";
import { meetupTiming } from "@/lib/meetupTiming";
import {
  DEFAULT_GUEST_FILTERS,
  DEFAULT_GUEST_SORT,
  viewGuestList,
  type GuestFilters,
  type GuestSort,
  type GuestSortKey,
  type SortDir,
} from "@/lib/guestListView";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n";
import { useAllGuests } from "@/hooks/useAllGuests";
import { useGuestSearch } from "@/hooks/useGuestSearch";
import { useIncrementalList } from "@/hooks/useIncrementalList";
import { ShowMoreButton } from "@/components/ListToolbar";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useRelativeDay } from "@/hooks/useRelativeDay";
import { isPaymentExempt } from "@/lib/guestType";
import {
  invalidateAllGuestIdentities,
  invalidateMeetupGuests,
  meetupGuestsKey,
  meetupKey,
  meetupsKey,
} from "@/lib/queryKeys";
import { MeetupStats } from "./MeetupStats";
import { GuestRowActions } from "./GuestRowActions";
import { GuestListToolbar } from "./GuestListToolbar";
import { GuestCard } from "./GuestCard";
import { GuestStatusLine } from "./GuestStatusLine";
import { FinalizeMeetupDialog } from "./FinalizeMeetupDialog";
import { DateTile, MazmoUrlLink, MeetupBadges } from "./MeetupListItem";
import { MeetupLocation } from "./MeetupLocation";
import { MeetupWeather } from "./MeetupWeather";
import type { components } from "@/api/types";

type MeetupGuest = components["schemas"]["MeetupGuestPublic"];
type Guest = components["schemas"]["GuestPublic"];

const rsvpGuest = (mg: MeetupGuest) => mg.guest;

function SortIcon({
  col,
  active,
  dir,
}: {
  col: GuestSortKey;
  active: GuestSortKey;
  dir: SortDir;
}) {
  if (col !== active) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
  return dir === "asc" ? (
    <ArrowUp className="h-3 w-3" />
  ) : (
    <ArrowDown className="h-3 w-3" />
  );
}

function SortableHead({
  col,
  label,
  active,
  dir,
  onSort,
  className,
}: {
  col: GuestSortKey;
  label: string;
  active: GuestSortKey;
  dir: SortDir;
  onSort: (col: GuestSortKey) => void;
  className?: string;
}) {
  return (
    <TableHead
      className={className}
      aria-sort={
        col === active ? (dir === "asc" ? "ascending" : "descending") : "none"
      }
    >
      <button
        type="button"
        onClick={() => onSort(col)}
        className={cn(
          "flex items-center gap-1 hover:text-foreground transition-colors",
          col === active ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {label}
        <SortIcon col={col} active={active} dir={dir} />
      </button>
    </TableHead>
  );
}

/** A low-key undo under a state, so it never competes with the next step. */
function InlineUndo({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      variant="link"
      size="xs"
      className="h-auto px-0 text-xs text-muted-foreground hover:text-foreground"
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

/** Whether the guest is in: the badge, the arrival time and, if given, the undo. */
function CheckInStatus({
  guest,
  onUndo,
}: {
  guest: MeetupGuest;
  onUndo?: () => void;
}) {
  const { t } = useLanguage();
  const { has_arrived, arrival_time } = guest.rsvp;

  if (!has_arrived) return <Badge variant="secondary">{t("pending")}</Badge>;

  return (
    <div className="flex flex-col items-start gap-0.5">
      <Badge>{t("checkedIn")}</Badge>
      {arrival_time && (
        <p className="text-xs text-muted-foreground">
          {formatDateTime(arrival_time)}
        </p>
      )}
      {onUndo && <InlineUndo onClick={onUndo}>{t("undo")}</InlineUndo>}
    </div>
  );
}

/**
 * Where the guest stands with the entrance fee: the badge, when it was paid
 * and, for admins, the undo. "Mark paid" is the next step, so callers place
 * it with the other actions.
 */
function PaymentStatus({
  guest,
  isExempt,
  isOrgAdmin,
  onUndoPayment,
}: {
  guest: MeetupGuest;
  isExempt: boolean;
  isOrgAdmin: boolean;
  onUndoPayment: () => void;
}) {
  const { t } = useLanguage();
  const { has_paid, paid_at } = guest.rsvp;

  // Exempt guests never need "Mark paid", but someone who paid before being
  // reclassified keeps "Undo payment" so a refund can be recorded.
  if (isExempt) {
    return (
      <div className="flex flex-col items-start gap-0.5">
        <Badge variant="outline" title={t("paymentExemptHint")}>
          {t("paymentExempt")}
        </Badge>
        {has_paid && (
          <>
            <p className="text-xs text-muted-foreground">
              {t("paidBeforeExempt")}
              {paid_at ? ` · ${formatDateTime(paid_at)}` : ""}
            </p>
            {isOrgAdmin && (
              <InlineUndo onClick={onUndoPayment}>
                {t("undoPayment")}
              </InlineUndo>
            )}
          </>
        )}
      </div>
    );
  }

  if (!has_paid)
    return <Badge variant="secondary">{t("paymentPending")}</Badge>;

  return (
    <div className="flex flex-col items-start gap-0.5">
      <Badge>{t("paid")}</Badge>
      {paid_at && (
        <p className="text-xs text-muted-foreground">
          {formatDateTime(paid_at)}
        </p>
      )}
      {isOrgAdmin && (
        <InlineUndo onClick={onUndoPayment}>{t("undoPayment")}</InlineUndo>
      )}
    </div>
  );
}

function UndoDialog({
  guest,
  orgId,
  meetupId,
  onClose,
}: {
  guest: MeetupGuest;
  orgId: string;
  meetupId: string;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (reason: string) => {
      const { error } = await api.PATCH(
        "/organizations/{org_id}/meetups/{meetup_id}/guests/{guest_id}/undo-checkin",
        {
          params: {
            path: {
              org_id: orgId,
              meetup_id: meetupId,
              guest_id: guest.guest.id,
            },
          },
          body: { reason },
        },
      );
      if (error)
        throw new Error(extractApiError(error, "Failed to undo check-in"));
    },
    onSuccess: () => {
      invalidateMeetupGuests(queryClient, orgId, meetupId);
      toast.success(t("undoDone"));
      onClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <ReasonDialog
      title={`${t("undoDialogTitle")} ${guest.guest.displayname}?`}
      placeholder={t("undoReasonPlaceholder")}
      confirmLabel={t("undoCheckIn")}
      pendingLabel={t("undoing")}
      isPending={mutation.isPending}
      onConfirm={(reason) => mutation.mutate(reason)}
      onClose={onClose}
    />
  );
}

function MarkPaidDialog({
  guest,
  orgId,
  meetupId,
  onClose,
}: {
  guest: MeetupGuest;
  orgId: string;
  meetupId: string;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await api.PATCH(
        "/organizations/{org_id}/meetups/{meetup_id}/guests/{guest_id}/payment",
        {
          params: {
            path: {
              org_id: orgId,
              meetup_id: meetupId,
              guest_id: guest.guest.id,
            },
          },
        },
      );
      if (error)
        throw new Error(extractApiError(error, "Failed to mark payment"));
      return data;
    },
    onSuccess: () => {
      invalidateMeetupGuests(queryClient, orgId, meetupId);
      toast.success(`${guest.guest.displayname} — ${t("paymentRecorded")}`);
      onClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t("markPaidDialogTitle")} {guest.guest.displayname}?
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground py-2">
          {t("markPaidDialogBody")}
        </p>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? t("markingPaid") : t("markPaid")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UndoPaymentDialog({
  guest,
  orgId,
  meetupId,
  onClose,
}: {
  guest: MeetupGuest;
  orgId: string;
  meetupId: string;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (reason: string) => {
      const { error } = await api.PATCH(
        "/organizations/{org_id}/meetups/{meetup_id}/guests/{guest_id}/payment/undo",
        {
          params: {
            path: {
              org_id: orgId,
              meetup_id: meetupId,
              guest_id: guest.guest.id,
            },
          },
          body: { reason },
        },
      );
      if (error)
        throw new Error(extractApiError(error, "Failed to undo payment"));
    },
    onSuccess: () => {
      invalidateMeetupGuests(queryClient, orgId, meetupId);
      toast.success(t("paymentUndone"));
      onClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <ReasonDialog
      title={`${t("undoPaymentDialogTitle")} ${guest.guest.displayname}?`}
      placeholder={t("undoPaymentPlaceholder")}
      confirmLabel={t("undoPayment")}
      pendingLabel={t("undoing")}
      isPending={mutation.isPending}
      onConfirm={(reason) => mutation.mutate(reason)}
      onClose={onClose}
    />
  );
}

function CheckInBannedDialog({
  guest,
  orgId,
  meetupId,
  onClose,
}: {
  guest: MeetupGuest;
  orgId: string;
  meetupId: string;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await api.POST(
        "/organizations/{org_id}/meetups/{meetup_id}/guests/{guest_id}/checkin",
        {
          params: {
            path: {
              org_id: orgId,
              meetup_id: meetupId,
              guest_id: guest.guest.id,
            },
          },
        },
      );
      if (error) throw new Error(extractApiError(error, "Check-in failed"));
      return data;
    },
    onSuccess: (data) => {
      invalidateMeetupGuests(queryClient, orgId, meetupId);
      toast.success(
        t("checkedInToast")
          .replace("{0}", data!.guest.displayname)
          .replace("{1}", ordinal(data!.arrival_order)),
      );
      onClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("bannedGuestDialogTitle")}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground py-2">
          <span className="font-medium text-destructive">
            {guest.guest.displayname}
          </span>{" "}
          {t("bannedGuestDialogBody")}
        </p>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button
            variant="destructive"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? t("checkingIn") : t("checkInAnyway")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PaymentRequirementDialog({
  orgId,
  meetupId,
  enabling,
  onClose,
}: {
  orgId: string;
  meetupId: string;
  enabling: boolean;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      const path = enabling
        ? ("/organizations/{org_id}/meetups/{meetup_id}/enable-payment" as const)
        : ("/organizations/{org_id}/meetups/{meetup_id}/disable-payment" as const);
      const { data, error } = await api.PATCH(path, {
        params: { path: { org_id: orgId, meetup_id: meetupId } },
      });
      if (error)
        throw new Error(
          extractApiError(error, "Failed to update payment requirement"),
        );
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: meetupKey(orgId, meetupId),
      });
      void queryClient.invalidateQueries({ queryKey: meetupsKey(orgId) });
      toast.success(t("paymentRequirementUpdated"));
      onClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {enabling
              ? t("enablePaymentDialogTitle")
              : t("disablePaymentDialogTitle")}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground py-2">
          {enabling
            ? t("enablePaymentDialogBody")
            : t("disablePaymentDialogBody")}
        </p>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
          >
            {enabling ? t("enablePayment") : t("disablePayment")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function WalkinDialog({
  orgId,
  meetupId,
  alreadyRsvped,
  onClose,
}: {
  orgId: string;
  meetupId: string;
  alreadyRsvped: Set<string>;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  const allGuestsQ = useAllGuests();

  const mutation = useMutation({
    mutationFn: async (guest: Guest) => {
      const { data, error } = await api.POST(
        "/organizations/{org_id}/meetups/{meetup_id}/guests/{guest_id}/add-walkin",
        {
          params: {
            path: {
              org_id: orgId,
              meetup_id: meetupId,
              guest_id: guest.id,
            },
          },
        },
      );
      if (error) throw new Error(extractApiError(error, t("failedAddWalkin")));
      return { data, guest };
    },
    onSuccess: ({ guest }) => {
      invalidateMeetupGuests(queryClient, orgId, meetupId);
      toast.success(t("walkinAddedToast").replace("{0}", guest.displayname));
      onClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // The React Compiler caches this, so typing doesn't re-fold the directory.
  // It stops if `eligible` is read after the hooks below (see AllGuestsTab).
  const eligible = (allGuestsQ.data?.guests ?? []).filter(
    (g) => !alreadyRsvped.has(g.id),
  );
  const {
    search,
    setSearch,
    filtered: candidates = [],
    query,
  } = useGuestSearch(eligible);
  // The whole directory can be a thousand guests; mount them a page at a time.
  const { visible, nextCount, showMore } = useIncrementalList(
    candidates,
    query,
  );

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("walkinDialogTitle")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <Input
            placeholder={t("searchGuest")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
          />
          {allGuestsQ.isLoading && (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
          )}
          {allGuestsQ.isError && (
            <p className="text-sm text-destructive">
              {t("failedLoadGuestListShort")}
            </p>
          )}
          {!allGuestsQ.isLoading && candidates.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4 whitespace-pre-line">
              {query ? t("noEligibleGuests") : t("allGuestsOnList")}
            </p>
          )}
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {visible?.map((g) => (
              <div
                key={g.id}
                className="flex items-center justify-between gap-3 rounded-md px-3 py-2 hover:bg-secondary/50"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <GuestAvatar
                    name={g.displayname}
                    src={g.mazmo_profile?.avatar_url}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {g.displayname}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {g.mazmo_handle
                        ? `@${g.mazmo_handle}`
                        : t("noMazmoHandle")}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => mutation.mutate(g)}
                  disabled={mutation.isPending}
                >
                  {t("add")}
                </Button>
              </div>
            ))}
            <ShowMoreButton count={nextCount} onShowMore={showMore} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function MeetupDetailPage() {
  const { t } = useLanguage();
  const { id } = useParams<{ id: string }>();
  const { activeOrg } = useOrg();
  const orgId = activeOrg?.org_id ?? "";
  const isOrgAdmin = useIsOrgAdmin();
  const queryClient = useQueryClient();
  // The table needs about 1000px; below xl (with the sidebar open) it would
  // need sideways scrolling to reach "Check in", so cards are used instead.
  const isDesktop = useMediaQuery("(min-width: 1280px)");
  const [undoTarget, setUndoTarget] = useState<MeetupGuest | null>(null);
  const [bannedTarget, setBannedTarget] = useState<MeetupGuest | null>(null);
  const [walkinOpen, setWalkinOpen] = useState(false);
  const [markPaidTarget, setMarkPaidTarget] = useState<MeetupGuest | null>(
    null,
  );
  const [undoPaymentTarget, setUndoPaymentTarget] =
    useState<MeetupGuest | null>(null);
  const [paymentToggleOpen, setPaymentToggleOpen] = useState(false);
  const [finalizeOpen, setFinalizeOpen] = useState(false);
  // Kept after the sheet closes so its content stays put during the
  // slide-out animation; profileOpen drives visibility.
  const [profileGuest, setProfileGuest] = useState<MeetupGuest | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);

  function openProfile(mg: MeetupGuest) {
    setProfileGuest(mg);
    setProfileOpen(true);
  }
  const [sort, setSort] = useState<GuestSort>(DEFAULT_GUEST_SORT);
  const [filters, setFilters] = useState<GuestFilters>(DEFAULT_GUEST_FILTERS);
  const relativeDay = useRelativeDay();

  // Column headers flip the direction of the active column, or switch to
  // another column ascending. There is no "unsorted" state: alphabetical is
  // the default.
  function handleSort(key: GuestSortKey) {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" },
    );
  }

  const meetupQ = useQuery({
    queryKey: meetupKey(orgId, id!),
    queryFn: async () => {
      const { data, error } = await api.GET(
        "/organizations/{org_id}/meetups/{meetup_id}",
        { params: { path: { org_id: orgId, meetup_id: id! } } },
      );
      if (error) throw new Error(t("failedLoadMeetup"));
      return data;
    },
    enabled: !!orgId && !!id,
    refetchInterval: 30_000,
  });

  const guestsQ = useQuery({
    queryKey: meetupGuestsKey(orgId, id!),
    queryFn: async () => {
      const { data, error } = await api.GET(
        "/organizations/{org_id}/meetups/{meetup_id}/guests",
        { params: { path: { org_id: orgId, meetup_id: id! } } },
      );
      if (error) throw new Error(t("failedLoadGuestList"));
      return data;
    },
    enabled: !!orgId && !!id,
    refetchInterval: 30_000,
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await api.POST(
        "/organizations/{org_id}/meetups/{meetup_id}/sync",
        { params: { path: { org_id: orgId, meetup_id: id! } } },
      );
      if (error) throw new Error(extractApiError(error, "Sync failed"));
      return data;
    },
    onSuccess: (data) => {
      invalidateMeetupGuests(queryClient, orgId, id!);
      invalidateAllGuestIdentities(queryClient);
      toast.success(
        t("syncDoneToast")
          .replace("{0}", String(data!.inserted))
          .replace("{1}", String(data!.skipped)),
      );
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const checkInMutation = useMutation({
    mutationFn: async (guest: MeetupGuest) => {
      const { data, error } = await api.POST(
        "/organizations/{org_id}/meetups/{meetup_id}/guests/{guest_id}/checkin",
        {
          params: {
            path: {
              org_id: orgId,
              meetup_id: id!,
              guest_id: guest.guest.id,
            },
          },
        },
      );
      if (error) throw new Error(extractApiError(error, "Check-in failed"));
      return data;
    },
    onSuccess: (data) => {
      invalidateMeetupGuests(queryClient, orgId, id!);
      toast.success(
        t("checkedInToast")
          .replace("{0}", data!.guest.displayname)
          .replace("{1}", ordinal(data!.arrival_order)),
      );
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const meetup = meetupQ.data;
  const isFinalized = meetup?.is_finalized ?? false;
  const requiresPayment = meetup?.requires_payment ?? false;
  const paymentStateKnown = meetupQ.isSuccess;
  const rawGuests = guestsQ.data?.guests ?? [];
  const rsvpedIds = new Set(rawGuests.map((g) => g.guest.id));

  const viewed = viewGuestList(rawGuests, filters, sort, requiresPayment);

  const {
    search,
    setSearch,
    filtered: guests,
  } = useGuestSearch(viewed, rsvpGuest);

  function rowState(mg: MeetupGuest) {
    const isExempt = isPaymentExempt(mg.rsvp.guest_type);
    return {
      isExempt,
      isBlockedByPayment:
        !paymentStateKnown ||
        (requiresPayment && !isExempt && !mg.rsvp.has_paid),
      isCheckingIn:
        checkInMutation.isPending &&
        checkInMutation.variables?.guest.id === mg.guest.id,
    };
  }

  // `meta` is an extra line under the name, in the same text column.
  function renderIdentity(mg: MeetupGuest, meta?: React.ReactNode) {
    return (
      <div className="flex items-center gap-3 min-w-0">
        <GuestAvatar
          name={mg.guest.displayname}
          src={mg.guest.mazmo_profile?.avatar_url}
        />
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-x-2 gap-y-1 flex-wrap">
            <button
              type="button"
              onClick={() => openProfile(mg)}
              className={cn(
                "rounded-sm text-left font-medium underline-offset-4 outline-none break-words hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50",
                mg.guest.is_banned && "text-destructive",
              )}
            >
              {mg.guest.displayname}
            </button>
            <span className="text-muted-foreground text-sm break-all">
              {mg.guest.mazmo_handle
                ? `@${mg.guest.mazmo_handle}`
                : t("noMazmoHandle")}
            </span>
            <PronounPill pronoun={mg.guest.mazmo_profile?.pronoun} />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap empty:hidden">
            <GuestTypeBadge guestType={mg.rsvp.guest_type} />
            {mg.rsvp.cancelled_rsvp && (
              <Badge variant="outline">{t("rsvpCancelled")}</Badge>
            )}
            {mg.rsvp.is_walkin && (
              <Badge variant="outline">{t("walkinLabel")}</Badge>
            )}
            {mg.guest.is_banned && (
              <Badge variant="destructive">{t("banned")}</Badge>
            )}
            <MazmoFlagBadges profile={mg.guest.mazmo_profile} />
          </div>
          {meta}
        </div>
      </div>
    );
  }

  function renderPaymentStatus(mg: MeetupGuest) {
    return (
      <PaymentStatus
        guest={mg}
        isExempt={rowState(mg).isExempt}
        isOrgAdmin={isOrgAdmin}
        onUndoPayment={() => setUndoPaymentTarget(mg)}
      />
    );
  }

  // Null when there is nothing to collect from this guest, or when the
  // meetup is finalized and the backend would refuse the payment.
  function renderMarkPaid(mg: MeetupGuest) {
    if (
      !requiresPayment ||
      !isOrgAdmin ||
      isFinalized ||
      rowState(mg).isExempt ||
      mg.rsvp.has_paid
    )
      return null;
    return (
      <Button variant="outline" size="sm" onClick={() => setMarkPaidTarget(mg)}>
        {t("markPaid")}
      </Button>
    );
  }

  // Null once the guest is in. `blockedHintId` names a visible line that
  // already says why a blocked check-in is blocked; without one the button
  // carries its own hidden explanation.
  function renderCheckIn(mg: MeetupGuest, blockedHintId?: string) {
    if (mg.rsvp.has_arrived) return null;
    const { isBlockedByPayment, isCheckingIn } = rowState(mg);
    return isBlockedByPayment ? (
      <span title={t("checkInBlockedUnpaid")} className="inline-flex">
        <Button
          size="sm"
          variant="secondary"
          disabled
          aria-describedby={blockedHintId ?? `checkin-blocked-${mg.guest.id}`}
        >
          {t("checkIn")}
        </Button>
        {!blockedHintId && (
          <span id={`checkin-blocked-${mg.guest.id}`} className="sr-only">
            {t("checkInBlockedUnpaid")}
          </span>
        )}
      </span>
    ) : (
      <>
        <Button
          size="sm"
          variant={mg.guest.is_banned ? "destructive" : "default"}
          onClick={() => {
            if (mg.guest.is_banned) {
              setBannedTarget(mg);
            } else {
              checkInMutation.mutate(mg);
            }
          }}
          disabled={checkInMutation.isPending || isFinalized}
          title={isFinalized ? t("checkInBlockedFinalized") : undefined}
          aria-describedby={
            isFinalized ? `checkin-finalized-${mg.guest.id}` : undefined
          }
        >
          {isCheckingIn ? t("checkingIn") : t("checkIn")}
        </Button>
        {isFinalized && (
          <span id={`checkin-finalized-${mg.guest.id}`} className="sr-only">
            {t("checkInBlockedFinalized")}
          </span>
        )}
      </>
    );
  }

  function renderRowMenu(mg: MeetupGuest) {
    return (
      <GuestRowActions
        guest={mg}
        orgId={orgId}
        meetupId={id!}
        isOrgAdmin={isOrgAdmin}
        isFinalized={isFinalized}
        onViewProfile={() => openProfile(mg)}
      />
    );
  }

  // The id of the card's unpaid line, or undefined when the card has none.
  function unpaidLineId(mg: MeetupGuest) {
    const { has_paid } = mg.rsvp;
    return requiresPayment &&
      paymentStateKnown &&
      !rowState(mg).isExempt &&
      !has_paid
      ? `unpaid-${mg.guest.id}`
      : undefined;
  }

  // One tinted line per state the card shows: in, then paid, exempt or
  // owing. A guest who is not in gets no check-in line, since the "Check in"
  // step already says so.
  function renderCardStatuses(mg: MeetupGuest) {
    const { has_arrived, arrival_time, arrival_order, has_paid, paid_at } =
      mg.rsvp;
    const unpaidId = unpaidLineId(mg);
    return (
      <>
        {has_arrived && (
          <GuestStatusLine
            tone="done"
            icon={Check}
            action={
              <InlineUndo onClick={() => setUndoTarget(mg)}>
                {t("undo")}
              </InlineUndo>
            }
          >
            {arrival_order != null && (
              <span className="mr-2 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold">
                {ordinal(arrival_order)}
              </span>
            )}
            <span className="font-medium">{t("statusCheckedIn")}</span>
            {arrival_time && (
              <>
                {" "}
                <span className="whitespace-nowrap">
                  {formatDateTime(arrival_time)}
                </span>
              </>
            )}
          </GuestStatusLine>
        )}
        {requiresPayment &&
          (has_paid ? (
            <GuestStatusLine
              tone="paid"
              icon={Banknote}
              action={
                isOrgAdmin && (
                  <InlineUndo onClick={() => setUndoPaymentTarget(mg)}>
                    {t("undoPayment")}
                  </InlineUndo>
                )
              }
            >
              <span className="font-medium">{t("statusPaid")}</span>
              {paid_at && (
                <>
                  {" "}
                  <span className="whitespace-nowrap">
                    {formatDateTime(paid_at)}
                  </span>
                </>
              )}
            </GuestStatusLine>
          ) : rowState(mg).isExempt ? (
            <GuestStatusLine tone="neutral">
              {t("paymentExempt")}
            </GuestStatusLine>
          ) : (
            unpaidId && (
              <GuestStatusLine tone="missing" icon={Banknote} id={unpaidId}>
                <span className="font-medium">{t("statusUnpaid")}</span>
              </GuestStatusLine>
            )
          ))}
      </>
    );
  }

  function renderCard(mg: MeetupGuest) {
    const markPaid = renderMarkPaid(mg);
    // Once finalized the header says the door is closed, so the cards drop
    // their steps band instead of showing dead buttons.
    const checkIn = isFinalized ? null : renderCheckIn(mg, unpaidLineId(mg));
    return (
      <GuestCard
        key={mg.guest.id}
        identity={renderIdentity(
          mg,
          <p className="text-xs text-muted-foreground">
            <span className="font-medium">{t("rsvp")}</span>{" "}
            {formatDateTime(mg.rsvp.rsvp_time)}
          </p>,
        )}
        menu={renderRowMenu(mg)}
        statuses={renderCardStatuses(mg)}
        actions={
          markPaid || checkIn ? (
            <>
              {markPaid}
              {checkIn}
            </>
          ) : null
        }
        dimmed={mg.rsvp.cancelled_rsvp}
      />
    );
  }

  function renderArrivalOrder(mg: MeetupGuest) {
    return mg.rsvp.arrival_order != null ? (
      <Badge variant="secondary">{ordinal(mg.rsvp.arrival_order)}</Badge>
    ) : (
      "—"
    );
  }

  if (!activeOrg) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">{t("noOrganization")}</p>
      </div>
    );
  }

  const timing = meetup ? meetupTiming(meetup.date) : "upcoming";

  return (
    <div className="@container space-y-6">
      {/* Header */}
      {meetupQ.isLoading ? (
        <div className="flex items-center gap-4 rounded-xl border p-4 @md:p-6">
          <Skeleton className="size-20 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
      ) : meetupQ.isError || !meetup ? (
        <Alert variant="destructive">
          <AlertDescription className="flex items-center justify-between">
            {t("failedLoadMeetup")}
            <Button variant="ghost" size="sm" onClick={() => meetupQ.refetch()}>
              {t("retry")}
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        <section
          aria-labelledby="meetup-title"
          className="relative isolate overflow-hidden rounded-xl border bg-card text-card-foreground"
        >
          <div
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute inset-x-0 top-0 -z-10 h-40",
              timing === "today"
                ? "bg-[radial-gradient(ellipse_at_top_left,--theme(--color-emerald-500/22%),transparent_65%)]"
                : "bg-[radial-gradient(ellipse_at_top_left,--theme(--color-foreground/7%),transparent_65%)]",
            )}
          />
          {/* Below @md everything stacks on one centered axis: the date
              tile, the title and dates, then the location and Mazmo link set
              apart by a rule. From @md the tile sits to the left, centered
              against the text column. */}
          <div className="flex flex-col items-center gap-3 px-4 py-5 text-center @md:grid @md:grid-cols-[auto_1fr] @md:items-start @md:gap-x-6 @md:gap-y-2 @md:px-6 @md:pt-6 @md:text-left">
            <div className="@md:row-span-2 @md:self-center">
              <DateTile date={meetup.date} timing={timing} size="lg" />
            </div>
            <div className="w-full min-w-0 space-y-2 @md:col-start-2">
              <h1
                id="meetup-title"
                className="text-2xl leading-tight font-semibold tracking-tight break-words @md:text-3xl"
              >
                {meetup.name}
              </h1>
              <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-sm text-muted-foreground @md:justify-start">
                <span>
                  {formatDate(meetup.date)}
                  {/* The "Today" badge already says it for today's meetup. */}
                  {timing !== "today" && (
                    <span className="text-muted-foreground/70">
                      {" "}
                      ({relativeDay(meetup.date)})
                    </span>
                  )}
                </span>
                <MeetupBadges meetup={meetup} timing={timing} />
              </div>
            </div>
            <div className="w-full min-w-0 space-y-2 border-t pt-3 empty:hidden @md:col-start-2 @md:border-t-0 @md:pt-0">
              <MeetupLocation
                orgId={orgId}
                meetup={meetup}
                canEdit={isOrgAdmin}
              />
              <MazmoUrlLink
                url={meetup.mazmo_meetup_url}
                text={t("goToMazmoEvent")}
                className="max-w-full text-xs text-muted-foreground"
              />
            </div>
          </div>
          {/* The meetup's tools, in a band of their own like the footer of
              the guest profile card. On phones the buttons stack centered at
              one width. On medium cards they fill an even two-column grid, so
              four tools never wrap three and one; once all of them fit they
              sit in one row from the left. Once finalized the door tools are
              gone and the band says so, rather than showing dead buttons. */}
          <div
            className={cn(
              "flex flex-col items-center gap-2 border-t bg-muted/30 px-4 py-3 @md:px-6 [&>button]:w-full [&>button]:max-w-72 @md:[&>button]:max-w-none",
              isFinalized
                ? "@md:flex-row @md:flex-wrap @md:[&>button]:w-auto"
                : "@md:grid @md:grid-cols-2 @4xl:flex @4xl:flex-row @4xl:[&>button]:w-auto",
            )}
          >
            {isFinalized ? (
              <div className="flex min-w-0 flex-1 basis-full items-start gap-2 text-sm @md:basis-0">
                <Lock
                  className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <p className="min-w-0">
                  {/* With no date, the Finalized badge above already says it. */}
                  {meetup.finalized_at && (
                    <>
                      <span className="font-medium">
                        {t("finalizedOn").replace(
                          "{0}",
                          formatDateTime(meetup.finalized_at),
                        )}
                      </span>{" "}
                    </>
                  )}
                  <span className="text-muted-foreground">
                    {t("finalizedLockedHint")}
                  </span>
                </p>
              </div>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => syncMutation.mutate()}
                  disabled={syncMutation.isPending}
                  className="gap-2"
                >
                  <RefreshCw
                    className={cn(syncMutation.isPending && "animate-spin")}
                    aria-hidden="true"
                  />
                  {t("syncFromMazmo")}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setWalkinOpen(true)}
                  className="gap-2"
                >
                  <UserPlus aria-hidden="true" />
                  {t("addWalkin")}
                </Button>
              </>
            )}
            {isOrgAdmin && (
              <>
                {!isFinalized && (
                  <Button
                    variant="outline"
                    onClick={() => setPaymentToggleOpen(true)}
                    className="gap-2"
                  >
                    <Banknote aria-hidden="true" />
                    {requiresPayment ? t("disablePayment") : t("enablePayment")}
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => setFinalizeOpen(true)}
                  className="gap-2"
                >
                  {isFinalized ? (
                    <LockOpen aria-hidden="true" />
                  ) : (
                    <Lock aria-hidden="true" />
                  )}
                  {isFinalized ? t("reopenMeetup") : t("finalizeMeetup")}
                </Button>
              </>
            )}
          </div>
        </section>
      )}

      {meetupQ.isSuccess && (
        <MeetupWeather orgId={orgId} meetupId={id!} canRefresh={isOrgAdmin} />
      )}

      {/* Stats */}
      {meetupQ.isSuccess && !guestsQ.isLoading && rawGuests.length > 0 && (
        <MeetupStats
          orgId={orgId}
          meetupId={id!}
          requiresPayment={requiresPayment}
        />
      )}

      {/* Search, filter and sort */}
      {!guestsQ.isLoading && rawGuests.length > 0 && (
        <GuestListToolbar
          search={search}
          onSearch={setSearch}
          filters={filters}
          onFilters={setFilters}
          sort={sort}
          onSort={setSort}
          requiresPayment={requiresPayment}
          shown={guests?.length ?? 0}
          total={rawGuests.length}
        />
      )}

      {/* Guest table */}
      {guestsQ.isError && (
        <Alert variant="destructive">
          <AlertDescription className="flex items-center justify-between">
            {t("failedLoadGuestList")}
            <Button variant="ghost" size="sm" onClick={() => guestsQ.refetch()}>
              {t("retry")}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {isDesktop ? (
        <div className="rounded-md border">
          <Table className="xl:table-fixed">
            <TableHeader>
              <TableRow>
                <SortableHead
                  col="arrival"
                  label={t("order")}
                  active={sort.key}
                  dir={sort.dir}
                  onSort={handleSort}
                  className="w-16 xl:w-[6%]"
                />
                <SortableHead
                  col="name"
                  label={t("guest")}
                  active={sort.key}
                  dir={sort.dir}
                  onSort={handleSort}
                  className={requiresPayment ? "xl:w-[32%]" : "xl:w-[44%]"}
                />
                <SortableHead
                  col="rsvp"
                  label={t("rsvp")}
                  active={sort.key}
                  dir={sort.dir}
                  onSort={handleSort}
                  className={requiresPayment ? "xl:w-[15%]" : "xl:w-[20%]"}
                />
                <SortableHead
                  col="status"
                  label={t("status")}
                  active={sort.key}
                  dir={sort.dir}
                  onSort={handleSort}
                  className={requiresPayment ? "xl:w-[13%]" : "xl:w-[18%]"}
                />
                {requiresPayment && (
                  <TableHead className="xl:w-[22%]">{t("payment")}</TableHead>
                )}
                <TableHead className="w-40">
                  <span className="sr-only">{t("actions")}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {guestsQ.isLoading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-8" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-48" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    {requiresPayment && (
                      <TableCell>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                    )}
                  </TableRow>
                ))}

              {!guestsQ.isLoading && rawGuests.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={requiresPayment ? 6 : 5}
                    className="text-center text-muted-foreground py-8"
                  >
                    {t("noGuestsSyncMazmo")}
                  </TableCell>
                </TableRow>
              )}

              {!guestsQ.isLoading &&
                rawGuests.length > 0 &&
                (guests?.length ?? 0) === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={requiresPayment ? 6 : 5}
                      className="text-center text-muted-foreground py-8"
                    >
                      {search.trim()
                        ? t("noGuestsMatchSearch")
                        : t("noGuestsMatchFilters")}
                    </TableCell>
                  </TableRow>
                )}

              {(guests ?? []).map((mg) => (
                <TableRow
                  key={mg.guest.id}
                  className={mg.rsvp.cancelled_rsvp ? "opacity-50" : ""}
                >
                  <TableCell className="text-muted-foreground text-sm">
                    {renderArrivalOrder(mg)}
                  </TableCell>
                  <TableCell>{renderIdentity(mg)}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDateTime(mg.rsvp.rsvp_time)}
                  </TableCell>
                  <TableCell>
                    <CheckInStatus guest={mg} />
                  </TableCell>
                  {requiresPayment && (
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-2">
                        {renderPaymentStatus(mg)}
                        {renderMarkPaid(mg)}
                      </div>
                    </TableCell>
                  )}
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      {mg.rsvp.has_arrived ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setUndoTarget(mg)}
                        >
                          {t("undo")}
                        </Button>
                      ) : (
                        renderCheckIn(mg)
                      )}
                      {renderRowMenu(mg)}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <ul className="space-y-2" aria-label={t("guestList")}>
          {guestsQ.isLoading &&
            Array.from({ length: 5 }).map((_, i) => (
              <li key={i}>
                <Skeleton className="h-44 w-full rounded-lg" />
              </li>
            ))}
          {!guestsQ.isLoading && rawGuests.length === 0 && (
            <li className="py-8 text-center text-sm text-muted-foreground">
              {t("noGuestsSyncMazmo")}
            </li>
          )}
          {!guestsQ.isLoading &&
            rawGuests.length > 0 &&
            (guests?.length ?? 0) === 0 && (
              <li className="py-8 text-center text-sm text-muted-foreground">
                {search.trim()
                  ? t("noGuestsMatchSearch")
                  : t("noGuestsMatchFilters")}
              </li>
            )}
          {(guests ?? []).map((mg) => renderCard(mg))}
        </ul>
      )}

      {undoTarget && (
        <UndoDialog
          guest={undoTarget}
          orgId={orgId}
          meetupId={id!}
          onClose={() => setUndoTarget(null)}
        />
      )}
      {bannedTarget && (
        <CheckInBannedDialog
          guest={bannedTarget}
          orgId={orgId}
          meetupId={id!}
          onClose={() => setBannedTarget(null)}
        />
      )}
      {walkinOpen && (
        <WalkinDialog
          orgId={orgId}
          meetupId={id!}
          alreadyRsvped={rsvpedIds}
          onClose={() => setWalkinOpen(false)}
        />
      )}
      {markPaidTarget && (
        <MarkPaidDialog
          guest={markPaidTarget}
          orgId={orgId}
          meetupId={id!}
          onClose={() => setMarkPaidTarget(null)}
        />
      )}
      {undoPaymentTarget && (
        <UndoPaymentDialog
          guest={undoPaymentTarget}
          orgId={orgId}
          meetupId={id!}
          onClose={() => setUndoPaymentTarget(null)}
        />
      )}
      <Sheet open={profileOpen} onOpenChange={setProfileOpen}>
        <SheetContent className="overflow-y-auto data-[side=right]:w-full data-[side=right]:sm:max-w-md">
          <SheetHeader className="sr-only">
            <SheetTitle>
              {t("guestProfileOf").replace(
                "{0}",
                profileGuest?.guest.displayname ?? "",
              )}
            </SheetTitle>
          </SheetHeader>
          {profileGuest && (
            <>
              <div className="px-4 pt-10">
                <GuestProfile
                  key={profileGuest.guest.id}
                  guestId={profileGuest.guest.id}
                  orgId={orgId}
                  orgName={activeOrg.org_name}
                  titleAs="h2"
                  knownBanned={profileGuest.guest.is_banned}
                />
              </div>
              <SheetFooter>
                <Link
                  to={`/guests/${profileGuest.guest.id}`}
                  className={buttonVariants({ variant: "outline" })}
                >
                  {t("openFullProfile")}
                </Link>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>
      {finalizeOpen && meetup && (
        <FinalizeMeetupDialog
          orgId={orgId}
          meetup={meetup}
          onClose={() => setFinalizeOpen(false)}
        />
      )}
      {paymentToggleOpen && (
        <PaymentRequirementDialog
          orgId={orgId}
          meetupId={id!}
          enabling={!requiresPayment}
          onClose={() => setPaymentToggleOpen(false)}
        />
      )}
    </div>
  );
}
