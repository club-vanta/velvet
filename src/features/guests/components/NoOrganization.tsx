import { useLanguage } from "@/lib/i18n";

/** Shown instead of a guests page when the user has no organization. */
export function NoOrganization() {
  const { t } = useLanguage();
  return (
    <div className="flex h-64 items-center justify-center">
      <p className="text-muted-foreground" data-cy="guests-no-org">
        {t("noOrganization")}
      </p>
    </div>
  );
}
