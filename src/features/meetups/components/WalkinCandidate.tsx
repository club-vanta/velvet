import { Button } from "@/components/ui/button";
import { GuestAvatar } from "@/components/GuestAvatar";
import { useLanguage } from "@/lib/i18n";
import type { components } from "@/api/types";

type Guest = components["schemas"]["GuestPublic"];

/** A known guest the walk-in picker can add, with its "Add" button. */
export function WalkinCandidate({
  guest,
  disabled,
  onAdd,
}: {
  guest: Guest;
  disabled: boolean;
  onAdd: () => void;
}) {
  const { t } = useLanguage();
  return (
    <div
      className="flex items-center justify-between gap-3 rounded-md px-3 py-2 hover:bg-secondary/50"
      data-cy={`walkin-candidate-${guest.id}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <GuestAvatar
          name={guest.displayname}
          src={guest.mazmo_profile?.avatar_url}
        />
        <div className="min-w-0">
          <p className="text-sm font-medium truncate" data-cy="walkin-name">
            {guest.displayname}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {guest.mazmo_handle ? `@${guest.mazmo_handle}` : t("noMazmoHandle")}
          </p>
        </div>
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={onAdd}
        disabled={disabled}
        data-cy="walkin-add"
      >
        {t("add")}
      </Button>
    </div>
  );
}
