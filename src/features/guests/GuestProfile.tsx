import { useQuery } from "@tanstack/react-query";
import { ExternalLink, ShieldBan, TriangleAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { GuestAvatar } from "@/components/GuestAvatar";
import { MazmoFlagBadges } from "@/components/GuestBadges";
import { api } from "@/api/client";
import { formatFullDateTime } from "@/lib/format";
import { useLanguage, type TranslationKey } from "@/lib/i18n";
import { guestHistoryKey, guestKey } from "@/lib/queryKeys";
import type { components } from "@/api/types";

type Guest = components["schemas"]["GuestPublic"];
type BannedGuest = components["schemas"]["BannedGuestPublic"];
type HistoryEntry = components["schemas"]["GuestDisplaynameHistoryPublic"];

const SOURCE_LABEL: Record<string, TranslationKey> = {
  SYNC: "historySourceSync",
  MANUAL_EDIT: "historySourceManual",
  MAZMO_LINK: "historySourceMazmoLink",
  BACKFILL: "historySourceBackfill",
};

class GuestNotFoundError extends Error {}

function DetailItem({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0 space-y-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm break-words">{children}</dd>
    </div>
  );
}

function SectionTitle({
  as: Heading,
  children,
}: {
  as: "h2" | "h3";
  children: React.ReactNode;
}) {
  return (
    <Heading className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
      {children}
    </Heading>
  );
}

function HistoryItem({
  entry,
  isCurrent,
}: {
  entry: HistoryEntry;
  isCurrent: boolean;
}) {
  const { t } = useLanguage();
  const sourceKey = SOURCE_LABEL[entry.source];
  const meta = [
    sourceKey ? t(sourceKey) : entry.source,
    entry.actor
      ? t("historyByActor").replace("{0}", entry.actor.username)
      : null,
    formatFullDateTime(entry.recorded_at),
  ].filter(Boolean);

  return (
    <li className="relative pl-6 pb-4 last:pb-0">
      <span
        aria-hidden="true"
        className={
          isCurrent
            ? "absolute left-0 top-1.5 size-2.5 -translate-x-[calc(50%-0.5px)] rounded-full bg-foreground"
            : "absolute left-0 top-1.5 size-2.5 -translate-x-[calc(50%-0.5px)] rounded-full border-2 border-muted-foreground/60 bg-background"
        }
      />
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium break-words">{entry.displayname}</span>
        {isCurrent && <Badge variant="secondary">{t("historyCurrent")}</Badge>}
      </div>
      <p className="text-xs text-muted-foreground">{meta.join(" · ")}</p>
      {entry.source === "BACKFILL" && (
        <p className="mt-1 text-xs text-muted-foreground/80">
          {t("historyBackfillHint")}
        </p>
      )}
    </li>
  );
}

function NameHistory({
  guestId,
  headingAs,
}: {
  guestId: string;
  headingAs: "h2" | "h3";
}) {
  const { t } = useLanguage();
  const historyQ = useQuery({
    queryKey: guestHistoryKey(guestId),
    queryFn: async () => {
      const { data, error } = await api.GET(
        "/guests/{guest_id}/displayname-history",
        { params: { path: { guest_id: guestId } } },
      );
      if (error) throw new Error(t("failedLoadHistory"));
      return data;
    },
  });

  return (
    <section className="space-y-3">
      <SectionTitle as={headingAs}>{t("nameHistory")}</SectionTitle>
      {historyQ.isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      )}
      {historyQ.isError && (
        <div className="flex items-center justify-between gap-2 text-sm text-destructive">
          {t("failedLoadHistory")}
          <Button variant="ghost" size="sm" onClick={() => historyQ.refetch()}>
            {t("retry")}
          </Button>
        </div>
      )}
      {historyQ.data && historyQ.data.history.length === 0 && (
        <p className="text-sm text-muted-foreground">{t("historyEmpty")}</p>
      )}
      {historyQ.data && historyQ.data.history.length > 0 && (
        <ol className="ml-1.5 border-l border-border">
          {historyQ.data.history.map((entry, i) => (
            <HistoryItem
              // The API has no row id; the timestamp plus value is unique
              // per guest in practice.
              key={`${entry.recorded_at}-${entry.displayname}`}
              entry={entry}
              isCurrent={i === 0}
            />
          ))}
        </ol>
      )}
    </section>
  );
}

