import { TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/lib/i18n";
import { GUEST_TYPE_LABEL, isGuestType, type GuestType } from "@/lib/guestType";
import {
  MAZMO_PRONOUN_LABEL,
  MAZMO_PRONOUN_SHORT,
  mazmoLabel,
} from "@/lib/mazmoProfile";
import { cn } from "@/lib/utils";
import type { components } from "@/api/types";

type MazmoProfile = components["schemas"]["GuestMazmoProfilePublic"];

const GUEST_TYPE_CLASS: Record<Exclude<GuestType, "NORMAL">, string> = {
  INVITED:
    "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300",
  VENDOR:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  STAFF: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
};

/**
 * Category badge for a guest at a meetup. NORMAL is the default and renders
 * nothing, so only the exceptions stand out in a list.
 */
export function GuestTypeBadge({ guestType }: { guestType: string }) {
  const { t } = useLanguage();
  if (!isGuestType(guestType)) {
    return <Badge variant="outline">{guestType}</Badge>;
  }
  if (guestType === "NORMAL") return null;
  return (
    <Badge variant="outline" className={GUEST_TYPE_CLASS[guestType]}>
      {t(GUEST_TYPE_LABEL[guestType])}
    </Badge>
  );
}

const MAZMO_FLAG_CLASS =
  "border-orange-500/40 bg-orange-500/10 text-orange-700 dark:text-orange-300";

/**
 * Mazmo's own account flags. Deliberately styled apart from the red
 * "Vanted" badge: these come from Mazmo, not from an org ban here.
 */
export function MazmoFlagBadges({
  profile,
  className,
}: {
  profile: MazmoProfile | null | undefined;
  className?: string;
}) {
  const { t } = useLanguage();
  if (!profile || (!profile.mazmo_banned && !profile.mazmo_suspended)) {
    return null;
  }
  return (
    <>
      {profile.mazmo_banned && (
        <Badge
          variant="outline"
          className={cn(MAZMO_FLAG_CLASS, className)}
          title={t("mazmoFlagHint")}
        >
          <TriangleAlert aria-hidden="true" />
          {t("mazmoBanned")}
        </Badge>
      )}
      {profile.mazmo_suspended && (
        <Badge
          variant="outline"
          className={cn(MAZMO_FLAG_CLASS, className)}
          title={t("mazmoFlagHint")}
        >
          <TriangleAlert aria-hidden="true" />
          {t("mazmoSuspended")}
        </Badge>
      )}
    </>
  );
}

/**
 * The guest's Mazmo pronoun in its short form ("ella"), next to the handle.
 * The long form is the tooltip, and screen readers hear what it is.
 */
export function PronounPill({
  pronoun,
}: {
  pronoun: string | null | undefined;
}) {
  const { t } = useLanguage();
  if (!pronoun) return null;
  return (
    <span
      title={`${t("pronouns")}: ${mazmoLabel(MAZMO_PRONOUN_LABEL, pronoun, t)}`}
      className="rounded-full border border-foreground/15 px-2 py-px text-xs font-medium"
    >
      <span className="sr-only">{t("pronouns")}: </span>
      {mazmoLabel(MAZMO_PRONOUN_SHORT, pronoun, t)}
    </span>
  );
}
