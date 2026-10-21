import { useState } from "react";
import { Link } from "react-router-dom";
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { extractApiError } from "@/api/errors";
import { toast } from "sonner";
import { ArrowUp, ArrowDown, ArrowUpDown, MoreHorizontal } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { InputWithPrefix } from "@/components/ui/input-with-prefix";
import { GuestAvatar } from "@/components/GuestAvatar";
import { MazmoFlagBadges } from "@/components/GuestBadges";
import {
  BanDialog,
  EditGuestDialog,
  LinkMazmoDialog,
  UnlinkMazmoDialog,
} from "./GuestDialogs";
import { useUnbanGuest } from "./useUnbanGuest";
import { useGuestSearch } from "@/hooks/useGuestSearch";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { api } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { useOrg } from "@/lib/org";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n";
import type { components } from "@/api/types";

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

function GuestNameCell({
  guest,
  className,
}: {
  guest: Pick<Guest, "id" | "displayname" | "mazmo_profile">;
  className?: string;
}) {
  return (
    <div className="flex items-center gap-3 min-w-0">
      <GuestAvatar
        name={guest.displayname}
        src={guest.mazmo_profile?.avatar_url}
      />
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
        <Link
          to={`/guests/${guest.id}`}
          className={cn(
            "truncate font-medium underline-offset-4 hover:underline",
            className,
          )}
        >
          {guest.displayname}
        </Link>
        <MazmoFlagBadges profile={guest.mazmo_profile} />
      </div>
    </div>
  );
}

