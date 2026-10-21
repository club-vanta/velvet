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
import { MoreHorizontal } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  FilterChips,
  FilterMenu,
  ListToolbarRow,
  MenuRadios,
  SortMenu,
} from "@/components/ListToolbar";
import { Input } from "@/components/ui/input";
import { InputWithPrefix } from "@/components/ui/input-with-prefix";
import { GuestAvatar } from "@/components/GuestAvatar";
import { MazmoFlagBadges, PronounPill } from "@/components/GuestBadges";
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
import { useLanguage, type TranslationKey } from "@/lib/i18n";
import { MAZMO_PRONOUN_SHORT, mazmoLabel } from "@/lib/mazmoProfile";
import type { SortDir } from "@/lib/sortNames";
import {
  DEFAULT_DIRECTORY_FILTERS,
  DIRECTORY_SORT_KEYS,
  VANTED_SORT_KEYS,
  activeDirectoryFilters,
  viewDirectory,
  viewVanted,
  type DirectoryFilters,
  type DirectorySortKey,
  type ListSort,
  type VantedSortKey,
} from "@/lib/guestDirectoryView";
import type { components } from "@/api/types";

type Guest = components["schemas"]["GuestPublic"];

const DIRECTORY_SORT_LABEL: Record<DirectorySortKey, TranslationKey> = {
  name: "sortName",
  handle: "sortHandle",
  mazmoId: "sortMazmoId",
  instagram: "sortInstagram",
};

const VANTED_SORT_LABEL: Record<VantedSortKey, TranslationKey> = {
  name: "sortName",
  handle: "sortHandle",
  bannedAt: "sortBannedAt",
  reason: "sortReason",
};

// Text sorts read "A to Z"; numbers and dates say which end comes first.
const DIR_LABEL: Record<
  DirectorySortKey | VantedSortKey,
  Record<SortDir, TranslationKey>
> = {
  name: { asc: "sortNameAsc", desc: "sortNameDesc" },
  handle: { asc: "sortNameAsc", desc: "sortNameDesc" },
  instagram: { asc: "sortNameAsc", desc: "sortNameDesc" },
  reason: { asc: "sortNameAsc", desc: "sortNameDesc" },
  mazmoId: { asc: "sortLowestFirst", desc: "sortHighestFirst" },
  bannedAt: { asc: "sortRsvpAsc", desc: "sortRsvpDesc" },
};

const MAZMO_FILTER_LABEL: Record<DirectoryFilters["mazmo"], TranslationKey> = {
  all: "filterAll",
  linked: "filterWithMazmo",
  unlinked: "filterWithoutMazmo",
};

const INSTAGRAM_FILTER_LABEL: Record<
  DirectoryFilters["instagram"],
  TranslationKey
> = {
  all: "filterAll",
  with: "filterWithInstagram",
  without: "filterWithoutInstagram",
};

const PRONOUN_CODES = ["MALE", "FEMALE", "NEUTRAL"] as const;

const ROW_CLASS =
  "flex flex-col gap-3 rounded-lg border p-3 @3xl:flex-row @3xl:items-center @3xl:gap-4";

/** Avatar, name linked to the profile, handle, pronoun, and badges. */
function GuestIdentity({
  guest,
  isBanned = false,
}: {
  guest: Pick<Guest, "id" | "displayname" | "mazmo_handle" | "mazmo_profile">;
  isBanned?: boolean;
}) {
  const { t } = useLanguage();
  const flagged =
    !!guest.mazmo_profile?.mazmo_banned ||
    !!guest.mazmo_profile?.mazmo_suspended;
  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      <GuestAvatar
        name={guest.displayname}
        src={guest.mazmo_profile?.avatar_url}
      />
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Link
            to={`/guests/${guest.id}`}
            className={cn(
              "rounded-sm font-medium break-words underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50",
              isBanned && "text-destructive",
            )}
          >
            {guest.displayname}
          </Link>
          <span className="text-sm break-all text-muted-foreground">
            {guest.mazmo_handle ? `@${guest.mazmo_handle}` : t("noMazmoHandle")}
          </span>
          <PronounPill pronoun={guest.mazmo_profile?.pronoun} />
        </div>
        {(isBanned || flagged) && (
          <div className="flex flex-wrap items-center gap-1.5">
            {isBanned && <Badge variant="destructive">{t("banned")}</Badge>}
            <MazmoFlagBadges profile={guest.mazmo_profile} />
          </div>
        )}
      </div>
    </div>
  );
}

function RowSkeletons() {
  return Array.from({ length: 5 }).map((_, i) => (
    <li key={i} className="flex items-center gap-3 rounded-lg border p-3">
      <Skeleton className="size-8 rounded-full" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-24" />
      </div>
    </li>
  ));
}

