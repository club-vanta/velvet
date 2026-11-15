import { ExternalLink } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** The Mazmo URL without the scheme, which is the same on every meetup. */
export function MazmoUrlLink({
  url,
  text,
  className,
}: {
  url: string;
  /** Shown instead of the bare URL; it then names the link on its own. */
  text?: string;
  className?: string;
}) {
  const { t } = useLanguage();
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      title={url}
      aria-label={text ? undefined : t("openOnMazmo").replace("{0}", url)}
      className={cn(
        "relative z-10 inline-flex min-w-0 items-center gap-1 rounded-sm underline-offset-4 hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        className,
      )}
      data-cy="meetup-mazmo-link"
    >
      <span className="truncate">
        {text ?? url.replace(/^https?:\/\//, "")}
      </span>
      <ExternalLink className="size-3 shrink-0" aria-hidden="true" />
    </a>
  );
}
