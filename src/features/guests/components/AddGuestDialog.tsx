import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { InputWithPrefix } from "@/components/ui/input-with-prefix";
import { useLanguage } from "@/lib/i18n";
import { useAddManualGuest, useAddMazmoGuest } from "../api/useAddGuest";
import { DialogField } from "./DialogField";
import { GuestActionDialog } from "./GuestActionDialog";
import { InstagramField } from "./InstagramField";

type Source = "mazmo" | "manual";

/**
 * Registers a guest, by Mazmo handle (the default: the backend fills in the
 * rest) or by name for guests without a Mazmo account. The Instagram handle
 * is shared by both tabs.
 */
export function AddGuestDialog({ onClose }: { onClose: () => void }) {
  const { t } = useLanguage();
  const [source, setSource] = useState<Source>("mazmo");
  const [username, setUsername] = useState("");
  const [displayname, setDisplayname] = useState("");
  const [instagram, setInstagram] = useState("");
  const addMazmo = useAddMazmoGuest();
  const addManual = useAddManualGuest();
  const isPending = addMazmo.isPending || addManual.isPending;
  const instagram_username = instagram.trim() || null;

  const submit = () => {
    if (source === "mazmo") {
      addMazmo.mutate(
        { username: username.trim(), instagram_username },
        { onSuccess: onClose },
      );
    } else {
      addManual.mutate(
        { displayname: displayname.trim(), instagram_username },
        { onSuccess: onClose },
      );
    }
  };

  return (
    <GuestActionDialog
      data-cy="add-guest-dialog"
      title={t("addNewGuest")}
      confirmLabel={t("add")}
      pendingLabel={t("adding")}
      isPending={isPending}
      canConfirm={source === "mazmo" ? !!username.trim() : !!displayname.trim()}
      onConfirm={submit}
      onClose={onClose}
    >
      <Tabs value={source} onValueChange={(v) => setSource(v as Source)}>
        <TabsList>
          <TabsTrigger value="mazmo" data-cy="add-guest-tab-mazmo">
            {t("tabWithMazmo")}
          </TabsTrigger>
          <TabsTrigger value="manual" data-cy="add-guest-tab-manual">
            {t("tabManual")}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="mazmo" className="space-y-3 py-2">
          <DialogField htmlFor="add-guest-username" label={t("mazmoUsername")}>
            <InputWithPrefix
              id="add-guest-username"
              data-cy="add-guest-username"
              prefix="@"
              placeholder="cindydark"
              autoComplete="off"
              autoCapitalize="none"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isPending}
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus
            />
          </DialogField>
          <InstagramField
            id="add-guest-instagram-mazmo"
            value={instagram}
            onChange={setInstagram}
            disabled={isPending}
          />
        </TabsContent>
        <TabsContent value="manual" className="space-y-3 py-2">
          <DialogField htmlFor="add-guest-displayname" label={t("displayName")}>
            <Input
              id="add-guest-displayname"
              data-cy="add-guest-displayname"
              placeholder={t("displaynamePlaceholder")}
              value={displayname}
              onChange={(e) => setDisplayname(e.target.value)}
              disabled={isPending}
            />
          </DialogField>
          <InstagramField
            id="add-guest-instagram-manual"
            value={instagram}
            onChange={setInstagram}
            disabled={isPending}
          />
        </TabsContent>
      </Tabs>
    </GuestActionDialog>
  );
}
