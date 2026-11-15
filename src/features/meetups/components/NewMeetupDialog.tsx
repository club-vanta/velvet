import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/lib/i18n";
import { useCreateMeetup } from "../api/useCreateMeetup";

/**
 * Creates a meetup from its Mazmo event. The backend reads the date from
 * Mazmo, so the form only asks for a name, the URL and the payment rule.
 */
export function NewMeetupDialog({
  orgId,
  open,
  onClose,
}: {
  orgId: string;
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [requiresPayment, setRequiresPayment] = useState(false);
  const create = useCreateMeetup(orgId);

  function submit() {
    create.mutate(
      { name, mazmo_meetup_url: url, requires_payment: requiresPayment },
      {
        onSuccess: () => {
          toast.success(t("meetupCreated"));
          setName("");
          setUrl("");
          setRequiresPayment(false);
          onClose();
        },
        onError: (err) => toast.error(err.message),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent data-cy="new-meetup-dialog">
        <DialogHeader>
          <DialogTitle>{t("newMeetup")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <label htmlFor="meetup-name" className="text-sm font-medium">
              {t("name")}
            </label>
            <Input
              id="meetup-name"
              placeholder={t("meetupNamePlaceholder")}
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-cy="new-meetup-name"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="meetup-url" className="text-sm font-medium">
              {t("mazmoUrl")}
            </label>
            <Input
              id="meetup-url"
              placeholder={t("meetupUrlPlaceholder")}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              data-cy="new-meetup-url"
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="meetup-requires-payment"
              checked={requiresPayment}
              onCheckedChange={(checked) => setRequiresPayment(checked)}
              data-cy="new-meetup-requires-payment"
            />
            <label
              htmlFor="meetup-requires-payment"
              className="text-sm font-medium"
            >
              {t("requiresPayment")}
            </label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} data-cy="dialog-cancel">
            {t("cancel")}
          </Button>
          <Button
            onClick={submit}
            disabled={!name || !url || create.isPending}
            data-cy="new-meetup-submit"
          >
            {create.isPending ? t("creating") : t("create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