function MazmoDetails({
  guest,
  headingAs,
}: {
  guest: Guest;
  headingAs: "h2" | "h3";
}) {
  const { t } = useLanguage();
  const profile = guest.mazmo_profile;
  const notSet = <span className="text-muted-foreground">{t("notSet")}</span>;

  return (
    <section className="space-y-3">
      <SectionTitle as={headingAs}>{t("guestDetails")}</SectionTitle>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
        <DetailItem label={t("mazmoId")}>
          {guest.mazmo_user_id ?? notSet}
        </DetailItem>
        <DetailItem label={t("instagramCol")}>
          {guest.instagram_username ? (
            <a
              href={`https://instagram.com/${encodeURIComponent(guest.instagram_username)}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 underline-offset-4 hover:underline"
            >
              @{guest.instagram_username}
              <ExternalLink className="size-3 shrink-0" aria-hidden="true" />
            </a>
          ) : (
            notSet
          )}
        </DetailItem>
        {profile && (
          <>
            <DetailItem label={t("age")}>{profile.age ?? notSet}</DetailItem>
            <DetailItem label={t("gender")}>
              {profile.gender ?? notSet}
            </DetailItem>
            <DetailItem label={t("pronouns")}>
              {profile.pronoun ?? notSet}
            </DetailItem>
            <DetailItem label={t("mazmoSyncedAt")}>
              {formatFullDateTime(profile.synced_at)}
            </DetailItem>
          </>
        )}
      </dl>
      {guest.mazmo_user_id == null && (
        <p className="text-sm text-muted-foreground">
          {t("profileNoMazmoAccount")}
        </p>
      )}
      {guest.mazmo_user_id != null && !profile && (
        <p className="text-sm text-muted-foreground">
          {t("profileNotSyncedYet")}
        </p>
      )}
    </section>
  );
}

/**
 * Everything known about a guest: identity, org vant status, Mazmo's own
 * account flags, the Mazmo profile snapshot, and the displayname history.
 *
 * Rendered both as the /guests/:guestId page and inside a side sheet on the
 * meetup page, so the heading level and the actions are passed in.
 *
 * Actions get `banKnown`: until the org's vanted list has loaded, `ban`
 * being undefined does not mean the guest is not vanted.
 */
export function GuestProfile({
  guestId,
  orgId,
  orgName,
  titleAs: Title = "h1",
  knownBanned = false,
  actions,
}: {
  guestId: string;
  orgId: string;
  orgName?: string;
  titleAs?: "h1" | "h2";
  // Vant state already known by the caller (the meetup list has it), shown
  // while the vanted list is loading or if it fails.
  knownBanned?: boolean;
  actions?: (
    guest: Guest,
    ban: BannedGuest | undefined,
    banKnown: boolean,
  ) => React.ReactNode;
}) {
  const sectionAs = Title === "h1" ? "h2" : "h3";
  const { t } = useLanguage();

  const guestQ = useQuery({
    queryKey: guestKey(guestId),
    queryFn: async () => {
      const { data, error, response } = await api.GET("/guests/{guest_id}", {
        params: { path: { guest_id: guestId } },
      });
      if (response.status === 404) throw new GuestNotFoundError();
      if (error) throw new Error(t("failedLoadGuest"));
      return data;
    },
    // A 404 will not fix itself; anything else gets the app's single retry.
    retry: (count, err) => !(err instanceof GuestNotFoundError) && count < 1,
  });

  // Same key as the Vanted tab, so the list is shared from cache.
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

  if (guestQ.isLoading) {
    return (
      <div className="space-y-6" aria-busy="true">
        <div className="flex items-center gap-4">
          <Skeleton className="size-20 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (guestQ.isError || !guestQ.data) {
    const notFound = guestQ.error instanceof GuestNotFoundError;
    return (
      <div className="space-y-4">
        <Title className="text-2xl font-semibold">
          {notFound ? t("guestNotFound") : t("failedLoadGuest")}
        </Title>
        {!notFound && (
          <Button variant="outline" onClick={() => guestQ.refetch()}>
            {t("retry")}
          </Button>
        )}
      </div>
    );
  }

  const guest = guestQ.data;
  const banKnown = bannedQ.isSuccess;
  const ban = bannedQ.data?.guests.find((g) => g.id === guest.id);
  const showBanned = banKnown ? !!ban : knownBanned;
  const profile = guest.mazmo_profile;
  const mazmoFlagged = !!profile?.mazmo_banned || !!profile?.mazmo_suspended;

  return (
    <div className="space-y-6">
      <header className="space-y-4">
        <div className="flex items-center gap-4 min-w-0">
          <GuestAvatar
            name={guest.displayname}
            src={profile?.avatar_url}
            size="lg"
            alt={t("avatarOf").replace("{0}", guest.displayname)}
          />
          <div className="min-w-0 space-y-1">
            <Title className="text-2xl font-semibold leading-tight break-words">
              {guest.displayname}
            </Title>
            <p className="text-sm text-muted-foreground break-all">
              {guest.mazmo_handle
                ? `@${guest.mazmo_handle}`
                : t("noMazmoHandle")}
              {profile?.pronoun && (
                <span className="break-normal"> · {profile.pronoun}</span>
              )}
            </p>
            {(showBanned || mazmoFlagged) && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {showBanned && (
                  <Badge variant="destructive">{t("banned")}</Badge>
                )}
                <MazmoFlagBadges profile={profile} />
              </div>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex flex-wrap gap-2">
            {actions(guest, ban, banKnown)}
          </div>
        )}
      </header>

      {ban && (
        <Alert variant="destructive">
          <ShieldBan />
          <AlertTitle>
            {orgName
              ? t("vantedInOrg").replace("{0}", orgName)
              : t("vantedInThisOrg")}
          </AlertTitle>
          <AlertDescription className="[&_p:not(:last-child)]:mb-1">
            <p className="break-words">{ban.banned_reason}</p>
            <p className="text-xs">
              {t("vantedSince").replace(
                "{0}",
                formatFullDateTime(ban.banned_at),
              )}
            </p>
          </AlertDescription>
        </Alert>
      )}

      {bannedQ.isError && (
        <div className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm text-muted-foreground">
          {t("failedLoadVantStatus")}
          <Button variant="ghost" size="sm" onClick={() => bannedQ.refetch()}>
            {t("retry")}
          </Button>
        </div>
      )}

      {mazmoFlagged && (
        <Alert className="border-orange-500/40 text-orange-700 dark:text-orange-300">
          <TriangleAlert />
          <AlertTitle>
            {profile?.mazmo_banned
              ? t("mazmoBannedTitle")
              : t("mazmoSuspendedTitle")}
          </AlertTitle>
          <AlertDescription className="text-orange-700/90 dark:text-orange-300/90">
            {t("mazmoFlagExplanation")}
          </AlertDescription>
        </Alert>
      )}

      <MazmoDetails guest={guest} headingAs={sectionAs} />
      <NameHistory guestId={guest.id} headingAs={sectionAs} />
    </div>
  );
}
