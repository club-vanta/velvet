import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, ShieldBan, TriangleAlert, UserX } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { GuestAvatar } from "@/components/GuestAvatar";
import { Fact, FactStrip } from "@/components/FactStrip";
import { MazmoFlagBadges } from "@/components/GuestBadges";
import { api } from "@/api/client";
import { formatFullDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useLanguage, type TranslationKey } from "@/lib/i18n";
import {
  MAZMO_GENDER_LABEL,
  MAZMO_PRONOUN_LABEL,
  MAZMO_PRONOUN_SHORT,
  mazmoLabel,
} from "@/lib/mazmoProfile";
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

function SectionTitle({
  as: Heading,
  children,
}: {
  as: "h2" | "h3";
  children: React.ReactNode;
}) {
  return (
    <Heading className="text-sm font-medium text-muted-foreground">
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

function ExternalProfileLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      title={label}
      className="inline-flex min-w-0 items-center gap-1 rounded-sm break-all underline-offset-4 hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      {children}
      <ExternalLink className="size-3 shrink-0" aria-hidden="true" />
    </a>
  );
}

/**
 * The guest's own avatar, blurred and faded into the card, so each profile
 * reads as that person's pass rather than a generic form.
 */
function Backdrop({ src }: { src: string | null | undefined }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-44 overflow-hidden"
    >
      {src && src !== failedSrc ? (
        <img
          src={src}
          alt=""
          referrerPolicy="no-referrer"
          onError={() => setFailedSrc(src)}
          className="size-full scale-125 object-cover opacity-80 blur-2xl saturate-150"
        />
      ) : (
        <div className="size-full bg-gradient-to-br from-muted to-transparent" />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-card/0 via-card/45 to-card" />
    </div>
  );
}

function IdentityCard({
  guest,
  Title,
  detailsAs,
  showBanned,
}: {
  guest: Guest;
  Title: "h1" | "h2";
  detailsAs: "h2" | "h3";
  showBanned: boolean;
}) {
  const { t } = useLanguage();
  const profile = guest.mazmo_profile;
  const mazmoFlagged = !!profile?.mazmo_banned || !!profile?.mazmo_suspended;
  const mazmoDeleted = !!profile?.mazmo_deleted;
  const notSet = <span className="text-muted-foreground">{t("notSet")}</span>;
  const DetailsHeading = detailsAs;

  // The ring repeats the status badges in the one place the eye lands
  // first: red for an org vant, orange for Mazmo's own flags.
  const ringClass = showBanned
    ? "ring-destructive"
    : mazmoFlagged
      ? "ring-orange-500"
      : "ring-border";

  return (
    <section className="relative isolate overflow-hidden rounded-xl border bg-card text-card-foreground">
      <Backdrop src={profile?.avatar_url} />

      <div className="flex flex-col items-start gap-4 px-4 pt-6 pb-5 @md:flex-row @md:items-center @md:gap-6 @md:px-6 @md:pt-8">
        <GuestAvatar
          name={guest.displayname}
          src={profile?.avatar_url}
          size="lg"
          alt={t("avatarOf").replace("{0}", guest.displayname)}
          className={cn(
            "ring-2 ring-offset-4 ring-offset-card @md:size-24 @md:text-3xl",
            ringClass,
          )}
        />
        <div className="min-w-0 space-y-2">
          <Title className="text-2xl font-semibold leading-tight tracking-tight break-words @md:text-3xl">
            {guest.displayname}
          </Title>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-muted-foreground">
            {guest.mazmo_handle && mazmoDeleted ? (
              // The account is gone, so mazmo.net/@handle is a 404.
              <span className="break-all">@{guest.mazmo_handle}</span>
            ) : guest.mazmo_handle ? (
              <ExternalProfileLink
                href={`https://mazmo.net/@${encodeURIComponent(guest.mazmo_handle)}`}
                label={t("mazmoProfileLink").replace("{0}", guest.mazmo_handle)}
              >
                @{guest.mazmo_handle}
              </ExternalProfileLink>
            ) : (
              <span>{t("noMazmoHandle")}</span>
            )}
            {profile?.pronoun && (
              <span className="rounded-full border border-foreground/15 bg-background/40 px-2.5 py-0.5 text-xs font-medium text-foreground">
                {mazmoLabel(MAZMO_PRONOUN_SHORT, profile.pronoun, t)}
              </span>
            )}
          </div>
          {(showBanned || mazmoFlagged || mazmoDeleted) && (
            <div className="flex flex-wrap gap-1.5">
              {showBanned && <Badge variant="destructive">{t("banned")}</Badge>}
              <MazmoFlagBadges profile={profile} />
            </div>
          )}
        </div>
      </div>

      <DetailsHeading className="sr-only">{t("guestDetails")}</DetailsHeading>

      {profile ? (
        <FactStrip cols={3} className="border-t">
          <Fact label={t("gender")}>
            {profile.gender
              ? mazmoLabel(MAZMO_GENDER_LABEL, profile.gender, t)
              : notSet}
          </Fact>
          <Fact label={t("age")}>
            {profile.age != null
              ? t("ageYears").replace("{0}", String(profile.age))
              : notSet}
          </Fact>
          <Fact label={t("pronouns")}>
            {profile.pronoun
              ? mazmoLabel(MAZMO_PRONOUN_LABEL, profile.pronoun, t)
              : notSet}
          </Fact>
        </FactStrip>
      ) : (
        <p className="border-t px-4 py-3 text-sm text-muted-foreground @md:px-6">
          {guest.mazmo_user_id == null
            ? t("profileNoMazmoAccount")
            : t("profileNotSyncedYet")}
        </p>
      )}

      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2 border-t bg-muted/30 px-4 py-3 text-sm @md:px-6">
        <dl className="contents">
          <div className="flex items-baseline gap-2">
            <dt className="text-xs text-muted-foreground">{t("mazmoId")}</dt>
            <dd className="tabular-nums">{guest.mazmo_user_id ?? notSet}</dd>
          </div>
          <div className="flex min-w-0 items-baseline gap-2">
            <dt className="text-xs text-muted-foreground">
              {t("instagramCol")}
            </dt>
            <dd className="min-w-0">
              {guest.instagram_username ? (
                <ExternalProfileLink
                  href={`https://instagram.com/${encodeURIComponent(guest.instagram_username)}`}
                  label={t("instagramProfileLink").replace(
                    "{0}",
                    guest.instagram_username,
                  )}
                >
                  @{guest.instagram_username}
                </ExternalProfileLink>
              ) : (
                notSet
              )}
            </dd>
          </div>
        </dl>
        {profile && (
          <p className="text-xs text-muted-foreground @md:ml-auto">
            {t("mazmoSyncedAt").replace(
              "{0}",
              formatFullDateTime(profile.synced_at),
            )}
          </p>
        )}
      </div>
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
    <div className="@container space-y-6">
      <IdentityCard
        guest={guest}
        Title={Title}
        detailsAs={sectionAs}
        showBanned={showBanned}
      />
      {actions && (
        <div className="flex flex-wrap gap-2">
          {actions(guest, ban, banKnown)}
        </div>
      )}

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

      {profile?.mazmo_deleted && (
        <Alert>
          <UserX />
          <AlertTitle>{t("mazmoDeletedTitle")}</AlertTitle>
          <AlertDescription>{t("mazmoDeletedExplanation")}</AlertDescription>
        </Alert>
      )}

      <NameHistory guestId={guest.id} headingAs={sectionAs} />
    </div>
  );
}
