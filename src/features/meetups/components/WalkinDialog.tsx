import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ShowMoreButton } from "@/components/ListToolbar";
import { useAllGuests, useGuestSearch } from "@/domain/guest";
import { useIncrementalList } from "@/hooks/useIncrementalList";
import { useLanguage } from "@/lib/i18n";
import { useAddWalkin } from "../api/useAddWalkin";
import { WalkinCandidate } from "./WalkinCandidate";

/**
 * Adds a known guest who did not RSVP. The picker searches the whole guest
 * directory, minus whoever is already on this meetup's list.
 */
export function WalkinDialog({
  orgId,
  meetupId,
  alreadyRsvped,
  onClose,
}: {
  orgId: string;
  meetupId: string;
  alreadyRsvped: Set<string>;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const allGuestsQ = useAllGuests();
  const addWalkin = useAddWalkin(orgId, meetupId);

  // The React Compiler caches this, so typing doesn't re-fold the directory.
  // It stops if `eligible` is read after the hooks below (see AllGuestsTab).
  const eligible = (allGuestsQ.data?.guests ?? []).filter(
    (g) => !alreadyRsvped.has(g.id),
  );
  const {
    search,
    setSearch,
    filtered: candidates = [],
    query,
  } = useGuestSearch(eligible);
  // The whole directory can be a thousand guests; mount them a page at a time.
  const { visible, nextCount, showMore } = useIncrementalList(
    candidates,
    query,
  );

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md" data-cy="walkin-dialog">
        <DialogHeader>
          <DialogTitle>{t("walkinDialogTitle")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <Input
            placeholder={t("searchGuest")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
            data-cy="walkin-search"
          />
          {allGuestsQ.isLoading && (
            <div className="space-y-2" data-cy="walkin-loading">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
          )}
          {allGuestsQ.isError && (
            <p className="text-sm text-destructive" data-cy="walkin-error">
              {t("failedLoadGuestListShort")}
            </p>
          )}
          {!allGuestsQ.isLoading && candidates.length === 0 && (
            <p
              className="text-sm text-muted-foreground text-center py-4 whitespace-pre-line"
              data-cy="walkin-empty"
            >
              {query ? t("noEligibleGuests") : t("allGuestsOnList")}
            </p>
          )}
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {visible?.map((guest) => (
              <WalkinCandidate
                key={guest.id}
                guest={guest}
                disabled={addWalkin.isPending}
                onAdd={() =>
                  addWalkin.mutate(guest.id, {
                    onSuccess: () => {
                      toast.success(
                        t("walkinAddedToast").replace("{0}", guest.displayname),
                      );
                      onClose();
                    },
                    onError: (err) => toast.error(err.message),
                  })
                }
              />
            ))}
            <ShowMoreButton count={nextCount} onShowMore={showMore} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} data-cy="dialog-cancel">
            {t("cancel")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
