import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type { components } from "@/api/types";
import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useUserSearch } from "../api/useOrganizations";
import { useAddMember } from "../api/useOrgMutations";
import { OrgRoleSelect } from "./OrgRoleSelect";

type UserResult = components["schemas"]["UserSearchResult"];

/** Finds an account by username and adds it to the org with a role. */
export function AddMemberDialog({
  orgId,
  onClose,
}: {
  orgId: string;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<UserResult | null>(null);
  const [role, setRole] = useState("STAFF");
  const usersQ = useUserSearch(search);
  const add = useAddMember(orgId);
  const users = usersQ.data ?? [];
  const roleLabelId = useId();

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm" data-cy="org-add-member-dialog">
        <DialogHeader>
          <DialogTitle>{t("addMember")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <Input
            placeholder={t("username")}
            aria-label={t("username")}
            data-cy="org-member-search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelected(null);
            }}
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
          />
          {usersQ.isLoading && (
            <div className="space-y-2" data-cy="org-member-search-loading">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
          )}
          {!usersQ.isLoading && users.length === 0 && search && (
            <p
              className="text-sm text-muted-foreground text-center py-2"
              data-cy="org-member-search-empty"
            >
              {t("noStaffAccounts")}
            </p>
          )}
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {users.map((u) => (
              <button
                key={u.id}
                data-cy={`org-member-result-${u.id}`}
                aria-pressed={selected?.id === u.id}
                onClick={() => {
                  setSelected(u);
                  setSearch(u.username);
                }}
                className={cn(
                  "w-full text-left flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                  selected?.id === u.id
                    ? "bg-secondary text-foreground font-medium"
                    : "hover:bg-secondary/50 text-muted-foreground",
                )}
              >
                <span>{u.username}</span>
                <span className="text-xs text-muted-foreground">#{u.id}</span>
              </button>
            ))}
          </div>
          {selected && (
            <div className="space-y-1 pt-1 border-t border-border">
              <span id={roleLabelId} className="text-sm font-medium">
                {t("role")}
              </span>
              <OrgRoleSelect
                aria-labelledby={roleLabelId}
                value={role}
                onChange={setRole}
                placeholder={t("selectRole")}
                data-cy="org-add-member-role"
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button
            data-cy="org-add-member-submit"
            onClick={() =>
              selected &&
              add.mutate({ userId: selected.id, role }, { onSuccess: onClose })
            }
            disabled={!selected || add.isPending}
          >
            {add.isPending ? t("adding") : t("add")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
