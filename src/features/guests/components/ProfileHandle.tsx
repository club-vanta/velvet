import { useLanguage } from "@/lib/i18n";
import type { components } from "@/api/types";
import { ExternalProfileLink } from "./ExternalProfileLink";

type Guest = Pick<
  components["schemas"]["GuestPublic"],
  "mazmo_handle" | "mazmo_profile"
>;

/** The guest's Mazmo handle, linked to mazmo.net while the account is live. */
export function ProfileHandle({ guest }: { guest: Guest }) {
  const { t } = useLanguage();
  const profile = guest.mazmo_profile;
  const handle = guest.mazmo_handle;
  if (!handle) {
    return <span data-cy="guest-profile-handle">{t("noMazmoHandle")}</span>;
  }
  // mazmo.net/@handle is a 404 for deleted and banned accounts.
  if (profile?.mazmo_deleted || profile?.mazmo_banned) {
    return (
      <span className="break-all" data-cy="guest-profile-handle">
        @{handle}
      </span>
    );
  }
  return (
    <ExternalProfileLink
      data-cy="guest-profile-handle"
      href={`https://mazmo.net/@${encodeURIComponent(handle)}`}
      label={t("mazmoProfileLink").replace("{0}", handle)}
    >
      @{handle}
    </ExternalProfileLink>
  );
}
