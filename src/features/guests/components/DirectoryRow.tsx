import { useLanguage } from "@/lib/i18n";
import type { components } from "@/api/types";
import type { GuestAction } from "../lib/guestActions";
import type { VantStatus } from "../lib/vantStatus";
import { DirectoryRowActions } from "./DirectoryRowActions";
import { GuestIdentity } from "./GuestIdentity";
import { GuestRow } from "./GuestRow";

type Guest = components["schemas"]["GuestPublic"];

/**
 * One row of the directory. Its own component, with stable props, so the
 * React Compiler skips the rows that didn't change when the list re-renders
 * (typing a search, opening a dialog).
 */
export function DirectoryRow({
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
    <GuestRow data-cy={`guest-row-${guest.id}`}>
      <GuestIdentity guest={guest} isBanned={status === "vanted"} />
      <div className="flex items-center justify-between gap-2 @3xl:contents">
        <dl className="flex min-w-0 flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground @3xl:contents">
          <div className="@3xl:w-32">
            <dt className="inline font-medium">{t("mazmoId")}</dt>{" "}
            <dd className="inline tabular-nums" data-cy="guest-mazmo-id">
              {guest.mazmo_user_id ?? "—"}
            </dd>
          </div>
          <div className="min-w-0 @3xl:w-44 @3xl:truncate">
            <dt className="inline font-medium">{t("instagramCol")}</dt>{" "}
            <dd className="inline" data-cy="guest-instagram">
              {guest.instagram_username ? (
                <a
                  href={`https://instagram.com/${guest.instagram_username}`}
                  target="_blank"
                  rel="noreferrer"
                  className="underline-offset-4 hover:text-foreground hover:underline"
                >
                  @{guest.instagram_username}
                </a>
              ) : (
                "—"
              )}
            </dd>
          </div>
        </dl>
        <div className="shrink-0">
          <DirectoryRowActions
            guest={guest}
            status={status}
            isOrgAdmin={isOrgAdmin}
            unbanPending={unbanPending}
            onAction={onAction}
          />
        </div>
      </div>
    </GuestRow>
  );
}
