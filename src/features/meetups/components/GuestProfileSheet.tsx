import { Link } from "react-router-dom";
import { buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { GuestProfile } from "@/features/guests";
import { useLanguage } from "@/lib/i18n";
import type { components } from "@/api/types";

type MeetupGuest = components["schemas"]["MeetupGuestPublic"];

/** A guest's profile beside the list, with a link to their full page. */
export function GuestProfileSheet({
  orgId,
  orgName,
  guest,
  open,
  onOpenChange,
}: {
  orgId: string;
  orgName: string;
  /** Kept while the sheet slides out, so its content stays put. */
  guest: MeetupGuest | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useLanguage();
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="overflow-y-auto data-[side=right]:w-full data-[side=right]:sm:max-w-md"
        data-cy="guest-profile-sheet"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>
            {t("guestProfileOf").replace("{0}", guest?.guest.displayname ?? "")}
          </SheetTitle>
        </SheetHeader>
        {guest && (
          <>
            <div className="px-4 pt-10">
              <GuestProfile
                key={guest.guest.id}
                guestId={guest.guest.id}
                orgId={orgId}
                orgName={orgName}
                titleAs="h2"
                knownBanned={guest.guest.is_banned}
              />
            </div>
            <SheetFooter>
              <Link
                to={`/guests/${guest.guest.id}`}
                className={buttonVariants({ variant: "outline" })}
                data-cy="guest-profile-open-full"
              >
                {t("openFullProfile")}
              </Link>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
