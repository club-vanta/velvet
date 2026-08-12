import { useState } from "react";
import { useParams } from "react-router-dom";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
import { ReasonDialog } from "@/components/ReasonDialog";
import { useAuth } from "@/auth/AuthContext";
import { api } from "@/api/client";
import { useOrg } from "@/lib/org";
import { formatDate, formatDateTime, ordinal } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n";
import { useGuestSearch } from "@/hooks/useGuestSearch";
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
      void queryClient.invalidateQueries({
        queryKey: ["meetup-guests", orgId, meetupId],
      });
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
      void queryClient.invalidateQueries({
        queryKey: ["meetup-guests", orgId, meetupId],
      });
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
      void queryClient.invalidateQueries({
        queryKey: ["meetup-guests", orgId, meetupId],
      });
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
      void queryClient.invalidateQueries({
        queryKey: ["meetup-guests", orgId, meetupId],
      });
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
      void queryClient.invalidateQueries({
        queryKey: ["meetup-guests", orgId, meetupId],
      });
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
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {g.displayname}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {g.mazmo_handle ? `@${g.mazmo_handle}` : t("noMazmoHandle")}
                  </p>
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
  const [undoTarget, setUndoTarget] = useState<MeetupGuest | null>(null);
  const [bannedTarget, setBannedTarget] = useState<MeetupGuest | null>(null);
  const [walkinOpen, setWalkinOpen] = useState(false);
  const [markPaidTarget, setMarkPaidTarget] = useState<MeetupGuest | null>(
    null,
  );
  const [undoPaymentTarget, setUndoPaymentTarget] =
    useState<MeetupGuest | null>(null);
  const [paymentToggleOpen, setPaymentToggleOpen] = useState(false);
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
    queryKey: ["meetup-guests", orgId, id],
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
      void queryClient.invalidateQueries({
        queryKey: ["meetup-guests", orgId, id],
      });
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
      void queryClient.invalidateQueries({
        queryKey: ["meetup-guests", orgId, id],
      });
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
  const arrivedCount = rawGuests.filter((g) => g.rsvp.has_arrived).length;
  const totalCount = rawGuests.length;
  const rsvpedIds = new Set(rawGuests.map((g) => g.guest.id));

  const sorted = sortCol
    ? rawGuests.slice().sort((a, b) => {
        let cmp = 0;
        if (sortCol === "order")
          cmp =
            (a.rsvp.arrival_order ?? Infinity) -
            (b.rsvp.arrival_order ?? Infinity);
        else if (sortCol === "guest")
          cmp = a.guest.displayname.localeCompare(b.guest.displayname);
        else if (sortCol === "rsvp")
          cmp = (a.rsvp.rsvp_time ?? "").localeCompare(b.rsvp.rsvp_time ?? "");
        else if (sortCol === "status")
          cmp = Number(a.rsvp.has_arrived) - Number(b.rsvp.has_arrived);
        return sortDir === "asc" ? cmp : -cmp;
      })
    : rawGuests;

  const {
    search,
    setSearch,
    filtered: guests,
  } = useGuestSearch(sorted, (g) => ({
    displayname: g.guest.displayname,
    mazmoHandle: g.guest.mazmo_handle,
  }));

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
          <div className="flex gap-2 shrink-0">
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

      {/* Progress */}
      {!guestsQ.isLoading && totalCount > 0 && (
        <div className="space-y-1">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>
              {arrivedCount} / {totalCount} guests checked in
            </span>
            <span>{Math.round((arrivedCount / totalCount) * 100)}%</span>
          </div>
          <Progress value={(arrivedCount / totalCount) * 100} />
        </div>
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
              <TableHead className="w-32" />
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

            {(guests ?? []).map((mg) => {
              const isBlockedByPayment =
                !paymentStateKnown || (requiresPayment && !mg.rsvp.has_paid);
              return (
                <TableRow
                  key={mg.guest.id}
                  className={mg.rsvp.cancelled_rsvp ? "opacity-50" : ""}
                >
                  <TableCell className="text-muted-foreground text-sm">
                    {mg.rsvp.arrival_order != null ? (
                      <Badge variant="secondary">
                        {ordinal(mg.rsvp.arrival_order)}
                      </Badge>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={
                          mg.guest.is_banned
                            ? "text-destructive font-medium"
                            : "font-medium"
                        }
                      >
                        {mg.guest.displayname}
                      </span>
                      <span className="text-muted-foreground text-sm">
                        {mg.guest.mazmo_handle
                          ? `@${mg.guest.mazmo_handle}`
                          : t("noMazmoHandle")}
                      </span>
                      {mg.rsvp.is_walkin && (
                        <Badge variant="outline" className="text-xs">
                          {t("walkinLabel")}
                        </Badge>
                      )}
                      {mg.guest.is_banned && (
                        <Badge variant="destructive">{t("banned")}</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDateTime(mg.rsvp.rsvp_time)}
                  </TableCell>
                  <TableCell>
                    {mg.rsvp.has_arrived ? (
                      <div className="space-y-0.5">
                        <Badge>{t("checkedIn")}</Badge>
                        <p className="text-xs text-muted-foreground">
                          {mg.rsvp.arrival_time
                            ? formatDateTime(mg.rsvp.arrival_time)
                            : ""}
                        </p>
                      </div>
                    ) : (
                      <Badge variant="secondary">{t("pending")}</Badge>
                    )}
                  </TableCell>
                  {requiresPayment && (
                    <TableCell>
                      {mg.rsvp.has_paid ? (
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge>{t("paid")}</Badge>
                            {isOrgAdmin && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setUndoPaymentTarget(mg)}
                              >
                                {t("undoPayment")}
                              </Button>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {mg.rsvp.paid_at
                              ? formatDateTime(mg.rsvp.paid_at)
                              : ""}
                          </p>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="secondary">
                            {t("paymentPending")}
                          </Badge>
                          {isOrgAdmin && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setMarkPaidTarget(mg)}
                            >
                              {t("markPaid")}
                            </Button>
                          )}
                        </div>
                      )}
                    </TableCell>
                  )}
                  <TableCell>
                    <div className="flex gap-2 justify-end">
                      {mg.rsvp.has_arrived ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setUndoTarget(mg)}
                        >
                          {t("undo")}
                        </Button>
                      ) : isBlockedByPayment ? (
                        <span
                          title={t("checkInBlockedUnpaid")}
                          className="inline-flex"
                        >
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled
                            aria-describedby={`checkin-blocked-${mg.guest.id}`}
                          >
                            {t("checkIn")}
                          </Button>
                          <span
                            id={`checkin-blocked-${mg.guest.id}`}
                            className="sr-only"
                          >
                            {t("checkInBlockedUnpaid")}
                          </span>
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          variant={
                            mg.guest.is_banned ? "destructive" : "default"
                          }
                          onClick={() => {
                            if (mg.guest.is_banned) {
                              setBannedTarget(mg);
                            } else {
                              checkInMutation.mutate(mg);
                            }
                          }}
                          disabled={checkInMutation.isPending}
                        >
                          {checkInMutation.isPending
                            ? t("checkingIn")
                            : t("checkIn")}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

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
