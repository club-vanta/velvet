import { useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "@/domain/session";
import { useOrganization } from "./api/useOrganizations";
import { EditOrgDialog } from "./components/EditOrgDialog";
import { MembersSection } from "./components/MembersSection";
import { OrgHeader } from "./components/OrgHeader";

export function OrganizationDetailPage() {
  const { user } = useAuth();
  const { orgId = "" } = useParams<{ orgId: string }>();
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
