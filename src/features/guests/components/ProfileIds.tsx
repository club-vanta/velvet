import { formatFullDateTime } from "@/lib/format";
import { useLanguage } from "@/lib/i18n";
import type { components } from "@/api/types";
import { ExternalProfileLink } from "./ExternalProfileLink";

type Guest = Pick<
  components["schemas"]["GuestPublic"],
  "mazmo_user_id" | "instagram_username" | "mazmo_profile"
>;

/** The card's footer: Mazmo ID, Instagram, and when Mazmo data was synced. */
export function ProfileIds({ guest }: { guest: Guest }) {
  const { t } = useLanguage();
  const profile = guest.mazmo_profile;
  const notSet = <span className="text-muted-foreground">{t("notSet")}</span>;
  const instagram = guest.instagram_username;
  return (
    <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2 border-t bg-muted/30 px-4 py-3 text-sm @md:px-6">
      <dl className="contents">
        <div className="flex items-baseline gap-2">
          <dt className="text-xs text-muted-foreground">{t("mazmoId")}</dt>
          <dd className="tabular-nums" data-cy="guest-profile-mazmo-id">
            {guest.mazmo_user_id ?? notSet}
          </dd>
        </div>
        <div className="flex min-w-0 items-baseline gap-2">
          <dt className="text-xs text-muted-foreground">{t("instagramCol")}</dt>
          <dd className="min-w-0" data-cy="guest-profile-instagram">
            {instagram ? (
              <ExternalProfileLink
                href={`https://instagram.com/${encodeURIComponent(instagram)}`}
                label={t("instagramProfileLink").replace("{0}", instagram)}
              >
                @{instagram}
              </ExternalProfileLink>
            ) : (
              notSet
            )}
          </dd>
        </div>
      </dl>
      {profile && (
        <p
          className="text-xs text-muted-foreground @md:ml-auto"
          data-cy="guest-profile-synced-at"
        >
          {t("mazmoSyncedAt").replace(
            "{0}",
            formatFullDateTime(profile.synced_at),
          )}
        </p>
      )}
    </div>
  );
}
