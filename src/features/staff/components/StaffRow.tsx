import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { components } from "@/api/types";
import { formatDate } from "@/lib/format";
import { useLanguage } from "@/lib/i18n";
import type { SiteRole } from "../api/useStaffMutations";
import { staffActions } from "../lib/staffAccount";
import { StatusBadge } from "./StatusBadge";

type User = components["schemas"]["UserPublic"];

const SITE_ROLES: SiteRole[] = ["USER", "SITE_ADMIN"];

function isSiteRole(value: unknown): value is SiteRole {
  return SITE_ROLES.includes(value as SiteRole);
}

export type StaffRowProps = {
  user: User;
  isSelf: boolean;
  /** Which kinds of change are in flight; their buttons wait meanwhile. */
  pending: { approval: boolean; role: boolean; enable: boolean };
  onRoleChange: (role: SiteRole) => void;
  onApprove: (approve: boolean) => void;
  onEnable: () => void;
  onDisable: () => void;
  onRecoveryCode: () => void;
};

export function StaffRow({
  user,
  isSelf,
  pending,
  onRoleChange,
  onApprove,
  onEnable,
  onDisable,
  onRecoveryCode,
}: StaffRowProps) {
  const { t } = useLanguage();
  const can = staffActions(user, isSelf);

  return (
    <TableRow data-cy={`staff-row-${user.id}`}>
      <TableCell className="font-medium" data-cy="staff-username">
        {user.username}
      </TableCell>
      <TableCell>
        {can.changeRole ? (
          <Select
            defaultValue={user.role.name}
            onValueChange={(role) => isSiteRole(role) && onRoleChange(role)}
            disabled={pending.role}
          >
            <SelectTrigger
              className="h-7 w-24 text-xs"
              aria-label={t("roleOf").replace("{0}", user.username)}
              data-cy="staff-role-select"
            >
              <SelectValue data-cy="staff-role-value" />
            </SelectTrigger>
            <SelectContent>
              {SITE_ROLES.map((role) => (
                <SelectItem key={role} value={role}>
                  {role}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Badge variant="outline" data-cy="staff-role">
            {user.role.name}
          </Badge>
        )}
      </TableCell>
      <TableCell>
        <StatusBadge user={user} />
      </TableCell>
      <TableCell className="text-muted-foreground text-sm">
        {formatDate(user.created_at)}
      </TableCell>
      <TableCell>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            data-cy="staff-recovery-code-open"
            onClick={onRecoveryCode}
          >
            {t("forgotPasswordButton")}
          </Button>
          {can.revoke && (
            <Button
              variant="ghost"
              size="sm"
              data-cy="staff-revoke"
              onClick={() => onApprove(false)}
              disabled={pending.approval}
            >
              {t("revoke")}
            </Button>
          )}
          {can.approve && (
            <Button
              variant="default"
              size="sm"
              data-cy="staff-approve"
              onClick={() => onApprove(true)}
              disabled={pending.approval}
            >
              {t("approve")}
            </Button>
          )}
          {can.disable && (
            <Button
              variant="ghost"
              size="sm"
              data-cy="staff-disable"
              onClick={onDisable}
            >
              {t("disable")}
            </Button>
          )}
          {can.enable && (
            <Button
              variant="ghost"
              size="sm"
              data-cy="staff-enable"
              onClick={onEnable}
              disabled={pending.enable}
            >
              {t("enable")}
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}
