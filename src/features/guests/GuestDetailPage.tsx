import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useIsOrgAdmin, useOrg } from "@/domain/session";
import { useLanguage } from "@/lib/i18n";
import type { components } from "@/api/types";
import { useUnbanGuest } from "./api/useUnbanGuest";
import { GuestDialog, type OpenGuestDialog } from "./components/GuestDialog";
import { GuestProfile } from "./components/GuestProfile";
import { GuestProfileActions } from "./components/GuestProfileActions";
import { NoOrganization } from "./components/NoOrganization";
import type { GuestAction } from "./lib/guestActions";
import { vantStatus } from "./lib/vantStatus";

type Guest = components["schemas"]["GuestPublic"];

/** /guests/:guestId: one guest's profile, with the actions on it. */
export function GuestDetailPage() {
  const { t } = useLanguage();
  const { guestId = "" } = useParams<{ guestId: string }>();
  const { activeOrg } = useOrg();
  const orgId = activeOrg?.org_id ?? "";
  const isOrgAdmin = useIsOrgAdmin();
  const [dialog, setDialog] = useState<OpenGuestDialog | null>(null);
  const unban = useUnbanGuest(orgId);

  if (!activeOrg) return <NoOrganization />;

  const onAction = (action: GuestAction, guest: Guest) => {
    if (action === "unban") unban.mutate(guest);
    else setDialog({ kind: action, guest });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6" data-cy="guest-page">
      <Link
        to="/guests"
        data-cy="guest-back"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {t("backToGuests")}
      </Link>

      <GuestProfile
        key={guestId}
        guestId={guestId}
        orgId={orgId}
        orgName={activeOrg.org_name}
        actions={(guest, ban, banKnown) => (
          <GuestProfileActions
            guest={guest}
            status={vantStatus(banKnown, !!ban)}
            isOrgAdmin={isOrgAdmin}
            unbanPending={unban.isPending}
            onAction={onAction}
          />
        )}
      />

      <GuestDialog
        dialog={dialog}
        orgId={orgId}
        onClose={() => setDialog(null)}
      />
    </div>
  );
}
