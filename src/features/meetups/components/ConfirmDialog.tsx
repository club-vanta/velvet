import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLanguage } from "@/lib/i18n";

/**
 * A yes-or-cancel question about one step at the door. The confirm button
 * waits while the step's request runs.
 */
export function ConfirmDialog({
  title,
  description,
  children,
  confirmLabel,
  pendingLabel = confirmLabel,
  destructive = false,
  isPending,
  onConfirm,
  onClose,
  "data-cy": dataCy,
}: {
  title: ReactNode;
  /** One sentence under the title that screen readers announce with it. */
  description?: ReactNode;
  children?: ReactNode;
  confirmLabel: string;
  pendingLabel?: string;
  destructive?: boolean;
  isPending: boolean;
  onConfirm: () => void;
  onClose: () => void;
  "data-cy"?: string;
}) {
  const { t } = useLanguage();
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent data-cy={dataCy}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {children}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} data-cy="dialog-cancel">
            {t("cancel")}
          </Button>
          <Button
            variant={destructive ? "destructive" : "default"}
            onClick={onConfirm}
            disabled={isPending}
            data-cy="dialog-confirm"
          >
            {isPending ? pendingLabel : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
