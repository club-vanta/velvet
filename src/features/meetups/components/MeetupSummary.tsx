import { Carousel } from "@/components/Carousel";
import { useLanguage } from "@/lib/i18n";
import { MeetupStats } from "./MeetupStats";
import { MeetupWeather } from "./MeetupWeather";

/**
 * The meetup's numbers and weather in the space of one, so the guest list
 * starts higher up. Attendance comes first: it is what the door checks during
 * the night. Without guests there are no stats, so only the weather shows.
 */
export function MeetupSummary({
  orgId,
  meetupId,
  isOrgAdmin,
  stats,
}: {
  orgId: string;
  meetupId: string;
  isOrgAdmin: boolean;
  stats?: Omit<React.ComponentProps<typeof MeetupStats>, "orgId" | "meetupId">;
}) {
  const { t } = useLanguage();

  const weather = {
    id: "weather",
    label: t("weatherTitle"),
    content: (
      <MeetupWeather
        orgId={orgId}
        meetupId={meetupId}
        canRefresh={isOrgAdmin}
      />
    ),
  };

  return (
    <Carousel
      label={t("meetupSummary")}
      data-cy="meetup-summary"
      slides={
        stats
          ? [
              {
                id: "attendance",
                label: t("meetupSummaryAttendance"),
                content: (
                  <MeetupStats orgId={orgId} meetupId={meetupId} {...stats} />
                ),
              },
              weather,
            ]
          : [weather]
      }
    />
  );
}
