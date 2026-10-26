import { useLanguage } from "@/lib/i18n";
import { formatCount } from "./statsFormat";

/** The footer of a stats list cut short: how many entries are not shown. */
export function StatsListMore({
  count,
  slot,
}: {
  count: number;
  slot: string;
}) {
  const { t, lang } = useLanguage();

  if (count <= 0) return null;
  return (
    <p data-slot={slot} className="pt-2 text-sm text-muted-foreground">
      {t("statsListMore").replace("{0}", formatCount(count, lang))}
    </p>
  );
}
