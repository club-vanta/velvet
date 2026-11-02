import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/lib/i18n";

/** An org member's role: staff work the door, admins also manage the org. */
export function OrgRoleSelect({
  value,
  onChange,
  disabled,
  className,
  placeholder,
  ...triggerProps
}: {
  value: string;
  onChange: (role: string) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  "data-cy"?: string;
}) {
  const { t } = useLanguage();
  return (
    <Select
      value={value}
      onValueChange={(role) => role !== null && onChange(role)}
      disabled={disabled}
    >
      <SelectTrigger className={className} {...triggerProps}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="STAFF">{t("roleStaff")}</SelectItem>
        <SelectItem value="ADMIN">{t("roleAdmin")}</SelectItem>
      </SelectContent>
    </Select>
  );
}
