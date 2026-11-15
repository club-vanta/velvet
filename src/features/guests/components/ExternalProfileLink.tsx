import { ExternalLink } from "lucide-react";

/** A link to the guest's profile on another site, opened in a new tab. */
export function ExternalProfileLink({
  href,
  label,
  "data-cy": dataCy,
  children,
}: {
  href: string;
  label: string;
  "data-cy"?: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      title={label}
      data-cy={dataCy}
      className="inline-flex min-w-0 items-center gap-1 rounded-sm break-all underline-offset-4 hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      {children}
      <ExternalLink className="size-3 shrink-0" aria-hidden="true" />
    </a>
  );
}
