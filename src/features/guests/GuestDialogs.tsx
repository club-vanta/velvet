import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { InputWithPrefix } from "@/components/ui/input-with-prefix";
import { api } from "@/api/client";
import { extractApiError } from "@/api/errors";
import { useLanguage } from "@/lib/i18n";
import { invalidateGuestBan, invalidateGuestIdentity } from "@/lib/queryKeys";
import type { components } from "@/api/types";

// Only the identity fields are needed, so both GuestPublic and the
// meetup-scoped GuestWithBanPublic can be passed in.
type Guest = Pick<
  components["schemas"]["GuestPublic"],
  "id" | "displayname" | "mazmo_handle" | "instagram_username"
>;

export function EditGuestDialog({
  guest,
  onClose,
}: {
  guest: Guest;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const [displayname, setDisplayname] = useState(guest.displayname);
  const [instagram, setInstagram] = useState(guest.instagram_username ?? "");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      const body: { displayname?: string; instagram_username?: string | null } =
        {};
      const trimmedDisplayname = displayname.trim();
      if (trimmedDisplayname && trimmedDisplayname !== guest.displayname) {
        body.displayname = trimmedDisplayname;
      }
      const trimmedInstagram = instagram.trim();
      const currentInstagram = guest.instagram_username ?? "";
      if (trimmedInstagram !== currentInstagram) {
        body.instagram_username =
          trimmedInstagram === "" ? null : trimmedInstagram;
      }
      const { error } = await api.PATCH("/guests/{guest_id}", {
        params: { path: { guest_id: guest.id } },
        body,
      });
      if (error) throw new Error(extractApiError(error, t("failedEditGuest")));
    },
    onSuccess: () => {
      invalidateGuestIdentity(queryClient, guest.id);
      toast.success(t("guestUpdated"));
      onClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("editGuestDialogTitle")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <label
              htmlFor="edit-guest-displayname"
              className="text-sm font-medium"
            >
              {t("displayName")}
            </label>
            <Input
              id="edit-guest-displayname"
              value={displayname}
              onChange={(e) => setDisplayname(e.target.value)}
              disabled={mutation.isPending}
            />
          </div>
          <div className="space-y-1">
            <label
              htmlFor="edit-guest-instagram"
              className="text-sm font-medium"
            >
              {t("instagramLabel")}
            </label>
            <Input
              id="edit-guest-instagram"
              placeholder={t("instagramPlaceholder")}
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              disabled={mutation.isPending}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!displayname.trim() || mutation.isPending}
          >
            {mutation.isPending ? t("savingChanges") : t("saveChanges")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function LinkMazmoDialog({
  guest,
  onClose,
}: {
  guest: Guest;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const [username, setUsername] = useState("");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      const { error, response } = await api.PATCH(
        "/guests/{guest_id}/link-mazmo",
        {
          params: { path: { guest_id: guest.id } },
          body: { username: username.trim() },
        },
      );
      if (error) {
        if (response.status === 404) throw new Error(t("mazmoUserNotFound"));
        if (response.status === 504) throw new Error(t("mazmoUnreachable"));
        throw new Error(extractApiError(error, t("failedLinkMazmo")));
      }
    },
    onSuccess: () => {
      invalidateGuestIdentity(queryClient, guest.id);
      toast.success(t("mazmoLinked"));
      onClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("linkMazmoDialogTitle")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-1 py-2">
          <label htmlFor="link-mazmo-username" className="text-sm font-medium">
            {t("mazmoUsername")}
          </label>
          <InputWithPrefix
            id="link-mazmo-username"
            prefix="@"
            placeholder="cindydark"
            autoComplete="off"
            autoCapitalize="none"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={mutation.isPending}
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!username.trim() || mutation.isPending}
          >
            {mutation.isPending ? t("linking") : t("link")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function UnlinkMazmoDialog({
  guest,
  onClose,
}: {
  guest: Guest;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await api.PATCH("/guests/{guest_id}/unlink-mazmo", {
        params: { path: { guest_id: guest.id } },
      });
      if (error)
        throw new Error(extractApiError(error, t("failedUnlinkMazmo")));
    },
    onSuccess: () => {
      invalidateGuestIdentity(queryClient, guest.id);
      toast.success(t("mazmoUnlinked"));
      onClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("unlinkMazmoDialogTitle")}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground py-2">
          {t("unlinkMazmoDialogBody")}{" "}
          <span className="font-medium text-foreground">
            {guest.displayname}
          </span>{" "}
          (@{guest.mazmo_handle}).
        </p>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button
            variant="destructive"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? t("unlinking") : t("unlink")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function BanDialog({
  guest,
  orgId,
  onClose,
}: {
  guest: Guest;
  orgId: string;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const [reason, setReason] = useState("");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await api.PATCH(
        "/organizations/{org_id}/guests/{guest_id}/ban",
        {
          params: {
            path: { org_id: orgId, guest_id: guest.id },
          },
          body: { reason },
        },
      );
      if (error) throw new Error(extractApiError(error, t("banFailed")));
    },
    onSuccess: () => {
      invalidateGuestBan(queryClient, orgId, guest.id);
      toast.success(t("guestVanted").replace("{0}", guest.displayname));
      onClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t("banDialogTitle")} {guest.displayname}?
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <label htmlFor="ban-reason" className="text-sm font-medium">
            {t("reasonRequired")}
          </label>
          <Textarea
            id="ban-reason"
            placeholder={t("banReasonPlaceholder")}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
          />
          <p className="text-xs text-muted-foreground">
            {reason.trim().length}/500
          </p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button
            variant="destructive"
            onClick={() => mutation.mutate()}
            disabled={
              reason.trim().length < 5 ||
              reason.trim().length > 500 ||
              mutation.isPending
            }
          >
            {mutation.isPending ? t("banning") : t("banGuest")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
