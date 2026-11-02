import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";
import type { components } from "@/api/types";
import type { GuestAction } from "../lib/guestActions";
import type { VantStatus } from "../lib/vantStatus";

type Guest = components["schemas"]["GuestPublic"];

/**
 * The buttons above a profile. Vant and unvant need the org's vant state,
 * so they only appear for org admins once it has loaded.
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
          // The backend refuses to unlink a guest vanted in any org
          // (ban-evasion guard). Only this org's vants are known here,
          // so a vant elsewhere still ends in the backend's 409.
          disabled={vanted}
          title={vanted ? t("unlinkBlockedVanted") : undefined}
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
    </>
  );
}
