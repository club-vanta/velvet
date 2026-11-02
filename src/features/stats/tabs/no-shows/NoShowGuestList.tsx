import type { components } from "@/api/types";
import { useLanguage } from "@/lib/i18n";
import { StatsLink } from "../../components/StatsLink";
import { StatsListMore } from "../../components/StatsListMore";
import { formatCount, formatEventDay, spansYears } from "../../lib/statsFormat";
import { MissDots } from "./MissDots";

type NoShowGuest = components["schemas"]["NoShowGuestPublic"];

/** The guests who missed, most misses first, each linked to their guest page. */
export function NoShowGuestList({
  guests,
  total,
}: {
  guests: NoShowGuest[];
  total: number;
}) {
  const { t, lang } = useLanguage();
  const withYear = spansYears(guests.map((g) => g.last_no_show));

  return (
    <>
      <ul className="divide-y text-sm">
        {guests.map((guest) => (
          <li
            key={guest.guest_id}
            data-slot="guest"
            className="flex flex-col gap-1 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
          >
            <StatsLink to={`/guests/${guest.guest_id}`}>
              {guest.displayname}
            </StatsLink>
            <span className="flex items-center justify-between gap-3 text-muted-foreground tabular-nums">
              <span className="min-w-0">
                <span data-slot="missed">
                  {t("statsNoShowGuestMissed")
                    .replace("{0}", formatCount(guest.no_show, lang))
                    .replace("{1}", formatCount(guest.expected, lang))}
                </span>
                {", "}
                <span data-slot="last">
                  {t("statsNoShowGuestLast").replace(
                    "{0}",
                    formatEventDay(guest.last_no_show, withYear),
                  )}
                </span>
              </span>
              <MissDots guest={guest} />
            </span>
          </li>
        ))}
      </ul>
      <StatsListMore count={total - guests.length} slot="guests-more" />
    </>
  );
}
