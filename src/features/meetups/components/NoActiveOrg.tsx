import { useLanguage } from "@/lib/i18n";

/** Shown instead of a meetup page when the viewer belongs to no organization. */
export function NoActiveOrg() {
  const { t } = useLanguage();
  return (
    <div className="flex items-center justify-center h-64">
      <p className="text-muted-foreground" data-cy="meetups-no-org">
        {t("noOrganization")}
      </p>
    </div>
  );
}
