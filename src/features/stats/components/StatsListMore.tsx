import { useLanguage } from "@/lib/i18n";
import { formatCount } from "../lib/statsFormat";

/** The footer of a stats list cut short: how many entries are not shown. */
export function StatsListMore({
  count,
  "data-cy": dataCy,
}: {
  count: number;
  "data-cy": string;
}) {
  const { t, lang } = useLanguage();

  if (count <= 0) return null;
  return (
    <p data-cy={dataCy} className="pt-2 text-sm text-muted-foreground">
      {t("statsListMore").replace("{0}", formatCount(count, lang))}
    </p>
  );
}
