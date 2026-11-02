import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useOrgMeetups } from "@/domain/meetup";
import { useOrg } from "@/domain/session";
import { useLanguage } from "@/lib/i18n";
import { EVENTS_PAGE_SIZE, useOrgEvents } from "./api/useOrgEvents";
import { EventsTable } from "./components/EventsTable";
import { EventTypeFilter } from "./components/EventTypeFilter";

export function EventsPage() {
  const { t } = useLanguage();
  const { activeOrg } = useOrg();
  const orgId = activeOrg?.org_id ?? "";
  const [eventType, setEventType] = useState("all");
  const [offset, setOffset] = useState(0);

  const meetupsQ = useOrgMeetups(orgId);
  const meetupNames = new Map(
    (meetupsQ.data?.meetups ?? []).map((m) => [m.id, m.name]),
  );
  const { data, isLoading, isError, refetch } = useOrgEvents(
    orgId,
    eventType,
    offset,
  );
  const events = data?.events ?? [];

  if (!activeOrg) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground" data-cy="events-no-org">
          {t("noOrganization")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{t("auditLog")}</h1>

      <div className="flex items-center gap-3">
        <EventTypeFilter
          value={eventType}
          onChange={(type) => {
            setEventType(type);
            setOffset(0);
          }}
        />
      </div>

      {isError && (
        <Alert variant="destructive" data-cy="events-error">
          <AlertDescription className="flex items-center justify-between">
            {t("failedLoadAuditLog")}
            <Button variant="ghost" size="sm" onClick={() => refetch()}>
              {t("retry")}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <EventsTable
        events={events}
        isLoading={isLoading}
        meetupNames={meetupNames}
      />

      {events.length === EVENTS_PAGE_SIZE && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            data-cy="events-load-more"
            onClick={() => setOffset(offset + EVENTS_PAGE_SIZE)}
          >
            {t("loadMore")}
          </Button>
        </div>
      )}
    </div>
  );
}
