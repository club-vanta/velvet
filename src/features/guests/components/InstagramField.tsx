import { Input } from "@/components/ui/input";
import { useLanguage } from "@/lib/i18n";
import { DialogField } from "./DialogField";

/** The optional Instagram handle field of the guest dialogs. */
export function InstagramField({
  id,
  value,
  onChange,
  disabled,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  const { t } = useLanguage();
  return (
    <DialogField htmlFor={id} label={t("instagramLabel")}>
      <Input
        id={id}
        data-cy={id}
        placeholder={t("instagramPlaceholder")}
        autoComplete="off"
        autoCapitalize="none"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />
    </DialogField>
  );
}
