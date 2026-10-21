import { useId, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { extractApiError } from "@/api/errors";
import { toast } from "sonner";
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { api } from "@/api/client";
import { useOrg } from "@/lib/org";
import { groupMeetupsByTiming } from "@/lib/meetupTiming";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n";
import { MeetupRow } from "./MeetupListItem";
import type { components } from "@/api/types";

type Meetup = components["schemas"]["MeetupPublic"];

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

function SortButton({
  col,
  label,
  active,
  dir,
  onSort,
}: {
  col: string;
  label: string;
  active: string | null;
  dir: SortDir;
  onSort: (col: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSort(col)}
      aria-pressed={col === active}
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-1 transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        col === active ? "bg-muted text-foreground" : "text-muted-foreground",
      )}
    >
      {label}
      <SortIcon col={col} active={active} dir={dir} />
    </button>
  );
}

function MeetupGroup({
  title,
  meetups,
}: {
  title?: string;
  meetups: Meetup[];
}) {
  const headingId = useId();
  if (meetups.length === 0) return null;
  return (
    <section
      className="space-y-3"
      aria-labelledby={title ? headingId : undefined}
    >
      {title && (
        <h2
          id={headingId}
          className="text-sm font-medium text-muted-foreground"
        >
          {title}{" "}
          <span className="tabular-nums text-muted-foreground/70">
            ({meetups.length})
          </span>
        </h2>
      )}
      <ul className="divide-y overflow-hidden rounded-xl border bg-card">
        {meetups.map((meetup) => (
          <MeetupRow key={meetup.id} meetup={meetup} />
        ))}
      </ul>
    </section>
  );
}

function NewMeetupDialog({
  orgId,
  open,
  onClose,
}: {
  orgId: string;
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [requiresPayment, setRequiresPayment] = useState(false);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await api.POST(
        "/organizations/{org_id}/meetups/",
        {
          params: { path: { org_id: orgId } },
          body: {
            name,
            mazmo_meetup_url: url,
            requires_payment: requiresPayment,
          },
        },
      );
      if (error)
        throw new Error(extractApiError(error, t("failedCreateMeetup")));
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["meetups", orgId] });
      toast.success(t("meetupCreated"));
      setName("");
      setUrl("");
      setRequiresPayment(false);
      onClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("newMeetup")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <label htmlFor="meetup-name" className="text-sm font-medium">
              {t("name")}
            </label>
            <Input
              id="meetup-name"
              placeholder="Alter #42 — Octubre"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="meetup-url" className="text-sm font-medium">
              {t("mazmoUrl")}
            </label>
            <Input
              id="meetup-url"
              placeholder="https://mazmo.net/eventos-reuniones-argentina/alter-..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="meetup-requires-payment"
              checked={requiresPayment}
              onCheckedChange={(checked) => setRequiresPayment(checked)}
            />
            <label
              htmlFor="meetup-requires-payment"
              className="text-sm font-medium"
            >
              {t("requiresPayment")}
            </label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!name || !url || mutation.isPending}
          >
            {mutation.isPending ? t("creating") : t("create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function MeetupsPage() {
  const { t } = useLanguage();
  const { activeOrg } = useOrg();
  const [searchParams, setSearchParams] = useSearchParams();
  // The dashboard's "New meetup" button links here with ?new=1.
  const [dialogOpen, setDialogOpen] = useState(
    () => searchParams.get("new") === "1",
  );
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const orgId = activeOrg?.org_id ?? "";

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["meetups", orgId],
    queryFn: async () => {
      const { data, error } = await api.GET(
        "/organizations/{org_id}/meetups/",
        { params: { path: { org_id: orgId } } },
      );
      if (error) throw new Error(t("failedLoadMeetups"));
      return data;
    },
    enabled: !!orgId,
  });

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

  const meetups = sortCol
    ? (data?.meetups ?? []).slice().sort((a, b) => {
        let cmp = 0;
        if (sortCol === "name") cmp = a.name.localeCompare(b.name);
        else if (sortCol === "date") cmp = a.date.localeCompare(b.date);
        return sortDir === "asc" ? cmp : -cmp;
      })
    : (data?.meetups ?? []);
  const grouped = groupMeetupsByTiming(data?.meetups ?? []);

  if (!activeOrg) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">{t("noOrganization")}</p>
      </div>
    );
  }

  return (
    <div className="@container space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">{t("meetups")}</h1>
        <Button onClick={() => setDialogOpen(true)}>{t("newMeetup")}</Button>
      </div>

      {isError && (
        <Alert variant="destructive">
          <AlertDescription className="flex items-center justify-between">
            {t("failedLoadMeetups")}
            <Button variant="ghost" size="sm" onClick={() => refetch()}>
              {t("retry")}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center gap-1 text-sm">
        <span className="mr-1 text-muted-foreground">{t("sortBy")}</span>
        <SortButton
          col="name"
          label={t("name")}
          active={sortCol}
          dir={sortDir}
          onSort={handleSort}
        />
        <SortButton
          col="date"
          label={t("date")}
          active={sortCol}
          dir={sortDir}
          onSort={handleSort}
        />
      </div>

      {isLoading && (
        <ul className="divide-y overflow-hidden rounded-xl border bg-card">
          {Array.from({ length: 5 }).map((_, i) => (
            <li key={i} className="flex items-center gap-4 px-4 py-3">
              <Skeleton className="size-14 rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-56" />
              </div>
            </li>
          ))}
        </ul>
      )}

      {!isLoading && !isError && (data?.meetups.length ?? 0) === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-4 py-10 text-center">
          <p className="text-sm text-muted-foreground">
            {t("noMeetupsYetCreate")}
          </p>
          <Button variant="outline" onClick={() => setDialogOpen(true)}>
            {t("newMeetup")}
          </Button>
        </div>
      )}

      {/* With no sort picked, group by timing; a picked sort shows one flat
          list in that order. */}
      {sortCol ? (
        <MeetupGroup meetups={meetups} />
      ) : (
        <>
          <MeetupGroup
            title={t("upcomingMeetups")}
            meetups={grouped.upcoming}
          />
          <MeetupGroup title={t("pastMeetups")} meetups={grouped.past} />
        </>
      )}

      <NewMeetupDialog
        orgId={orgId}
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          if (searchParams.has("new")) setSearchParams({}, { replace: true });
        }}
      />
    </div>
  );
}
