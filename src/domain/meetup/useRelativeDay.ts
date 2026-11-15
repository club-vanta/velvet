import { LOCALE, useLanguage } from "@/lib/i18n";
import { daysFromToday } from "./meetupTiming";

/** "today", "tomorrow", "in 3 days", "2 days ago", in the UI language. */
export function useRelativeDay() {
  const { lang } = useLanguage();
  const rtf = new Intl.RelativeTimeFormat(LOCALE[lang], { numeric: "auto" });
  return (date: string) => rtf.format(daysFromToday(date), "day");
}