function AddGuestDialog({ onClose }: { onClose: () => void }) {
  const { t } = useLanguage();
  const [tab, setTab] = useState<"mazmo" | "manual">("mazmo");
  const [username, setUsername] = useState("");
  const [displayname, setDisplayname] = useState("");
  const [instagram, setInstagram] = useState("");
  const queryClient = useQueryClient();

  const mazmoMutation = useMutation({
    mutationFn: async () => {
      const { data, error, response } = await api.POST("/guests/mazmo", {
        body: {
          username: username.trim(),
          instagram_username: instagram.trim() || null,
        },
      });
      if (error) {
        if (response.status === 404) throw new Error(t("mazmoUserNotFound"));
        if (response.status === 409)
          throw new Error(t("guestAlreadyRegistered"));
        if (response.status === 504) throw new Error(t("mazmoUnreachable"));
        throw new Error(extractApiError(error, t("somethingWentWrong")));
      }
      return data;
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ["guests"] });
      toast.success(
        `${data?.displayname ?? "Guest"} ${t("addedSuccessfully")}`,
      );
      onClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const manualMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await api.POST("/guests/manual", {
        body: {
          displayname: displayname.trim(),
          instagram_username: instagram.trim() || null,
        },
      });
      if (error)
        throw new Error(extractApiError(error, t("somethingWentWrong")));
      return data;
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ["guests"] });
      toast.success(
        `${data?.displayname ?? "Guest"} ${t("addedSuccessfully")}`,
      );
      onClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const isPending = mazmoMutation.isPending || manualMutation.isPending;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("addNewGuest")}</DialogTitle>
        </DialogHeader>
        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as "mazmo" | "manual")}
        >
          <TabsList>
            <TabsTrigger value="mazmo">{t("tabWithMazmo")}</TabsTrigger>
            <TabsTrigger value="manual">{t("tabManual")}</TabsTrigger>
          </TabsList>
          <TabsContent value="mazmo" className="space-y-3 py-2">
            <div className="space-y-1">
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
                disabled={isPending}
                // eslint-disable-next-line jsx-a11y/no-autofocus
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <label
                htmlFor="guest-instagram-mazmo"
                className="text-sm font-medium"
              >
                {t("instagramLabel")}
              </label>
              <Input
                id="guest-instagram-mazmo"
                placeholder={t("instagramPlaceholder")}
                autoComplete="off"
                autoCapitalize="none"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                disabled={isPending}
              />
            </div>
          </TabsContent>
          <TabsContent value="manual" className="space-y-3 py-2">
            <div className="space-y-1">
              <label
                htmlFor="guest-displayname"
                className="text-sm font-medium"
              >
                {t("displayName")}
              </label>
              <Input
                id="guest-displayname"
                placeholder={t("displaynamePlaceholder")}
                value={displayname}
                onChange={(e) => setDisplayname(e.target.value)}
                disabled={isPending}
              />
            </div>
            <div className="space-y-1">
              <label
                htmlFor="guest-instagram-manual"
                className="text-sm font-medium"
              >
                {t("instagramLabel")}
              </label>
              <Input
                id="guest-instagram-manual"
                placeholder={t("instagramPlaceholder")}
                autoComplete="off"
                autoCapitalize="none"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                disabled={isPending}
              />
            </div>
          </TabsContent>
        </Tabs>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          {tab === "mazmo" ? (
            <Button
              onClick={() => mazmoMutation.mutate()}
              disabled={!username.trim() || isPending}
            >
              {mazmoMutation.isPending ? t("adding") : t("add")}
            </Button>
          ) : (
            <Button
              onClick={() => manualMutation.mutate()}
              disabled={!displayname.trim() || isPending}
            >
              {manualMutation.isPending ? t("adding") : t("add")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AllGuestsTab({
  isOrgAdmin,
  orgId,
}: {
  isOrgAdmin: boolean;
  orgId: string;
}) {
  const { t } = useLanguage();
  const [banTarget, setBanTarget] = useState<Guest | null>(null);
  const [editTarget, setEditTarget] = useState<Guest | null>(null);
  const [linkTarget, setLinkTarget] = useState<Guest | null>(null);
  const [unlinkTarget, setUnlinkTarget] = useState<Guest | null>(null);
  const [sortCol, setSortCol] = useState<string | null>("displayname");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: debouncedSearch ? ["guests", debouncedSearch] : ["guests"],
    queryFn: async () => {
      const { data, error } = await api.GET("/guests/", {
        params: debouncedSearch ? { query: { q: debouncedSearch } } : undefined,
      });
      if (error) throw new Error("Failed to load guests");
      return data;
    },
    placeholderData: keepPreviousData,
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

  const guests = sortCol
    ? data?.guests.slice().sort((a, b) => {
        let cmp = 0;
        if (sortCol === "displayname")
          cmp = a.displayname.localeCompare(b.displayname);
        else if (sortCol === "username")
          cmp = (a.mazmo_handle ?? "").localeCompare(b.mazmo_handle ?? "");
        else if (sortCol === "mazmo_user_id") {
          if (a.mazmo_user_id == null && b.mazmo_user_id == null) cmp = 0;
          else if (a.mazmo_user_id == null) cmp = sortDir === "asc" ? 1 : -1;
          else if (b.mazmo_user_id == null) cmp = sortDir === "asc" ? -1 : 1;
          else cmp = a.mazmo_user_id - b.mazmo_user_id;
        } else if (sortCol === "instagram_username")
          cmp = (a.instagram_username ?? "").localeCompare(
            b.instagram_username ?? "",
          );
        return sortDir === "asc" ? cmp : -cmp;
      })
    : data?.guests;

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
      {!isLoading && (debouncedSearch || (data?.guests.length ?? 0) > 0) && (
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
                className="lg:w-[30%]"
              />
              <SortableHead
                col="username"
                label={t("atUsername")}
                active={sortCol}
                dir={sortDir}
                onSort={handleSort}
                className="lg:w-[24%]"
              />
              <SortableHead
                col="mazmo_user_id"
                label={t("mazmoId")}
                active={sortCol}
                dir={sortDir}
                onSort={handleSort}
                className="lg:w-[13%]"
              />
              <SortableHead
                col="instagram_username"
                label={t("instagramCol")}
                active={sortCol}
                dir={sortDir}
                onSort={handleSort}
                className="lg:w-[18%]"
              />
              <TableHead />
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
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-12" />
                  </TableCell>
                </TableRow>
              ))}
            {!isLoading && (data?.guests.length ?? 0) === 0 && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center text-muted-foreground py-8"
                >
                  {debouncedSearch
                    ? t("noGuestsMatchSearch")
                    : t("noGuestsYet")}
                </TableCell>
              </TableRow>
            )}
            {guests?.map((g) => (
              <TableRow key={g.id}>
                <TableCell>
                  <GuestNameCell guest={g} />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {g.mazmo_handle ? `@${g.mazmo_handle}` : t("noMazmoHandle")}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {g.mazmo_user_id ?? "—"}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {g.instagram_username ? `@${g.instagram_username}` : "—"}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={t("guestActions")}
                        />
                      }
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        render={<Link to={`/guests/${g.id}`} />}
                      >
                        {t("viewProfile")}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setEditTarget(g)}>
                        {t("editGuest")}
                      </DropdownMenuItem>
                      {g.mazmo_handle ? (
                        <DropdownMenuItem onClick={() => setUnlinkTarget(g)}>
                          {t("unlinkMazmoAccount")}
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={() => setLinkTarget(g)}>
                          {t("linkMazmoAccount")}
                        </DropdownMenuItem>
                      )}
                      {isOrgAdmin && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setBanTarget(g)}
                          >
                            {t("ban")}
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {banTarget && (
        <BanDialog
          guest={banTarget}
          orgId={orgId}
          onClose={() => setBanTarget(null)}
        />
      )}
      {editTarget && (
        <EditGuestDialog
          guest={editTarget}
          onClose={() => setEditTarget(null)}
        />
      )}
      {linkTarget && (
        <LinkMazmoDialog
          guest={linkTarget}
          onClose={() => setLinkTarget(null)}
        />
      )}
      {unlinkTarget && (
        <UnlinkMazmoDialog
          guest={unlinkTarget}
          onClose={() => setUnlinkTarget(null)}
        />
      )}
    </>
  );
}

function BannedGuestsTab({
  isOrgAdmin,
  orgId,
}: {
  isOrgAdmin: boolean;
  orgId: string;
}) {
  const { t } = useLanguage();
  const [sortCol, setSortCol] = useState<string | null>("displayname");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["guests-banned", orgId],
    queryFn: async () => {
      const { data, error } = await api.GET(
        "/organizations/{org_id}/guests/banned",
        { params: { path: { org_id: orgId } } },
      );
      if (error) throw new Error("Failed to load banned guests");
      return data;
    },
    enabled: !!orgId,
  });

  const unbanMutation = useUnbanGuest(orgId);

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
          cmp = (a.mazmo_handle ?? "").localeCompare(b.mazmo_handle ?? "");
        else if (sortCol === "banned_at")
          cmp = a.banned_at.localeCompare(b.banned_at);
        else if (sortCol === "banned_reason")
          cmp = a.banned_reason.localeCompare(b.banned_reason);
        return sortDir === "asc" ? cmp : -cmp;
      })
    : data?.guests;

  const {
    search,
    setSearch,
    filtered: guests,
  } = useGuestSearch(sorted, (g) => ({
    displayname: g.displayname,
    mazmoHandle: g.mazmo_handle,
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
              {isOrgAdmin && <TableHead />}
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
                  {isOrgAdmin && (
                    <TableCell>
                      <Skeleton className="h-4 w-16" />
                    </TableCell>
                  )}
                </TableRow>
              ))}
            {!isLoading && (data?.guests.length ?? 0) === 0 && (
              <TableRow>
                <TableCell
                  colSpan={isOrgAdmin ? 5 : 4}
                  className="text-center text-muted-foreground py-8"
                >
                  {t("noBannedGuests")}
                </TableCell>
              </TableRow>
            )}
            {!isLoading &&
              (data?.guests.length ?? 0) > 0 &&
              (guests?.length ?? 0) === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={isOrgAdmin ? 5 : 4}
                    className="text-center text-muted-foreground py-8"
                  >
                    {t("noGuestsMatchSearch")}
                  </TableCell>
                </TableRow>
              )}
            {guests?.map((g) => (
              <TableRow key={g.id}>
                <TableCell>
                  <GuestNameCell guest={g} className="text-destructive" />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {g.mazmo_handle ? `@${g.mazmo_handle}` : t("noMazmoHandle")}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {formatDateTime(g.banned_at)}
                </TableCell>
                <TableCell className="text-sm whitespace-normal overflow-hidden break-words">
                  {g.banned_reason}
                </TableCell>
                {isOrgAdmin && (
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
  const { activeOrg } = useOrg();
  const [addGuestOpen, setAddGuestOpen] = useState(false);

  const isSiteAdmin = user?.role.name === "SITE_ADMIN";
  const isOrgAdmin = isSiteAdmin || activeOrg?.role === "ADMIN";
  const orgId = activeOrg?.org_id ?? "";

  if (!activeOrg) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">{t("noOrganization")}</p>
      </div>
    );
  }

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
          <AllGuestsTab isOrgAdmin={isOrgAdmin} orgId={orgId} />
        </TabsContent>
        <TabsContent value="banned" className="mt-4">
          <BannedGuestsTab isOrgAdmin={isOrgAdmin} orgId={orgId} />
        </TabsContent>
      </Tabs>
      {addGuestOpen && (
        <AddGuestDialog onClose={() => setAddGuestOpen(false)} />
      )}
    </div>
  );
}
