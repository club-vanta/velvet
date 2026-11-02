import { Link } from "react-router-dom";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage } from "@/lib/i18n";
import type { components } from "@/api/types";
import type { GuestAction } from "../lib/guestActions";
import type { VantStatus } from "../lib/vantStatus";

type Guest = components["schemas"]["GuestPublic"];

/**
 * A directory row's "…" menu. Vant and unvant need the org's vant state, so
 * they only appear for org admins once it has loaded.
 */
export function DirectoryRowActions({
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
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            data-cy="guest-actions"
            aria-label={`${t("guestActions")}: ${guest.displayname}`}
          />
        }
      >
        <MoreHorizontal className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          data-cy="guest-action-view"
          render={<Link to={`/guests/${guest.id}`} />}
        >
          {t("viewProfile")}
        </DropdownMenuItem>
        <DropdownMenuItem
          data-cy="guest-action-edit"
          onClick={() => onAction("edit", guest)}
        >
          {t("editGuest")}
        </DropdownMenuItem>
        {guest.mazmo_handle ? (
          <DropdownMenuItem
            data-cy="guest-action-unlink"
            onClick={() => onAction("unlink", guest)}
            // The backend refuses to unlink a vanted guest.
            disabled={status === "vanted"}
          >
            {t("unlinkMazmoAccount")}
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem
            data-cy="guest-action-link"
            onClick={() => onAction("link", guest)}
          >
            {t("linkMazmoAccount")}
          </DropdownMenuItem>
        )}
        {isOrgAdmin && status !== "unknown" && (
          <>
            <DropdownMenuSeparator />
            {status === "vanted" ? (
              <DropdownMenuItem
                data-cy="guest-action-unban"
                onClick={() => onAction("unban", guest)}
                disabled={unbanPending}
              >
                {t("unban")}
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                data-cy="guest-action-ban"
                variant="destructive"
                onClick={() => onAction("ban", guest)}
              >
                {t("ban")}
              </DropdownMenuItem>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
