import { Fact, FactStrip } from "@/components/FactStrip";
import {
  MAZMO_GENDER_LABEL,
  MAZMO_PRONOUN_LABEL,
  mazmoLabel,
} from "@/domain/guest";
import { useLanguage } from "@/lib/i18n";
import type { components } from "@/api/types";

type Guest = Pick<
  components["schemas"]["GuestPublic"],
  "mazmo_user_id" | "mazmo_profile"
>;

/**
 * Gender, age and pronouns from the Mazmo profile snapshot, or why there is
 * none: no Mazmo account, or one that hasn't been synced yet.
 */
export function ProfileFacts({ guest }: { guest: Guest }) {
  const { t } = useLanguage();
  const profile = guest.mazmo_profile;
  if (!profile) {
    return (
      <p
        className="border-t px-4 py-3 text-sm text-muted-foreground @md:px-6"
        data-cy="guest-profile-no-facts"
      >
        {guest.mazmo_user_id == null
          ? t("profileNoMazmoAccount")
          : t("profileNotSyncedYet")}
      </p>
    );
  }
  const notSet = <span className="text-muted-foreground">{t("notSet")}</span>;
  return (
    <FactStrip cols={3} className="border-t">
      <Fact label={t("gender")} data-cy="guest-fact-gender">
        {profile.gender
          ? mazmoLabel(MAZMO_GENDER_LABEL, profile.gender, t)
          : notSet}
      </Fact>
      <Fact label={t("age")} data-cy="guest-fact-age">
        {profile.age != null
          ? t("ageYears").replace("{0}", String(profile.age))
          : notSet}
      </Fact>
      <Fact label={t("pronouns")} data-cy="guest-fact-pronouns">
        {profile.pronoun
          ? mazmoLabel(MAZMO_PRONOUN_LABEL, profile.pronoun, t)
          : notSet}
      </Fact>
    </FactStrip>
  );
}
