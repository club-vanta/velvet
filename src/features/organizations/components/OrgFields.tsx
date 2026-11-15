import { useId } from "react";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/lib/i18n";
import type { OrgFieldValues } from "../lib/orgUpdate";

/** The name and slug inputs shared by the create and edit dialogs. */
export function OrgFields({
  values,
  onChange,
  placeholders,
}: {
  values: OrgFieldValues;
  onChange: (values: OrgFieldValues) => void;
  placeholders?: OrgFieldValues;
}) {
  const { t } = useLanguage();
  const id = useId();

  return (
    <div className="space-y-4 py-2">
      <div className="space-y-1">
        <label htmlFor={`${id}-name`} className="text-sm font-medium">
          {t("orgName")}
        </label>
        <Input
          id={`${id}-name`}
          data-cy="org-name-input"
          placeholder={placeholders?.name}
          value={values.name}
          onChange={(e) => onChange({ ...values, name: e.target.value })}
        />
      </div>
      <div className="space-y-1">
        <label htmlFor={`${id}-slug`} className="text-sm font-medium">
          {t("orgSlug")}
        </label>
        <Input
          id={`${id}-slug`}
          data-cy="org-slug-input"
          placeholder={placeholders?.slug}
          value={values.slug}
          onChange={(e) => onChange({ ...values, slug: e.target.value })}
        />
      </div>
    </div>
  );
}