function EmptyRow({ children }: { children: React.ReactNode }) {
  return (
    <li className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
      {children}
    </li>
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
  const [sort, setSort] = useState<ListSort<DirectorySortKey>>({
    key: "name",
    dir: "asc",
  });
  const [filters, setFilters] = useState<DirectoryFilters>(
    DEFAULT_DIRECTORY_FILTERS,
  );

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

  // GuestPublic has no org ban state, so vants come from the org's list
  // (same query and cache as the Vanted tab).
  const bannedQ = useQuery({
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
  const bannedIds = new Set(bannedQ.data?.guests.map((g) => g.id) ?? []);
  const unbanMutation = useUnbanGuest(orgId);

  const guests = data
    ? viewDirectory(data.guests, filters, sort, bannedIds)
    : undefined;
  const active = activeDirectoryFilters(filters);
  const setFilter = <K extends keyof DirectoryFilters>(
    key: K,
    value: DirectoryFilters[K],
  ) => setFilters({ ...filters, [key]: value });

  const chipLabel: Record<keyof DirectoryFilters, string> = {
    mazmo: t(MAZMO_FILTER_LABEL[filters.mazmo]),
    instagram: t(INSTAGRAM_FILTER_LABEL[filters.instagram]),
    pronoun:
      filters.pronoun === "all"
        ? ""
        : `${t("pronouns")}: ${mazmoLabel(MAZMO_PRONOUN_SHORT, filters.pronoun, t)}`,
    vantedOnly: t("filterBanned"),
    mazmoFlaggedOnly: t("filterMazmoFlagged"),
  };

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
        <div className="space-y-2">
          <ListToolbarRow search={search} onSearch={setSearch}>
            <FilterMenu activeCount={active.length}>
              <MenuRadios
                label={t("filterMazmoAccount")}
                value={filters.mazmo}
                onChange={(v) => setFilter("mazmo", v)}
                options={(["all", "linked", "unlinked"] as const).map((v) => ({
                  value: v,
                  label: t(MAZMO_FILTER_LABEL[v]),
                }))}
              />
              <DropdownMenuSeparator />
              <MenuRadios
                label={t("instagramCol")}
                value={filters.instagram}
                onChange={(v) => setFilter("instagram", v)}
                options={(["all", "with", "without"] as const).map((v) => ({
                  value: v,
                  label: t(INSTAGRAM_FILTER_LABEL[v]),
                }))}
              />
              <DropdownMenuSeparator />
              <MenuRadios
                label={t("pronouns")}
                value={filters.pronoun}
                onChange={(v) => setFilter("pronoun", v)}
                options={[
                  { value: "all" as const, label: t("filterAll") },
                  ...PRONOUN_CODES.map((v) => ({
                    value: v,
                    label: mazmoLabel(MAZMO_PRONOUN_SHORT, v, t),
                  })),
                ]}
              />
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuLabel>{t("filterShowOnly")}</DropdownMenuLabel>
                <DropdownMenuCheckboxItem
                  checked={filters.vantedOnly}
                  onCheckedChange={(v: boolean) => setFilter("vantedOnly", v)}
                >
                  {t("filterBanned")}
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={filters.mazmoFlaggedOnly}
                  onCheckedChange={(v: boolean) =>
                    setFilter("mazmoFlaggedOnly", v)
                  }
                >
                  {t("filterMazmoFlagged")}
                </DropdownMenuCheckboxItem>
              </DropdownMenuGroup>
            </FilterMenu>
            <SortMenu
              sort={sort}
              onSort={setSort}
              keys={DIRECTORY_SORT_KEYS}
              label={(k) => t(DIRECTORY_SORT_LABEL[k])}
              dirLabel={(k, d) => t(DIR_LABEL[k][d])}
            />
          </ListToolbarRow>
          <FilterChips
            chips={active.map((key) => ({
              key,
              label: chipLabel[key],
              onRemove: () => setFilter(key, DEFAULT_DIRECTORY_FILTERS[key]),
            }))}
            narrowed={!!debouncedSearch}
            shown={guests?.length ?? 0}
            total={data?.guests.length ?? 0}
            onClear={() => setFilters(DEFAULT_DIRECTORY_FILTERS)}
          />
        </div>
      )}
      <ul className="space-y-2" aria-label={t("allGuests")}>
        {isLoading && <RowSkeletons />}
        {!isLoading && (data?.guests.length ?? 0) === 0 && (
          <EmptyRow>
            {debouncedSearch ? t("noGuestsMatchSearch") : t("noGuestsYet")}
          </EmptyRow>
        )}
        {!isLoading &&
          (data?.guests.length ?? 0) > 0 &&
          (guests?.length ?? 0) === 0 && (
            <EmptyRow>{t("noGuestsMatchFilters")}</EmptyRow>
          )}
        {guests?.map((g) => (
          <li key={g.id} className={ROW_CLASS}>
            <GuestIdentity guest={g} isBanned={bannedIds.has(g.id)} />
            <div className="flex items-center justify-between gap-2 @3xl:contents">
              <dl className="flex min-w-0 flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground @3xl:contents">
                <div className="@3xl:w-32">
                  <dt className="inline font-medium">{t("mazmoId")}</dt>{" "}
                  <dd className="inline tabular-nums">
                    {g.mazmo_user_id ?? "—"}
                  </dd>
                </div>
                <div className="min-w-0 @3xl:w-44 @3xl:truncate">
                  <dt className="inline font-medium">{t("instagramCol")}</dt>{" "}
                  <dd className="inline">
                    {g.instagram_username ? (
                      <a
                        href={`https://instagram.com/${g.instagram_username}`}
                        target="_blank"
                        rel="noreferrer"
                        className="underline-offset-4 hover:text-foreground hover:underline"
                      >
                        @{g.instagram_username}
                      </a>
                    ) : (
                      "—"
                    )}
                  </dd>
                </div>
              </dl>
              <div className="shrink-0">
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`${t("guestActions")}: ${g.displayname}`}
                      />
                    }
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem render={<Link to={`/guests/${g.id}`} />}>
                      {t("viewProfile")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setEditTarget(g)}>
                      {t("editGuest")}
                    </DropdownMenuItem>
                    {g.mazmo_handle ? (
                      <DropdownMenuItem
                        onClick={() => setUnlinkTarget(g)}
                        // The backend refuses to unlink a vanted guest.
                        disabled={bannedIds.has(g.id)}
                      >
                        {t("unlinkMazmoAccount")}
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem onClick={() => setLinkTarget(g)}>
                        {t("linkMazmoAccount")}
                      </DropdownMenuItem>
                    )}
                    {/* Vant state is only known once the org's list loads. */}
                    {isOrgAdmin && bannedQ.isSuccess && (
                      <>
                        <DropdownMenuSeparator />
                        {bannedIds.has(g.id) ? (
                          <DropdownMenuItem
                            onClick={() => unbanMutation.mutate(g)}
                            disabled={unbanMutation.isPending}
                          >
                            {t("unban")}
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setBanTarget(g)}
                          >
                            {t("ban")}
                          </DropdownMenuItem>
                        )}
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </li>
        ))}
      </ul>
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
  const [sort, setSort] = useState<ListSort<VantedSortKey>>({
    key: "name",
    dir: "asc",
  });

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

  const sorted = data ? viewVanted(data.guests, sort) : undefined;
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
        <div className="space-y-2">
          <ListToolbarRow search={search} onSearch={setSearch}>
            <SortMenu
              sort={sort}
              onSort={setSort}
              keys={VANTED_SORT_KEYS}
              label={(k) => t(VANTED_SORT_LABEL[k])}
              dirLabel={(k, d) => t(DIR_LABEL[k][d])}
            />
          </ListToolbarRow>
          <FilterChips
            chips={[]}
            narrowed={search.trim() !== ""}
            shown={guests?.length ?? 0}
            total={data?.guests.length ?? 0}
            onClear={() => {}}
          />
        </div>
      )}
      <ul className="space-y-2" aria-label={t("bannedGuests")}>
        {isLoading && <RowSkeletons />}
        {!isLoading && (data?.guests.length ?? 0) === 0 && (
          <EmptyRow>{t("noBannedGuests")}</EmptyRow>
        )}
        {!isLoading &&
          (data?.guests.length ?? 0) > 0 &&
          (guests?.length ?? 0) === 0 && (
            <EmptyRow>{t("noGuestsMatchSearch")}</EmptyRow>
          )}
        {guests?.map((g) => (
          <li key={g.id} className={ROW_CLASS}>
            <GuestIdentity guest={g} isBanned />
            <div className="flex items-end justify-between gap-3 @3xl:contents">
              <dl className="min-w-0 space-y-1 text-sm @3xl:contents">
                <div className="text-xs text-muted-foreground @3xl:w-52 @3xl:shrink-0 @3xl:whitespace-nowrap">
                  <dt className="inline font-medium">{t("bannedAt")}</dt>{" "}
                  <dd className="inline">{formatDateTime(g.banned_at)}</dd>
                </div>
                <div className="@3xl:w-72 @3xl:shrink-0">
                  <dt className="sr-only">{t("reason")}</dt>
                  <dd className="break-words">{g.banned_reason}</dd>
                </div>
              </dl>
              {isOrgAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={() => unbanMutation.mutate(g)}
                  disabled={unbanMutation.isPending}
                >
                  {t("unban")}
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
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
    <div className="@container space-y-6">
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
        <TabsContent value="all" className="mt-4 space-y-4">
          <AllGuestsTab isOrgAdmin={isOrgAdmin} orgId={orgId} />
        </TabsContent>
        <TabsContent value="banned" className="mt-4 space-y-4">
          <BannedGuestsTab isOrgAdmin={isOrgAdmin} orgId={orgId} />
        </TabsContent>
      </Tabs>
      {addGuestOpen && (
        <AddGuestDialog onClose={() => setAddGuestOpen(false)} />
      )}
    </div>
  );
}
