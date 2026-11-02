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
import { useGenerateRecoveryCode } from "../api/useStaffMutations";
import { useCopyToClipboard } from "../hooks/useCopyToClipboard";

type User = components["schemas"]["UserPublic"];

/**
 * Confirms, then generates a one-time recovery code for `user`, which the
 * admin reads out or sends to them. A failure closes the dialog with a toast.
 */
export function RecoveryCodeDialog({
  user,
  onClose,
}: {
  user: User;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const generate = useGenerateRecoveryCode();
  const { copied, copy } = useCopyToClipboard();
  const code = generate.data;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent data-cy="staff-recovery-dialog">
        {code === undefined ? (
          <>
            <DialogHeader>
              <DialogTitle>
                {t("recoveryCodeDialogTitle")} {user.username}
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground py-2">
              {t("recoveryCodeDialogBody")}
            </p>
            <DialogFooter>
              <Button variant="ghost" onClick={onClose}>
                {t("cancel")}
              </Button>
              <Button
                data-cy="staff-recovery-generate"
                onClick={() => generate.mutate(user, { onError: onClose })}
                disabled={generate.isPending}
              >
                {generate.isPending ? t("generatingCode") : t("generateCode")}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>
                {t("recoveryCodeGeneratedTitle").replace("{0}", user.username)}
              </DialogTitle>
            </DialogHeader>
            <div className="flex items-center justify-center py-4">
              <span
                data-cy="staff-recovery-code"
                className="font-mono text-4xl font-bold tracking-widest"
              >
                {code}
              </span>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                data-cy="staff-recovery-copy"
                onClick={() => copy(code)}
              >
                {copied ? t("codeCopied") : t("copyCode")}
              </Button>
              <Button onClick={onClose}>{t("close")}</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
