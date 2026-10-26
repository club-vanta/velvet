import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsOrgAdmin, useOrg } from "@/lib/org";
import { useLanguage } from "@/lib/i18n";
import { GuestProfile } from "./GuestProfile";
import {
  BanDialog,
  EditGuestDialog,
  LinkMazmoDialog,
  UnlinkMazmoDialog,
} from "./GuestDialogs";
import { useUnbanGuest } from "./useUnbanGuest";
import type { components } from "@/api/types";

type Guest = components["schemas"]["GuestPublic"];
type Dialog = "edit" | "link" | "unlink" | "ban";

export function GuestDetailPage() {
  const { t } = useLanguage();
  const { guestId } = useParams<{ guestId: string }>();
  const { activeOrg } = useOrg();
  const orgId = activeOrg?.org_id ?? "";
  const isOrgAdmin = useIsOrgAdmin();
  const [dialog, setDialog] = useState<{ kind: Dialog; guest: Guest } | null>(
    null,
  );
  const unbanMutation = useUnbanGuest(orgId);

  if (!activeOrg) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">{t("noOrganization")}</p>
      </div>
    );
  }

  const close = () => setDialog(null);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        to="/guests"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {t("backToGuests")}
      </Link>

      <GuestProfile
        key={guestId}
        guestId={guestId!}
        orgId={orgId}
        orgName={activeOrg.org_name}
        actions={(guest, ban, banKnown) => (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDialog({ kind: "edit", guest })}
            >
              {t("editGuest")}
            </Button>
            {guest.mazmo_handle ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDialog({ kind: "unlink", guest })}
                // The backend refuses to unlink a guest vanted in any org
                // (ban-evasion guard). Only this org's vants are known here,
                // so a vant elsewhere still ends in the backend's 409.
                disabled={!!ban}
                title={ban ? t("unlinkBlockedVanted") : undefined}
              >
                {t("unlinkMazmoAccount")}
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDialog({ kind: "link", guest })}
              >
                {t("linkMazmoAccount")}
              </Button>
            )}
            {isOrgAdmin &&
              banKnown &&
              (ban ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => unbanMutation.mutate(guest)}
                  disabled={unbanMutation.isPending}
                >
                  {t("unban")}
                </Button>
              ) : (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setDialog({ kind: "ban", guest })}
                >
                  {t("ban")}
                </Button>
              ))}
          </>
        )}
      />

      {dialog?.kind === "edit" && (
        <EditGuestDialog guest={dialog.guest} onClose={close} />
      )}
      {dialog?.kind === "link" && (
        <LinkMazmoDialog guest={dialog.guest} onClose={close} />
      )}
      {dialog?.kind === "unlink" && (
        <UnlinkMazmoDialog guest={dialog.guest} onClose={close} />
      )}
      {dialog?.kind === "ban" && (
        <BanDialog guest={dialog.guest} orgId={orgId} onClose={close} />
      )}
    </div>
  );
}
