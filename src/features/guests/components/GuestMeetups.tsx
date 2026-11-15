import { useMatch } from "react-router-dom";
import { useLanguage } from "@/lib/i18n";
import { useGuestMeetups } from "../api/useGuestMeetups";
import { GuestMeetupItem } from "./GuestMeetupItem";
import { GuestMeetupsSummary } from "./GuestMeetupsSummary";
import {
  SectionError,
  SectionSkeleton,
  SectionTitle,
  Timeline,
} from "./ProfileSection";

/**
 * The meetups of this org the guest signed up for or walked into, newest
 * first, with whether they went. Meant for spotting people who keep signing
 * up and not showing up.
 */
export function GuestMeetups({
  guestId,
  orgId,
  headingAs,
}: {
  guestId: string;
  orgId: string;
  headingAs: "h2" | "h3";
}) {
  const { t } = useLanguage();
  // Set when the profile is open in the meetup page's side sheet.
  const currentMeetupId = useMatch("/meetups/:id")?.params.id;
  const meetupsQ = useGuestMeetups(orgId, guestId);
  const data = meetupsQ.data;

  // Without an active org there is nothing to scope the meetups to.
  if (!orgId) return null;

  return (
    <section className="space-y-3" data-cy="guest-meetups">
      <SectionTitle as={headingAs}>{t("guestMeetups")}</SectionTitle>
      {meetupsQ.isLoading && <SectionSkeleton />}
      {meetupsQ.isError && (
        <SectionError
          message={t("failedLoadGuestMeetups")}
          onRetry={() => void meetupsQ.refetch()}
        />
      )}
      {data?.meetups.length === 0 && (
        <p
          className="text-sm text-muted-foreground"
          data-cy="guest-meetups-empty"
        >
          {t("guestMeetupsEmpty")}
        </p>
      )}
      {data && data.meetups.length > 0 && (
        <>
          <GuestMeetupsSummary summary={data.summary} />
          <Timeline>
            {data.meetups.map((meetup) => (
              <GuestMeetupItem
                key={meetup.meetup_id}
                meetup={meetup}
                isCurrent={meetup.meetup_id === currentMeetupId}
              />
            ))}
          </Timeline>
        </>
      )}
    </section>
  );
}
