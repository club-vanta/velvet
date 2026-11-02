import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { components } from "@/api/types";
import { useLanguage } from "@/lib/i18n";
import {
  useEnableStaff,
  useSetApproval,
  useSetSiteRole,
} from "../api/useStaffMutations";
import { DisableDialog } from "./DisableDialog";
import { RecoveryCodeDialog } from "./RecoveryCodeDialog";
import { StaffRow } from "./StaffRow";

type User = components["schemas"]["UserPublic"];

const COLUMNS = 5;

export function StaffTable({
  users,
  currentUserId,
  isLoading,
  isError,
}: {
  users: User[];
  currentUserId: number | undefined;
  isLoading: boolean;
  /** A failed load is not an empty list, so the empty row stays hidden. */
  isError: boolean;
}) {
  const { t } = useLanguage();
  const [disableTarget, setDisableTarget] = useState<User | null>(null);
  const [recoveryTarget, setRecoveryTarget] = useState<User | null>(null);
  const approval = useSetApproval();
  const role = useSetSiteRole();
  const enable = useEnableStaff();
  const pending = {
    approval: approval.isPending,
    role: role.isPending,
    enable: enable.isPending,
  };

  return (
    <>
      <div className="rounded-md border">
        <Table data-cy="staff-table">
          <TableHeader>
            <TableRow>
              <TableHead>{t("username")}</TableHead>
              <TableHead>{t("role")}</TableHead>
              <TableHead>{t("status")}</TableHead>
              <TableHead>{t("joined")}</TableHead>
              <TableHead>{t("actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i} data-cy="staff-row-loading">
                  {Array.from({ length: COLUMNS }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            {!isLoading && !isError && users.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={COLUMNS}
                  className="text-center text-muted-foreground py-8"
                  data-cy="staff-empty"
                >
                  {t("noStaffAccounts")}
                </TableCell>
              </TableRow>
            )}
            {users.map((u) => (
              <StaffRow
                key={u.id}
                user={u}
                isSelf={u.id === currentUserId}
                pending={pending}
                onRoleChange={(r) => role.mutate({ user: u, role: r })}
                onApprove={(approve) => approval.mutate({ user: u, approve })}
                onEnable={() => enable.mutate(u)}
                onDisable={() => setDisableTarget(u)}
                onRecoveryCode={() => setRecoveryTarget(u)}
              />
            ))}
          </TableBody>
        </Table>
      </div>
      {disableTarget && (
        <DisableDialog
          user={disableTarget}
          onClose={() => setDisableTarget(null)}
        />
      )}
      {recoveryTarget && (
        <RecoveryCodeDialog
          user={recoveryTarget}
          onClose={() => setRecoveryTarget(null)}
        />
      )}
    </>
  );
}
