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
import { unlinkBlockedReason, type VantStatus } from "../lib/vantStatus";

type Guest = components["schemas"]["GuestPublic"];

/**
 * A directory row's "…" menu. Vant, unvant and unlink need the org's vant
 * state: vant and unvant only appear for org admins once it has loaded, and
 * unlink stays disabled, saying why, until the guest is known not vanted.
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
  const unlinkBlocked = unlinkBlockedReason(status);
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
            disabled={!!unlinkBlocked}
            // A disabled menu item stays focusable, so the reason it is
            // disabled is read out with it.
            aria-labelledby={`unlink-label-${guest.id}`}
            aria-describedby={
              unlinkBlocked ? `unlink-hint-${guest.id}` : undefined
            }
          >
            <span className="flex flex-col gap-0.5">
              <span id={`unlink-label-${guest.id}`}>
                {t("unlinkMazmoAccount")}
              </span>
              {unlinkBlocked && (
                <span
                  id={`unlink-hint-${guest.id}`}
                  data-cy="guest-action-unlink-hint"
                  className="text-xs text-muted-foreground"
                >
                  {t(unlinkBlocked)}
                </span>
              )}
            </span>
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
