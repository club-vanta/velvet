import { Alert, AlertDescription } from "@/components/ui/alert";

/** Why a form submission failed; renders nothing without a message. */
export function AuthError({
  message,
  ...props
}: { message: string | undefined } & Omit<
  React.ComponentProps<typeof Alert>,
  "children" | "variant"
>) {
  if (!message) return null;
  return (
    <Alert variant="destructive" {...props}>
      {/* The network error spans two lines. */}
      <AlertDescription className="whitespace-pre-line text-center">
        {message}
      </AlertDescription>
    </Alert>
  );
}
