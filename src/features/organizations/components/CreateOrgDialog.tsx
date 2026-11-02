import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useLanguage } from "@/lib/i18n";
import { useCreateOrganization } from "../api/useOrgMutations";
import { isOrgComplete, type OrgFieldValues } from "../lib/orgUpdate";
import { OrgFields } from "./OrgFields";

const PLACEHOLDERS: OrgFieldValues = { name: "Club Vanta", slug: "club-vanta" };

export function CreateOrgDialog({ onClose }: { onClose: () => void }) {
  const { t } = useLanguage();
  const [values, setValues] = useState<OrgFieldValues>({ name: "", slug: "" });
  const create = useCreateOrganization();

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent data-cy="org-create-dialog">
        <DialogHeader>
          <DialogTitle>{t("organizations")}</DialogTitle>
        </DialogHeader>
        <OrgFields
          values={values}
          onChange={setValues}
          placeholders={PLACEHOLDERS}
        />
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button
            data-cy="org-create-submit"
            onClick={() =>
              create.mutate(
                { name: values.name.trim(), slug: values.slug.trim() },
                { onSuccess: onClose },
              )
            }
            disabled={!isOrgComplete(values) || create.isPending}
          >
            {create.isPending ? t("creating") : t("create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
