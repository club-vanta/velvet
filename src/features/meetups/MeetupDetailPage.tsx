import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { extractApiError } from "@/api/errors";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Banknote,
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
import { GuestTypeBadge, MazmoFlagBadges } from "@/components/GuestBadges";
import { GuestProfile } from "@/features/guests/GuestProfile";
import { useAuth } from "@/auth/AuthContext";
import { api } from "@/api/client";
import { useOrg } from "@/lib/org";
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
import { useGuestSearch } from "@/hooks/useGuestSearch";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useRelativeDay } from "@/hooks/useRelativeDay";
import { isPaymentExempt } from "@/lib/guestType";
import {
  MAZMO_PRONOUN_LABEL,
  MAZMO_PRONOUN_SHORT,
  mazmoLabel,
} from "@/lib/mazmoProfile";
import {
  invalidateAllGuestIdentities,
  invalidateMeetupGuests,
  meetupGuestsKey,
} from "@/lib/queryKeys";
import { MeetupStats } from "./MeetupStats";
import { GuestRowActions } from "./GuestRowActions";
import { GuestListToolbar } from "./GuestListToolbar";
import { DateTile, MazmoUrlLink, MeetupBadges } from "./MeetupListItem";
import type { components } from "@/api/types";

type MeetupGuest = components["schemas"]["MeetupGuestPublic"];
type Guest = components["schemas"]["GuestPublic"];

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

