import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { useLanguage } from "@/lib/i18n";
import { meetupWeatherKey } from "@/lib/queryKeys";

/** A meetup's weather and where it stands (no location, pending, not fetched). */
export function useMeetupWeather(orgId: string, meetupId: string) {
  const { t } = useLanguage();
  return useQuery({
    queryKey: meetupWeatherKey(orgId, meetupId),
    queryFn: async () => {
      const { data, error } = await api.GET(
        "/organizations/{org_id}/meetups/{meetup_id}/weather",
        { params: { path: { org_id: orgId, meetup_id: meetupId } } },
      );
      if (error) throw new Error(t("failedLoadWeather"));
      return data;
    },
    enabled: !!orgId && !!meetupId,
  });
}
