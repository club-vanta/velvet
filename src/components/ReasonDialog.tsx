import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useLanguage } from "@/lib/i18n";

const MIN_REASON = 5;
const MAX_REASON = 500;

type ReasonDialogProps = {
  title: React.ReactNode;
  placeholder: string;
  confirmLabel: string;
  pendingLabel: string;
  isPending: boolean;
  onConfirm: (reason: string) => void;
  onClose: () => void;
};

export function ReasonDialog({
  title,
  placeholder,
  confirmLabel,
  pendingLabel,
  isPending,
  onConfirm,
  onClose,
}: ReasonDialogProps) {
  const { t } = useLanguage();
  const [reason, setReason] = useState("");
  const trimmed = reason.trim();
  const isValid = trimmed.length >= MIN_REASON && trimmed.length <= MAX_REASON;
  const reasonId = useId();

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <label htmlFor={reasonId} className="text-sm font-medium">
            {t("reasonRequired")}
          </label>
          <Textarea
            id={reasonId}
            placeholder={placeholder}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
          />
          <p className="text-xs text-muted-foreground">
            {trimmed.length}/{MAX_REASON}
          </p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button
            variant="destructive"
            onClick={() => onConfirm(trimmed)}
            disabled={!isValid || isPending}
          >
            {isPending ? pendingLabel : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
