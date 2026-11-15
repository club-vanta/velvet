import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type { components } from "@/api/types";
import { useLanguage } from "@/lib/i18n";
import { useUpdateOrganization } from "../api/useOrgMutations";
import {
  hasOrgChanges,
  isOrgComplete,
  orgUpdateBody,
  type OrgFieldValues,
} from "../lib/orgUpdate";
import { OrgFields } from "./OrgFields";

type Org = components["schemas"]["OrgPublic"];

/** Renames an org or changes its slug. Site admins only. */
export function EditOrgDialog({
  org,
  onClose,
}: {
  org: Org;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const [values, setValues] = useState<OrgFieldValues>({
    name: org.name,
    slug: org.slug,
  });
  const update = useUpdateOrganization(org.id);
  const canSave =
    hasOrgChanges(org, values) && isOrgComplete(values) && !update.isPending;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent data-cy="org-edit-dialog">
        <DialogHeader>
          <DialogTitle>{t("editOrg")}</DialogTitle>
        </DialogHeader>
        <OrgFields values={values} onChange={setValues} />
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button
            data-cy="org-edit-submit"
            onClick={() =>
              update.mutate(orgUpdateBody(org, values), { onSuccess: onClose })
            }
            disabled={!canSave}
          >
            {update.isPending ? t("saving") : t("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
