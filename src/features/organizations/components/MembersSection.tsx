import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/domain/session";
import { useLanguage } from "@/lib/i18n";
import { useOrgMembers } from "../api/useOrganizations";
import { useRemoveMember, useUpdateMemberRole } from "../api/useOrgMutations";
import { AddMemberDialog } from "./AddMemberDialog";
import { MemberRow } from "./MemberRow";

const COLUMNS = 3;

export function MembersSection({ orgId }: { orgId: string }) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [addOpen, setAddOpen] = useState(false);
  const membersQ = useOrgMembers(orgId);
  const updateRole = useUpdateMemberRole(orgId);
  const remove = useRemoveMember(orgId);
  const members = membersQ.data?.members ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          {t("orgMembers")}
        </h2>
        <Button
          size="sm"
          data-cy="org-add-member"
          onClick={() => setAddOpen(true)}
        >
          {t("addMember")}
        </Button>
      </div>

      {membersQ.isError && (
        <Alert variant="destructive" data-cy="org-members-error">
          <AlertDescription className="flex items-center justify-between">
            {t("failedLoadOrgs")}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => membersQ.refetch()}
            >
              {t("retry")}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="rounded-md border">
        <Table data-cy="org-members-table">
          <TableHeader>
            <TableRow>
              <TableHead>{t("username")}</TableHead>
              <TableHead>{t("role")}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {membersQ.isLoading &&
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i} data-cy="org-member-row-loading">
                  <TableCell>
                    <Skeleton className="h-4 w-12" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-16" />
                  </TableCell>
                </TableRow>
              ))}
            {!membersQ.isLoading &&
              !membersQ.isError &&
              members.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={COLUMNS}
                    className="text-center text-muted-foreground py-6"
                    data-cy="org-members-empty"
                  >
                    {t("noStaffAccounts")}
                  </TableCell>
                </TableRow>
              )}
            {members.map((m) => (
              <MemberRow
                key={m.user_id}
                member={m}
                isSelf={m.user_id === user?.id}
                isRemoving={
                  remove.isPending && remove.variables?.user_id === m.user_id
                }
                removeDisabled={remove.isPending}
                onRoleChange={(role) => updateRole.mutate({ member: m, role })}
                onRemove={() => remove.mutate(m)}
              />
            ))}
          </TableBody>
        </Table>
      </div>

      {addOpen && (
        <AddMemberDialog orgId={orgId} onClose={() => setAddOpen(false)} />
      )}
    </div>
  );
}
