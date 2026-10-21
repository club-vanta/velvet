import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MoreHorizontal, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api } from "@/api/client";
import { extractApiError } from "@/api/errors";
import { useLanguage } from "@/lib/i18n";
import {
  GUEST_TYPES,
  GUEST_TYPE_DESCRIPTION,
  GUEST_TYPE_LABEL,
  isGuestType,
  type GuestType,
} from "@/lib/guestType";
import { invalidateMeetupGuests } from "@/lib/queryKeys";
import type { components } from "@/api/types";

type MeetupGuest = components["schemas"]["MeetupGuestPublic"];

export function GuestRowActions({
  guest,
  orgId,
  meetupId,
  isOrgAdmin,
  isFinalized,
  onViewProfile,
}: {
  guest: MeetupGuest;
  orgId: string;
  meetupId: string;
  isOrgAdmin: boolean;
  isFinalized: boolean;
  onViewProfile: () => void;
}) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  const typeMutation = useMutation({
    mutationFn: async (guestType: GuestType) => {
      const { data, error } = await api.PATCH(
        "/organizations/{org_id}/meetups/{meetup_id}/guests/{guest_id}/type",
        {
          params: {
            path: {
              org_id: orgId,
              meetup_id: meetupId,
              guest_id: guest.guest.id,
            },
          },
          body: { guest_type: guestType },
        },
      );
      if (error)
        throw new Error(extractApiError(error, t("failedChangeGuestType")));
      return data;
    },
    onSuccess: (data, guestType) => {
      invalidateMeetupGuests(queryClient, orgId, meetupId);
      toast.success(
        t("guestTypeChanged")
          .replace("{0}", data?.guest.displayname ?? guest.guest.displayname)
          .replace("{1}", t(GUEST_TYPE_LABEL[guestType])),
      );
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const currentType = guest.rsvp.guest_type;
  const typeLocked = isFinalized || typeMutation.isPending;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            aria-label={`${t("guestActions")}: ${guest.guest.displayname}`}
          />
        }
      >
        <MoreHorizontal className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuItem onClick={onViewProfile}>
          <UserRound />
          {t("viewProfile")}
        </DropdownMenuItem>
        {isOrgAdmin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel>{t("guestType")}</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={currentType}
                onValueChange={(value: string) => {
                  if (isGuestType(value) && value !== currentType) {
                    typeMutation.mutate(value);
                  }
                }}
              >
                {GUEST_TYPES.map((type) => (
                  <DropdownMenuRadioItem
                    key={type}
                    value={type}
                    disabled={typeLocked}
                    closeOnClick
                  >
                    <span className="flex flex-col gap-0.5">
                      <span>{t(GUEST_TYPE_LABEL[type])}</span>
                      <span className="text-xs text-muted-foreground">
                        {t(GUEST_TYPE_DESCRIPTION[type])}
                      </span>
                    </span>
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
              {isFinalized && (
                <p className="px-1.5 py-1 text-xs text-muted-foreground">
                  {t("guestTypeLockedFinalized")}
                </p>
              )}
            </DropdownMenuGroup>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
