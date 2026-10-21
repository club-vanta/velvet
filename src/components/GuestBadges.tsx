import { TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/lib/i18n";
import { GUEST_TYPE_LABEL, isGuestType, type GuestType } from "@/lib/guestType";
import { cn } from "@/lib/utils";
import type { components } from "@/api/types";

type MazmoProfile = components["schemas"]["GuestMazmoProfilePublic"];

const GUEST_TYPE_CLASS: Record<Exclude<GuestType, "NORMAL">, string> = {
  INVITED:
    "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300",
  VENDOR:
    "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  STAFF: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
};

/**
 * Category badge for a guest at a meetup. NORMAL is the default and renders
 * nothing, so only the exceptions stand out in a list.
 */
export function GuestTypeBadge({
  guestType,
  showNormal = false,
}: {
  guestType: string;
  showNormal?: boolean;
}) {
  const { t } = useLanguage();
  if (!isGuestType(guestType)) {
    return <Badge variant="outline">{guestType}</Badge>;
  }
  if (guestType === "NORMAL") {
    return showNormal ? (
      <Badge variant="outline">{t(GUEST_TYPE_LABEL.NORMAL)}</Badge>
    ) : null;
  }
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
