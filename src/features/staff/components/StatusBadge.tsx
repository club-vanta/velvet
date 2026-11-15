import { Badge } from "@/components/ui/badge";
import type { components } from "@/api/types";
import { useLanguage, type TranslationKey } from "@/lib/i18n";
import { staffStatus, type StaffStatus } from "../lib/staffAccount";

type User = components["schemas"]["UserPublic"];

const STATUS: Record<
  StaffStatus,
  { label: TranslationKey; variant: "destructive" | "secondary" | "default" }
> = {
  disabled: { label: "statusDisabled", variant: "destructive" },
  pending: { label: "statusPending", variant: "secondary" },
  active: { label: "statusActive", variant: "default" },
};

export function StatusBadge({ user }: { user: User }) {
  const { t } = useLanguage();
  const { label, variant } = STATUS[staffStatus(user)];
  return (
    <Badge variant={variant} data-cy="staff-status">
      {t(label)}
    </Badge>
  );
}
