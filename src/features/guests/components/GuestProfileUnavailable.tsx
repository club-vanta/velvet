import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";

/**
 * The guest could not be shown: it doesn't exist (no retry, a 404 will not
 * fix itself) or it failed to load.
 */
export function GuestProfileUnavailable({
  Title,
  notFound,
  onRetry,
}: {
  Title: "h1" | "h2";
  notFound: boolean;
  onRetry: () => void;
}) {
  const { t } = useLanguage();
  return (
    <div className="space-y-4" data-cy="guest-profile-unavailable">
      <Title className="text-2xl font-semibold">
        {notFound ? t("guestNotFound") : t("failedLoadGuest")}
      </Title>
      {!notFound && (
        <Button variant="outline" onClick={onRetry}>
          {t("retry")}
        </Button>
      )}
    </div>
  );
}
