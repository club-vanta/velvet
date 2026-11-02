import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ExternalLink, MapPin, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";
import type { components } from "@/api/types";
import { useSetMeetupLocation } from "../api/useSetMeetupLocation";
import { mapUrl } from "../lib/mapUrl";
import { AddressSearch } from "./AddressSearch";

type Meetup = components["schemas"]["MeetupPublic"];

/**
 * Where the meetup happens: the address with a map link for every member.
 * Org admins get the address search while there is no location, and change
 * and remove actions once there is one; changing opens the same search.
 * Not a FactStrip: this block is editable and has to grow for the search
 * list.
 */
export function MeetupLocation({
  orgId,
  meetup,
  canEdit,
}: {
  orgId: string;
  meetup: Meetup;
  canEdit: boolean;
}) {
  const { t } = useLanguage();
  const { location_label: label, latitude, longitude } = meetup;
  const hasLocation = label !== null && latitude !== null && longitude !== null;
  const setLocation = useSetMeetupLocation(orgId, meetup.id);
  const [changing, setChanging] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const changeRef = useRef<HTMLButtonElement>(null);
  // Set when a save starts: once the saved location renders, focus moves to
  // the control that replaced the one just used.
  const focusAfterSave = useRef(false);

  useEffect(() => {
    if (!focusAfterSave.current) return;
    focusAfterSave.current = false;
    (hasLocation ? changeRef : searchRef).current?.focus();
  }, [hasLocation, label]);

  const save = (
    location: components["schemas"]["MeetupLocationUpdate"],
    successMessage: string,
  ) => {
    // Saving the location already shown renders nothing new, so the
    // focus moves now rather than on the next location.
    const unchanged =
      location.location_label === label &&
      location.latitude === latitude &&
      location.longitude === longitude;
    focusAfterSave.current = !unchanged;
    setLocation.mutate(location, {
      onSuccess: () => {
        setChanging(false);
        toast.success(successMessage);
        if (unchanged) requestAnimationFrame(() => changeRef.current?.focus());
      },
      onError: (err) => {
        focusAfterSave.current = false;
        toast.error(err.message);
      },
    });
  };

  // The control to focus next appears on the next render.
  const startChange = () => {
    setChanging(true);
    requestAnimationFrame(() => searchRef.current?.focus());
  };

  const cancelChange = () => {
    setChanging(false);
    requestAnimationFrame(() => changeRef.current?.focus());
  };

  return (
    // Below @md the meetup header stacks on a centered axis, so the pin sits
    // above the address and the links center with it.
    <div className="space-y-2 text-sm" data-cy="meetup-location">
      <div className="flex flex-col items-center gap-1 @md:flex-row @md:items-start @md:gap-2">
        <MapPin
          className="size-4 shrink-0 text-muted-foreground @md:mt-0.5"
          aria-hidden="true"
        />
        <span className="sr-only">{t("meetupLocation")}</span>
        {hasLocation ? (
          <div className="min-w-0 space-y-1">
            <p className="break-words" data-cy="meetup-location-label">
              {label}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 @md:justify-start">
              <a
                href={mapUrl(latitude, longitude)}
                target="_blank"
                rel="noreferrer"
                aria-label={`${t("meetupLocationOpenMap")}: ${label}`}
                className="inline-flex items-center gap-1 rounded-sm text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                data-cy="meetup-location-map"
              >
                {t("meetupLocationOpenMap")}
                <ExternalLink className="size-3" aria-hidden="true" />
              </a>
              {canEdit && !changing && (
                <Button
                  ref={changeRef}
                  variant="ghost"
                  size="sm"
                  onClick={startChange}
                  className="h-auto gap-1 px-0 py-0 text-xs text-muted-foreground hover:bg-transparent"
                  data-cy="meetup-location-change"
                >
                  <Pencil className="size-3" aria-hidden="true" />
                  {t("meetupLocationChange")}
                </Button>
              )}
              {canEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={setLocation.isPending}
                  onClick={() =>
                    save(
                      { location_label: null, latitude: null, longitude: null },
                      t("meetupLocationRemoved"),
                    )
                  }
                  className="h-auto gap-1 px-0 py-0 text-xs text-muted-foreground hover:bg-transparent"
                  data-cy="meetup-location-remove"
                >
                  <X className="size-3" aria-hidden="true" />
                  {t("meetupLocationRemove")}
                </Button>
              )}
            </div>
          </div>
        ) : (
          <span
            className="text-muted-foreground"
            data-cy="meetup-location-none"
          >
            {t("meetupLocationNone")}
          </span>
        )}
      </div>
      {canEdit && (!hasLocation || changing) && (
        <AddressSearch
          ref={searchRef}
          orgId={orgId}
          saving={setLocation.isPending}
          onCancel={changing ? cancelChange : undefined}
          onPick={(result) =>
            save(
              {
                location_label: result.label,
                latitude: result.latitude,
                longitude: result.longitude,
              },
              t("meetupLocationSaved"),
            )
          }
        />
      )}
    </div>
  );
}