function PaymentCell({
  guest,
  isExempt,
  isOrgAdmin,
  onMarkPaid,
  onUndoPayment,
  isFinalized,
}: {
  guest: MeetupGuest;
  isExempt: boolean;
  isOrgAdmin: boolean;
  isFinalized: boolean;
  onMarkPaid: () => void;
  onUndoPayment: () => void;
}) {
  const { t } = useLanguage();
  const { has_paid, paid_at } = guest.rsvp;

  // Exempt guests never need "Mark paid", but someone who paid before being
  // reclassified keeps "Undo payment" so a refund can be recorded.
  if (isExempt) {
    return (
      <div className="space-y-0.5">
        <Badge variant="outline" title={t("paymentExemptHint")}>
          {t("paymentExempt")}
        </Badge>
        {has_paid && (
          <div className="flex items-center gap-1 flex-wrap text-xs text-muted-foreground">
            <span>
              {t("paidBeforeExempt")}
              {paid_at ? ` · ${formatDateTime(paid_at)}` : ""}
            </span>
            {isOrgAdmin && (
              <Button
                variant="link"
                size="xs"
                className="h-auto px-0 text-xs"
                onClick={onUndoPayment}
              >
                {t("undoPayment")}
              </Button>
            )}
          </div>
        )}
      </div>
    );
  }

  if (has_paid) {
    return (
      <div className="space-y-0.5">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge>{t("paid")}</Badge>
          {isOrgAdmin && (
            <Button variant="ghost" size="sm" onClick={onUndoPayment}>
              {t("undoPayment")}
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {paid_at ? formatDateTime(paid_at) : ""}
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Badge variant="secondary">{t("paymentPending")}</Badge>
      {isOrgAdmin && (
        <Button
          variant="outline"
          size="sm"
          onClick={onMarkPaid}
          disabled={isFinalized}
        >
          {t("markPaid")}
        </Button>
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
        queryKey: ["meetup", orgId, meetupId],
      });
      void queryClient.invalidateQueries({ queryKey: ["meetups", orgId] });
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
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const allGuestsQ = useQuery({
    queryKey: ["guests"],
    queryFn: async () => {
      const { data, error } = await api.GET("/guests/");
      if (error) throw new Error("Failed to load guests");
      return data;
    },
  });

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

  const q = search.trim().toLowerCase();
  const candidates = (allGuestsQ.data?.guests ?? []).filter(
    (g) =>
      !alreadyRsvped.has(g.id) &&
      (q === "" ||
        g.displayname.toLowerCase().includes(q) ||
        (g.mazmo_handle ?? "").toLowerCase().includes(q)),
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
              {q ? t("noEligibleGuests") : t("allGuestsOnList")}
            </p>
          )}
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {candidates.map((g) => (
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
  const { user } = useAuth();
  const isSiteAdmin = user?.role.name === "SITE_ADMIN";
  const isOrgAdmin = isSiteAdmin || activeOrg?.role === "ADMIN";
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
    queryKey: ["meetup", orgId, id],
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
  } = useGuestSearch(viewed, (g) => ({
    displayname: g.guest.displayname,
    mazmoHandle: g.guest.mazmo_handle,
  }));

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

  function renderIdentity(mg: MeetupGuest) {
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
            {mg.guest.mazmo_profile?.pronoun && (
              <span
                title={`${t("pronouns")}: ${mazmoLabel(MAZMO_PRONOUN_LABEL, mg.guest.mazmo_profile.pronoun, t)}`}
                className="rounded-full border border-foreground/15 px-2 py-px text-xs font-medium"
              >
                <span className="sr-only">{t("pronouns")}: </span>
                {mazmoLabel(
                  MAZMO_PRONOUN_SHORT,
                  mg.guest.mazmo_profile.pronoun,
                  t,
                )}
              </span>
            )}
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
        </div>
      </div>
    );
  }

  function renderStatus(mg: MeetupGuest) {
    return mg.rsvp.has_arrived ? (
      <div className="space-y-0.5">
        <Badge>{t("checkedIn")}</Badge>
        <p className="text-xs text-muted-foreground">
          {mg.rsvp.arrival_time ? formatDateTime(mg.rsvp.arrival_time) : ""}
        </p>
      </div>
    ) : (
      <Badge variant="secondary">{t("pending")}</Badge>
    );
  }

  function renderPayment(mg: MeetupGuest) {
    return (
      <PaymentCell
        guest={mg}
        isExempt={rowState(mg).isExempt}
        isOrgAdmin={isOrgAdmin}
        onMarkPaid={() => setMarkPaidTarget(mg)}
        isFinalized={isFinalized}
        onUndoPayment={() => setUndoPaymentTarget(mg)}
      />
    );
  }

  function renderActions(mg: MeetupGuest) {
    const { isBlockedByPayment, isCheckingIn } = rowState(mg);
    return (
      <div className="flex items-center gap-1 justify-end">
        {mg.rsvp.has_arrived ? (
          <Button variant="ghost" size="sm" onClick={() => setUndoTarget(mg)}>
            {t("undo")}
          </Button>
        ) : isBlockedByPayment ? (
          <span title={t("checkInBlockedUnpaid")} className="inline-flex">
            <Button
              size="sm"
              variant="secondary"
              disabled
              aria-describedby={`checkin-blocked-${mg.guest.id}`}
            >
              {t("checkIn")}
            </Button>
            <span id={`checkin-blocked-${mg.guest.id}`} className="sr-only">
              {t("checkInBlockedUnpaid")}
            </span>
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
        )}
        <GuestRowActions
          guest={mg}
          orgId={orgId}
          meetupId={id!}
          isOrgAdmin={isOrgAdmin}
          isFinalized={isFinalized}
          onViewProfile={() => openProfile(mg)}
        />
      </div>
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
          <div className="flex items-start gap-4 px-4 pt-5 pb-5 @md:items-center @md:gap-6 @md:px-6 @md:pt-6">
            <DateTile date={meetup.date} timing={timing} size="lg" />
            <div className="min-w-0 flex-1 space-y-2">
              <h1
                id="meetup-title"
                className="text-2xl leading-tight font-semibold tracking-tight break-words @md:text-3xl"
              >
                {meetup.name}
              </h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-muted-foreground">
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
              <MazmoUrlLink
                url={meetup.mazmo_meetup_url}
                className="max-w-full text-xs text-muted-foreground"
              />
            </div>
          </div>
          {/* The meetup's tools, in a band of their own like the footer of
              the guest profile card. Payment is a setting, not a door task,
              so it sits apart on the right. */}
          <div className="flex flex-wrap items-center gap-2 border-t bg-muted/30 px-4 py-3 @md:px-6">
            <Button
              variant="outline"
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending || isFinalized}
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
              disabled={isFinalized}
              className="gap-2"
            >
              <UserPlus aria-hidden="true" />
              {t("addWalkin")}
            </Button>
            {isOrgAdmin && (
              <Button
                variant="ghost"
                onClick={() => setPaymentToggleOpen(true)}
                disabled={isFinalized}
                className="gap-2 @md:ml-auto"
              >
                <Banknote aria-hidden="true" />
                {requiresPayment ? t("disablePayment") : t("enablePayment")}
              </Button>
            )}
          </div>
        </section>
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
                  <TableCell>{renderStatus(mg)}</TableCell>
                  {requiresPayment && (
                    <TableCell>{renderPayment(mg)}</TableCell>
                  )}
                  <TableCell>{renderActions(mg)}</TableCell>
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
                <Skeleton className="h-28 w-full rounded-lg" />
              </li>
            ))}
          {!guestsQ.isLoading && rawGuests.length === 0 && (
            <li className="text-center text-sm text-muted-foreground py-8">
              {t("noGuestsSyncMazmo")}
            </li>
          )}
          {!guestsQ.isLoading &&
            rawGuests.length > 0 &&
            (guests?.length ?? 0) === 0 && (
              <li className="text-center text-sm text-muted-foreground py-8">
                {search.trim()
                  ? t("noGuestsMatchSearch")
                  : t("noGuestsMatchFilters")}
              </li>
            )}
          {(guests ?? []).map((mg) => (
            <li
              key={mg.guest.id}
              className={cn(
                // Stacked on phones; one row once the list is wide enough,
                // with fixed-width columns so rows line up like a table.
                "flex flex-col gap-3 rounded-lg border p-3 @3xl:flex-row @3xl:items-center @3xl:gap-4",
                mg.rsvp.cancelled_rsvp && "opacity-50",
              )}
            >
              <div className="flex min-w-0 flex-1 items-start justify-between gap-2 @3xl:items-center">
                {renderIdentity(mg)}
                {mg.rsvp.arrival_order != null && (
                  <span className="shrink-0">{renderArrivalOrder(mg)}</span>
                )}
              </div>
              <div className="flex items-end justify-between gap-2 @3xl:contents">
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-2 @3xl:flex-none @3xl:flex-nowrap @3xl:gap-4">
                  <p className="text-xs text-muted-foreground @3xl:order-first @3xl:w-40 @3xl:whitespace-nowrap">
                    <span className="font-medium">{t("rsvp")}</span>{" "}
                    {formatDateTime(mg.rsvp.rsvp_time)}
                  </p>
                  <div className="@3xl:w-32">{renderStatus(mg)}</div>
                  {requiresPayment && (
                    <div className="@3xl:w-40">{renderPayment(mg)}</div>
                  )}
                </div>
                <div className="shrink-0 @3xl:w-36">{renderActions(mg)}</div>
              </div>
            </li>
          ))}
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
