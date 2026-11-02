import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLanguage } from "@/lib/i18n";

/**
 * The frame of every guest dialog: a title, the body, and Cancel next to the
 * confirm button, which shows `pendingLabel` while the request runs.
 */
export function GuestActionDialog({
  title,
  confirmLabel,
  pendingLabel,
  isPending,
  canConfirm,
  destructive = false,
  onConfirm,
  onClose,
  "data-cy": dataCy,
  children,
}: {
  title: string;
  confirmLabel: string;
  pendingLabel: string;
  isPending: boolean;
  /** Whether the form is complete; the button is also off while pending. */
  canConfirm: boolean;
  destructive?: boolean;
  onConfirm: () => void;
  onClose: () => void;
  "data-cy": string;
  children: React.ReactNode;
}) {
  const { t } = useLanguage();
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent data-cy={dataCy}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {children}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button
            data-cy={`${dataCy}-confirm`}
            variant={destructive ? "destructive" : "default"}
            onClick={onConfirm}
            disabled={!canConfirm || isPending}
          >
            {isPending ? pendingLabel : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
