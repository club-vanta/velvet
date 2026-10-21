import { useLanguage, type Lang } from "@/lib/i18n";
import { daysFromToday } from "@/lib/meetupTiming";

export const LOCALE: Record<Lang, string> = { es: "es-AR", en: "en-US" };

/** "today", "tomorrow", "in 3 days", "2 days ago", in the UI language. */
export function useRelativeDay() {
  const { lang } = useLanguage();
  const rtf = new Intl.RelativeTimeFormat(LOCALE[lang], { numeric: "auto" });
  return (date: string) => rtf.format(daysFromToday(date), "day");
}
