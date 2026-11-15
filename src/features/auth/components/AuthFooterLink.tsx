import { Link } from "react-router-dom";

/** A small centered link under an auth form, with optional lead-in text. */
export function AuthFooterLink({
  to,
  prompt,
  children,
  ...props
}: {
  to: string;
  prompt?: string;
  children: React.ReactNode;
  "data-cy"?: string;
}) {
  return (
    <p className="text-center text-xs text-muted-foreground">
      {prompt && <>{prompt} </>}
      <Link
        to={to}
        className="underline underline-offset-2 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        {...props}
      >
        {children}
      </Link>
    </p>
  );
}
