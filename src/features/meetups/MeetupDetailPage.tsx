import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { extractApiError } from "@/api/errors";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ExternalLink,
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
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n";
import { useGuestSearch } from "@/hooks/useGuestSearch";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { isPaymentExempt } from "@/lib/guestType";
import { invalidateMeetupGuests, meetupGuestsKey } from "@/lib/queryKeys";
import { MeetupStats } from "./MeetupStats";
import { GuestRowActions } from "./GuestRowActions";
import type { components } from "@/api/types";

type MeetupGuest = components["schemas"]["MeetupGuestPublic"];
type Guest = components["schemas"]["GuestPublic"];

type SortDir = "asc" | "desc";

function SortIcon({
  col,
  active,
  dir,
}: {
  col: string;
  active: string | null;
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
  col: string;
  label: string;
  active: string | null;
  dir: SortDir;
  onSort: (col: string) => void;
  className?: string;
}) {
  return (
    <TableHead className={className}>
      <button
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
}: {
  guest: MeetupGuest;
  isExempt: boolean;
  isOrgAdmin: boolean;
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
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" title={t("paymentExemptHint")}>
            {t("paymentExempt")}
          </Badge>
          {has_paid && <Badge variant="secondary">{t("paid")}</Badge>}
          {has_paid && isOrgAdmin && (
            <Button variant="ghost" size="sm" onClick={onUndoPayment}>
              {t("undoPayment")}
            </Button>
          )}
        </div>
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
        <Button variant="outline" size="sm" onClick={onMarkPaid}>
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
        `${data!.guest.displayname} checked in (${ordinal(data!.arrival_order)})`,
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
      toast.success(`${guest.displayname} added as walk-in`);
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
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [undoTarget, setUndoTarget] = useState<MeetupGuest | null>(null);
  const [bannedTarget, setBannedTarget] = useState<MeetupGuest | null>(null);
  const [walkinOpen, setWalkinOpen] = useState(false);
  const [markPaidTarget, setMarkPaidTarget] = useState<MeetupGuest | null>(
    null,
  );
  const [undoPaymentTarget, setUndoPaymentTarget] =
    useState<MeetupGuest | null>(null);
  const [paymentToggleOpen, setPaymentToggleOpen] = useState(false);
  const [profileGuestId, setProfileGuestId] = useState<string | null>(null);
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  function handleSort(col: string) {
    if (col === sortCol) {
      if (sortDir === "asc") setSortDir("desc");
      else {
        setSortCol(null);
        setSortDir("asc");
      }
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
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
      toast.success(
        `Synced — ${data!.inserted} new guests added, ${data!.skipped} skipped`,
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
        `${data!.guest.displayname} checked in (${ordinal(data!.arrival_order)})`,
      );
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const meetup = meetupQ.data;
  const requiresPayment = meetup?.requires_payment ?? false;
  const paymentStateKnown = meetupQ.isSuccess;
  const rawGuests = guestsQ.data?.guests ?? [];
  const rsvpedIds = new Set(rawGuests.map((g) => g.guest.id));

  // The API orders by rsvp_time only, so guests with the same rsvp_time can
  // swap places after any refetch. Tie-break on id to keep rows still.
  const byRsvpTime = (a: MeetupGuest, b: MeetupGuest) =>
    a.rsvp.rsvp_time.localeCompare(b.rsvp.rsvp_time) ||
    a.guest.id.localeCompare(b.guest.id);

  const sorted = rawGuests.slice().sort((a, b) => {
    if (!sortCol) return byRsvpTime(a, b);
    let cmp = 0;
    if (sortCol === "order")
      cmp =
        (a.rsvp.arrival_order ?? Number.MAX_SAFE_INTEGER) -
        (b.rsvp.arrival_order ?? Number.MAX_SAFE_INTEGER);
    else if (sortCol === "guest")
      cmp = a.guest.displayname.localeCompare(b.guest.displayname);
    else if (sortCol === "rsvp")
      cmp = a.rsvp.rsvp_time.localeCompare(b.rsvp.rsvp_time);
    else if (sortCol === "status")
      cmp = Number(a.rsvp.has_arrived) - Number(b.rsvp.has_arrived);
    return (sortDir === "asc" ? cmp : -cmp) || byRsvpTime(a, b);
  });

  const {
    search,
    setSearch,
    filtered: guests,
  } = useGuestSearch(sorted, (g) => ({
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
              onClick={() => setProfileGuestId(mg.guest.id)}
              className={cn(
                "text-left font-medium underline-offset-4 hover:underline focus-visible:underline outline-none break-words",
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
          </div>
          <div className="flex items-center gap-1.5 flex-wrap empty:hidden">
            <GuestTypeBadge guestType={mg.rsvp.guest_type} />
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
            disabled={checkInMutation.isPending}
          >
            {isCheckingIn ? t("checkingIn") : t("checkIn")}
          </Button>
        )}
        <GuestRowActions
          guest={mg}
          orgId={orgId}
          meetupId={id!}
          isOrgAdmin={isOrgAdmin}
          isFinalized={meetup?.is_finalized ?? false}
          onViewProfile={() => setProfileGuestId(mg.guest.id)}
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

  return (
    <div className="space-y-6">
      {/* Header */}
      {meetupQ.isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
      ) : meetupQ.isError ? (
        <Alert variant="destructive">
          <AlertDescription className="flex items-center justify-between">
            {t("failedLoadMeetup")}
            <Button variant="ghost" size="sm" onClick={() => meetupQ.refetch()}>
              {t("retry")}
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-4">
          <div className="space-y-1 min-w-0">
            <h1 className="text-2xl font-semibold">{meetup?.name}</h1>
            <p className="text-sm text-muted-foreground">
              {formatDate(meetup?.date ?? "")}
            </p>
            <a
              href={meetup?.mazmo_meetup_url}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors max-w-full"
            >
              <span className="truncate">{meetup?.mazmo_meetup_url}</span>
              <ExternalLink className="h-3 w-3 shrink-0" />
            </a>
          </div>
          <div className="flex flex-wrap gap-2 md:shrink-0 md:justify-end">
            {isOrgAdmin && (
              <Button
                variant="outline"
                onClick={() => setPaymentToggleOpen(true)}
                disabled={meetup?.is_finalized}
              >
                {requiresPayment ? t("disablePayment") : t("enablePayment")}
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => setWalkinOpen(true)}
              className="gap-2"
            >
              <UserPlus className="h-4 w-4" />
              {t("addWalkin")}
            </Button>
            <Button
              variant="outline"
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
              className="gap-2"
            >
              <RefreshCw
                className={`h-4 w-4 ${syncMutation.isPending ? "animate-spin" : ""}`}
              />
              {t("syncFromMazmo")}
            </Button>
          </div>
        </div>
      )}

      {/* Stats */}
      {meetupQ.isSuccess && !guestsQ.isLoading && rawGuests.length > 0 && (
        <MeetupStats
          orgId={orgId}
          meetupId={id!}
          requiresPayment={requiresPayment}
        />
      )}

      {/* Search */}
      {!guestsQ.isLoading && rawGuests.length > 0 && (
        <Input
          placeholder={t("searchGuestList")}
          aria-label={t("searchGuestList")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-2"
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
                  col="order"
                  label={t("order")}
                  active={sortCol}
                  dir={sortDir}
                  onSort={handleSort}
                  className="w-16 xl:w-[6%]"
                />
                <SortableHead
                  col="guest"
                  label={t("guest")}
                  active={sortCol}
                  dir={sortDir}
                  onSort={handleSort}
                  className={requiresPayment ? "xl:w-[32%]" : "xl:w-[44%]"}
                />
                <SortableHead
                  col="rsvp"
                  label={t("rsvp")}
                  active={sortCol}
                  dir={sortDir}
                  onSort={handleSort}
                  className={requiresPayment ? "xl:w-[15%]" : "xl:w-[20%]"}
                />
                <SortableHead
                  col="status"
                  label={t("status")}
                  active={sortCol}
                  dir={sortDir}
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
                      {t("noGuestsMatchSearch")}
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
        <ul className="space-y-2" aria-label={t("guest")}>
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
                {t("noGuestsMatchSearch")}
              </li>
            )}
          {(guests ?? []).map((mg) => (
            <li
              key={mg.guest.id}
              className={cn(
                "rounded-lg border p-3 space-y-3",
                mg.rsvp.cancelled_rsvp && "opacity-50",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                {renderIdentity(mg)}
                {mg.rsvp.arrival_order != null && (
                  <span className="shrink-0">{renderArrivalOrder(mg)}</span>
                )}
              </div>
              <div className="flex items-end justify-between gap-2">
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                  {renderStatus(mg)}
                  {requiresPayment && renderPayment(mg)}
                </div>
                <div className="shrink-0">{renderActions(mg)}</div>
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
      <Sheet
        open={profileGuestId !== null}
        onOpenChange={(open) => !open && setProfileGuestId(null)}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader className="sr-only">
            <SheetTitle>{t("guestProfile")}</SheetTitle>
          </SheetHeader>
          {profileGuestId && (
            <div className="px-4 pt-10">
              <GuestProfile
                key={profileGuestId}
                guestId={profileGuestId}
                orgId={orgId}
                orgName={activeOrg.org_name}
                titleAs="h2"
              />
            </div>
          )}
          {profileGuestId && (
            <SheetFooter>
              <Link
                to={`/guests/${profileGuestId}`}
                className={buttonVariants({ variant: "outline" })}
              >
                {t("openFullProfile")}
              </Link>
            </SheetFooter>
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
