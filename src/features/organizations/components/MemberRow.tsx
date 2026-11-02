import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import type { components } from "@/api/types";
import { useLanguage } from "@/lib/i18n";
import { OrgRoleSelect } from "./OrgRoleSelect";

type OrgMember = components["schemas"]["OrgMemberPublic"];

/**
 * One member with their role and a remove button. Viewers cannot change
 * their own role or remove themselves, so they never lock themselves out.
 */
export function MemberRow({
  member,
  isSelf,
  isRemoving,
  onRoleChange,
  onRemove,
}: {
  member: OrgMember;
  isSelf: boolean;
  isRemoving: boolean;
  onRoleChange: (role: string) => void;
  onRemove: () => void;
}) {
  const { t } = useLanguage();
  return (
    <TableRow data-cy={`org-member-row-${member.user_id}`}>
      <TableCell className="font-medium" data-cy="org-member-username">
        {member.username}
      </TableCell>
      <TableCell>
        <OrgRoleSelect
          value={member.role}
          onChange={onRoleChange}
          disabled={isSelf}
          className="w-28 h-7 text-xs"
          aria-label={t("roleOf").replace("{0}", member.username)}
          data-cy="org-member-role"
        />
      </TableCell>
      <TableCell className="text-right">
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive"
          data-cy="org-member-remove"
          onClick={onRemove}
          disabled={isRemoving || isSelf}
        >
          {isRemoving ? t("removing") : t("removeMember")}
        </Button>
      </TableCell>
    </TableRow>
  );
}
