import { useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "@/domain/session";
import { useOrganization } from "./api/useOrganizations";
import { EditOrgDialog } from "./components/EditOrgDialog";
import { MembersSection } from "./components/MembersSection";
import { OrgHeader } from "./components/OrgHeader";

/**
 * The route element for /organizations/:orgId. React Router keeps it
 * mounted when only the id changes (back/forward, a link to another org),
 * so the page is keyed by the id: open dialogs and a typed search never
 * carry over to the next org.
 */
export function OrganizationDetailPage() {
  const { orgId = "" } = useParams<{ orgId: string }>();
  return <OrganizationDetail key={orgId} orgId={orgId} />;
}

function OrganizationDetail({ orgId }: { orgId: string }) {
  const { user } = useAuth();
  const [editOpen, setEditOpen] = useState(false);
  const isSiteAdmin = user?.role.name === "SITE_ADMIN";
  const orgQ = useOrganization(orgId);
  const org = orgQ.data;

  return (
    <div className="space-y-6">
      <OrgHeader
        org={org}
        isLoading={orgQ.isLoading}
        isError={orgQ.isError}
        onEdit={isSiteAdmin ? () => setEditOpen(true) : undefined}
      />

      <MembersSection orgId={orgId} />

      {isSiteAdmin && org && editOpen && (
        <EditOrgDialog org={org} onClose={() => setEditOpen(false)} />
      )}
    </div>
  );
}
