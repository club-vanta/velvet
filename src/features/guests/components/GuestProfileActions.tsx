import { useId } from "react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";
import type { components } from "@/api/types";
import type { GuestAction } from "../lib/guestActions";
import { unlinkBlockedReason, type VantStatus } from "../lib/vantStatus";

type Guest = components["schemas"]["GuestPublic"];

/**
 * The buttons above a profile. Vant, unvant and unlink need the org's vant
 * state: vant and unvant only appear for org admins once it has loaded, and
 * unlink stays disabled, saying why, until the guest is known not vanted.
 */
export function GuestProfileActions({
  guest,
  status,
  isOrgAdmin,
  unbanPending,
  onAction,
}: {
  guest: Guest;
  status: VantStatus;
  isOrgAdmin: boolean;
  unbanPending: boolean;
  onAction: (action: GuestAction, guest: Guest) => void;
}) {
  const { t } = useLanguage();
  const vanted = status === "vanted";
  const unlinkBlocked = unlinkBlockedReason(status);
  const hintId = useId();
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        data-cy="guest-profile-edit"
        onClick={() => onAction("edit", guest)}
      >
        {t("editGuest")}
      </Button>
      {guest.mazmo_handle ? (
        <Button
          variant="outline"
          size="sm"
          data-cy="guest-profile-unlink"
          onClick={() => onAction("unlink", guest)}
          disabled={!!unlinkBlocked}
          aria-describedby={unlinkBlocked ? hintId : undefined}
        >
          {t("unlinkMazmoAccount")}
        </Button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          data-cy="guest-profile-link"
          onClick={() => onAction("link", guest)}
        >
          {t("linkMazmoAccount")}
        </Button>
      )}
      {isOrgAdmin &&
        status !== "unknown" &&
        (vanted ? (
          <Button
            variant="outline"
            size="sm"
            data-cy="guest-profile-unban"
            onClick={() => onAction("unban", guest)}
            disabled={unbanPending}
          >
            {t("unban")}
          </Button>
        ) : (
          <Button
            variant="destructive"
            size="sm"
            data-cy="guest-profile-ban"
            onClick={() => onAction("ban", guest)}
          >
            {t("ban")}
          </Button>
        ))}
      {guest.mazmo_handle && unlinkBlocked && (
        // A disabled button can't be focused, so the reason is on screen.
        <p
          id={hintId}
          data-cy="guest-profile-unlink-hint"
          className="basis-full text-xs text-muted-foreground"
        >
          {t(unlinkBlocked)}
        </p>
      )}
    </>
  );
}
