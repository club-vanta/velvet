import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useIsOrgAdmin, useOrg } from "@/domain/session";
import { useLanguage } from "@/lib/i18n";
import { AddGuestDialog } from "./components/AddGuestDialog";
import { AllGuestsTab } from "./components/AllGuestsTab";
import { NoOrganization } from "./components/NoOrganization";
import { RefreshFromMazmoButton } from "./components/RefreshFromMazmoButton";
import { VantedGuestsTab } from "./components/VantedGuestsTab";

/** The guest directory, and the guests vanted in the active org. */
export function GuestsPage() {
  const { t } = useLanguage();
  const { activeOrg } = useOrg();
  const isOrgAdmin = useIsOrgAdmin();
  const [addGuestOpen, setAddGuestOpen] = useState(false);

  if (!activeOrg) return <NoOrganization />;

  return (
    <div className="@container space-y-6" data-cy="guests-page">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t("guests")}</h1>
        <div className="flex flex-wrap justify-end gap-2">
          <RefreshFromMazmoButton />
          <Button data-cy="guests-add" onClick={() => setAddGuestOpen(true)}>
            {t("addNewGuest")}
          </Button>
        </div>
      </div>
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all" data-cy="guests-tab-all">
            {t("allGuests")}
          </TabsTrigger>
          <TabsTrigger value="banned" data-cy="guests-tab-vanted">
            {t("bannedGuests")}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="mt-4 space-y-4">
          <AllGuestsTab isOrgAdmin={isOrgAdmin} orgId={activeOrg.org_id} />
        </TabsContent>
        <TabsContent value="banned" className="mt-4 space-y-4">
          <VantedGuestsTab isOrgAdmin={isOrgAdmin} orgId={activeOrg.org_id} />
        </TabsContent>
      </Tabs>
      {addGuestOpen && (
        <AddGuestDialog onClose={() => setAddGuestOpen(false)} />
      )}
    </div>
  );
}
