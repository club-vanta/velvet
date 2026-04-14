import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { extractApiError } from "@/api/errors";
import { toast } from "sonner";
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { InputWithPrefix } from "@/components/ui/input-with-prefix";
import { useGuestSearch } from "@/hooks/useGuestSearch";
import { api } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n";
import type { components } from "@/api/types";

type Guest = components["schemas"]["GuestPublic"];
type BannedGuest = components["schemas"]["BannedGuestPublic"];

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

function BanDialog({ guest, onClose }: { guest: Guest; onClose: () => void }) {
  const { t } = useLanguage();
  const [reason, setReason] = useState("");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await api.PATCH("/guests/{mazmo_user_id}/ban", {
        params: { path: { mazmo_user_id: guest.mazmo_user_id } },
        body: { reason },
      });
      if (error) throw new Error(extractApiError(error, t("banFailed")));
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["guests"] });
      void queryClient.invalidateQueries({ queryKey: ["guests-banned"] });
      toast.success(`${guest.displayname} has been banned`);
      onClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t("banDialogTitle")} {guest.displayname}?
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <label htmlFor="ban-reason" className="text-sm font-medium">
            {t("reasonRequired")}
          </label>
          <Textarea
            id="ban-reason"
            placeholder={t("banReasonPlaceholder")}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
          />
          <p className="text-xs text-muted-foreground">
            {reason.trim().length}/500
          </p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button
            variant="destructive"
            onClick={() => mutation.mutate()}
            disabled={
              reason.trim().length < 5 ||
              reason.trim().length > 500 ||
              mutation.isPending
            }
          >
            {mutation.isPending ? t("banning") : t("banGuest")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddGuestDialog({ onClose }: { onClose: () => void }) {
  const { t } = useLanguage();
  const [username, setUsername] = useState("");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      const { data, error, response } = await api.POST("/guests/", {
        body: { username: username.trim() },
      });
      if (error) {
        if (response.status === 404) {
          throw new Error(
            "No se encontró el usuario en Mazmo. Revisá el handle.",
          );
        }
        if (response.status === 409) {
          throw new Error("Este guest ya está registrado en el sistema.");
        }
        if (response.status === 504) {
          throw new Error("No se pudo conectar a Mazmo. Intentá de nuevo.");
        }
        throw new Error(
          (error as { detail?: string }).detail ??
            "Algo salió mal. Intentá de nuevo.",
        );
      }
      return data;
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ["guests"] });
      toast.success(`${data?.displayname ?? "Guest"} agregado correctamente`);
      onClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("addNewGuest")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-1 py-2">
          <label htmlFor="guest-username" className="text-sm font-medium">
            {t("mazmoUsername")}
          </label>
          <InputWithPrefix
            id="guest-username"
            prefix="@"
            placeholder="cindydark"
            autoComplete="off"
            autoCapitalize="none"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={mutation.isPending}
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!username.trim() || mutation.isPending}
          >
            {mutation.isPending ? t("adding") : t("add")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AllGuestsTab({ isAdmin }: { isAdmin: boolean }) {
  const { t } = useLanguage();
  const [banTarget, setBanTarget] = useState<Guest | null>(null);
  const [sortCol, setSortCol] = useState<string | null>("displayname");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["guests"],
    queryFn: async () => {
      const { data, error } = await api.GET("/guests/");
      if (error) throw new Error("Failed to load guests");
      return data;
    },
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

  const sorted = sortCol
    ? data?.guests.slice().sort((a, b) => {
        let cmp = 0;
        if (sortCol === "displayname")
          cmp = a.displayname.localeCompare(b.displayname);
        else if (sortCol === "username")
          cmp = a.username.localeCompare(b.username);
        else if (sortCol === "mazmo_user_id")
          cmp = a.mazmo_user_id - b.mazmo_user_id;
        else if (sortCol === "status")
          cmp = Number(a.is_banned) - Number(b.is_banned);
        return sortDir === "asc" ? cmp : -cmp;
      })
    : data?.guests;

  const {
    search,
    setSearch,
    filtered: guests,
  } = useGuestSearch(sorted, (g) => ({
    displayname: g.displayname,
    username: g.username,
  }));

  return (
    <>
      {isError && (
        <Alert variant="destructive">
          <AlertDescription className="flex items-center justify-between">
            {t("failedLoadGuests")}
            <Button variant="ghost" size="sm" onClick={() => refetch()}>
              {t("retry")}
            </Button>
          </AlertDescription>
        </Alert>
      )}
      {!isLoading && (data?.guests.length ?? 0) > 0 && (
        <Input
          placeholder={t("searchGuestList")}
          aria-label={t("searchGuestList")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-2"
        />
      )}
      <div className="rounded-md border">
        <Table className="lg:table-fixed">
          <TableHeader>
            <TableRow>
              <SortableHead
                col="displayname"
                label={t("displayName")}
                active={sortCol}
                dir={sortDir}
                onSort={handleSort}
                className="lg:w-[37%]"
              />
              <SortableHead
                col="username"
                label={t("atUsername")}
                active={sortCol}
                dir={sortDir}
                onSort={handleSort}
                className="lg:w-[27%]"
              />
              <SortableHead
                col="mazmo_user_id"
                label={t("mazmoId")}
                active={sortCol}
                dir={sortDir}
                onSort={handleSort}
                className="lg:w-[12%]"
              />
              <SortableHead
                col="status"
                label={t("status")}
                active={sortCol}
                dir={sortDir}
                onSort={handleSort}
                className="lg:w-[14%]"
              />
              {isAdmin && <TableHead />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-40" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-28" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-16" />
                  </TableCell>
                  {isAdmin && (
                    <TableCell>
                      <Skeleton className="h-4 w-12" />
                    </TableCell>
                  )}
                </TableRow>
              ))}
            {/* Server returned an empty list — nothing to do with search, prompt to sync from Mazmo */}
            {!isLoading && (data?.guests.length ?? 0) === 0 && (
              <TableRow>
                <TableCell
                  colSpan={isAdmin ? 5 : 4}
                  className="text-center text-muted-foreground py-8"
                >
                  {t("noGuestsYet")}
                </TableCell>
              </TableRow>
            )}
            {/* The list has guests but every one was filtered out by the active search query */}
            {!isLoading &&
              (data?.guests.length ?? 0) > 0 &&
              (guests?.length ?? 0) === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={isAdmin ? 5 : 4}
                    className="text-center text-muted-foreground py-8"
                  >
                    {t("noGuestsMatchSearch")}
                  </TableCell>
                </TableRow>
              )}
            {guests?.map((g) => (
              <TableRow key={g.mazmo_user_id}>
                <TableCell className="font-medium">{g.displayname}</TableCell>
                <TableCell className="text-muted-foreground">
                  @{g.username}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {g.mazmo_user_id}
                </TableCell>
                <TableCell>
                  {g.is_banned ? (
                    <Badge variant="destructive">{t("banned")}</Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                {isAdmin && (
                  <TableCell>
                    {!g.is_banned && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setBanTarget(g)}
                      >
                        {t("ban")}
                      </Button>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {banTarget && (
        <BanDialog guest={banTarget} onClose={() => setBanTarget(null)} />
      )}
    </>
  );
}

function BannedGuestsTab({ isAdmin }: { isAdmin: boolean }) {
  const { t } = useLanguage();
  const [sortCol, setSortCol] = useState<string | null>("displayname");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["guests-banned"],
    queryFn: async () => {
      const { data, error } = await api.GET("/guests/banned");
      if (error) throw new Error("Failed to load banned guests");
      return data;
    },
  });

  const unbanMutation = useMutation({
    mutationFn: async (guest: BannedGuest) => {
      const { error } = await api.PATCH("/guests/{mazmo_user_id}/unban", {
        params: { path: { mazmo_user_id: guest.mazmo_user_id } },
      });
      if (error) throw new Error(extractApiError(error, t("unbanFailed")));
      return guest;
    },
    onSuccess: (guest) => {
      void queryClient.invalidateQueries({ queryKey: ["guests"] });
      void queryClient.invalidateQueries({ queryKey: ["guests-banned"] });
      toast.success(`${guest.displayname} unbanned`);
    },
    onError: (err: Error) => toast.error(err.message),
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

  const sorted = sortCol
    ? data?.guests.slice().sort((a, b) => {
        let cmp = 0;
        if (sortCol === "displayname")
          cmp = a.displayname.localeCompare(b.displayname);
        else if (sortCol === "username")
          cmp = a.username.localeCompare(b.username);
        else if (sortCol === "banned_at")
          cmp = (a.banned_at ?? "").localeCompare(b.banned_at ?? "");
        else if (sortCol === "banned_reason")
          cmp = (a.banned_reason ?? "").localeCompare(b.banned_reason ?? "");
        return sortDir === "asc" ? cmp : -cmp;
      })
    : data?.guests;

  const {
    search,
    setSearch,
    filtered: guests,
  } = useGuestSearch(sorted, (g) => ({
    displayname: g.displayname,
    username: g.username,
  }));

  return (
    <>
      {isError && (
        <Alert variant="destructive">
          <AlertDescription className="flex items-center justify-between">
            {t("failedLoadBanned")}
            <Button variant="ghost" size="sm" onClick={() => refetch()}>
              {t("retry")}
            </Button>
          </AlertDescription>
        </Alert>
      )}
      {!isLoading && (data?.guests.length ?? 0) > 0 && (
        <Input
          placeholder={t("searchGuestList")}
          aria-label={t("searchGuestList")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-2"
        />
      )}
      <div className="rounded-md border">
        <Table className="lg:table-fixed">
          <TableHeader>
            <TableRow>
              <SortableHead
                col="displayname"
                label={t("displayName")}
                active={sortCol}
                dir={sortDir}
                onSort={handleSort}
                className="lg:w-[28%]"
              />
              <SortableHead
                col="username"
                label={t("atUsername")}
                active={sortCol}
                dir={sortDir}
                onSort={handleSort}
                className="lg:w-[22%]"
              />
              <SortableHead
                col="banned_at"
                label={t("bannedAt")}
                active={sortCol}
                dir={sortDir}
                onSort={handleSort}
                className="lg:w-[17%]"
              />
              <SortableHead
                col="banned_reason"
                label={t("reason")}
                active={sortCol}
                dir={sortDir}
                onSort={handleSort}
                className="lg:w-[21%]"
              />
              {isAdmin && <TableHead />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-40" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-28" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-48" />
                  </TableCell>
                  {isAdmin && (
                    <TableCell>
                      <Skeleton className="h-4 w-16" />
                    </TableCell>
                  )}
                </TableRow>
              ))}
            {/* Server returned an empty list — nothing to do with search, prompt to sync from Mazmo */}
            {!isLoading && (data?.guests.length ?? 0) === 0 && (
              <TableRow>
                <TableCell
                  colSpan={isAdmin ? 5 : 4}
                  className="text-center text-muted-foreground py-8"
                >
                  {t("noBannedGuests")}
                </TableCell>
              </TableRow>
            )}
            {/* The list has guests but every one was filtered out by the active search query */}
            {!isLoading &&
              (data?.guests.length ?? 0) > 0 &&
              (guests?.length ?? 0) === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={isAdmin ? 5 : 4}
                    className="text-center text-muted-foreground py-8"
                  >
                    {t("noGuestsMatchSearch")}
                  </TableCell>
                </TableRow>
              )}
            {guests?.map((g) => (
              <TableRow key={g.mazmo_user_id}>
                <TableCell className="font-medium text-destructive">
                  {g.displayname}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  @{g.username}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {g.banned_at ? formatDateTime(g.banned_at) : "—"}
                </TableCell>
                <TableCell className="text-sm whitespace-normal overflow-hidden break-words">
                  {g.banned_reason}
                </TableCell>
                {isAdmin && (
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="px-0"
                      onClick={() => unbanMutation.mutate(g)}
                      disabled={unbanMutation.isPending}
                    >
                      {t("unban")}
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

export function GuestsPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const isAdmin = user?.role.name === "ADMIN";
  const [addGuestOpen, setAddGuestOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t("guests")}</h1>
        <Button onClick={() => setAddGuestOpen(true)}>
          {t("addNewGuest")}
        </Button>
      </div>
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">{t("allGuests")}</TabsTrigger>
          <TabsTrigger value="banned">{t("bannedGuests")}</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="mt-4">
          <AllGuestsTab isAdmin={isAdmin} />
        </TabsContent>
        <TabsContent value="banned" className="mt-4">
          <BannedGuestsTab isAdmin={isAdmin} />
        </TabsContent>
      </Tabs>
      {addGuestOpen && (
        <AddGuestDialog onClose={() => setAddGuestOpen(false)} />
      )}
    </div>
  );
}
