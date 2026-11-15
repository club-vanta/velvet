import type { components } from "@/api/types";
import { GuestAvatar } from "@/components/GuestAvatar";
import { cn } from "@/lib/utils";
import { bandStyle, FADED, visitBand } from "./nightCrowd";

type NightGuest = components["schemas"]["NightGuestPublic"];

/**
 * A guest's face ringed in the colour of their band that night, popping in
 * after `delayMs`. Hover shows its card; on a phone a tap does, and a scroll
 * that starts on it does not (it ends in pointercancel, not pointerup).
 */
export function Face({
  guest,
  faded,
  delayMs,
  onShow,
}: {
  guest: NightGuest;
  faded: boolean;
  delayMs: number;
  onShow: (face: HTMLElement, guest: NightGuest) => void;
}) {
  return (
    <span
      data-guest={guest.guest_id}
      data-cy={`stats-face-${guest.guest_id}`}
      data-came-back={guest.came_back}
      className="group inline-flex animate-in rounded-full ring-2 ring-(--band) transition-transform duration-150 fill-mode-both fade-in zoom-in-50 hover:scale-110 motion-reduce:animate-none"
      style={{
        ...bandStyle(visitBand(guest.visit)),
        animationDelay: `${delayMs}ms`,
      }}
      onPointerEnter={(e) => {
        if (e.pointerType !== "touch") onShow(e.currentTarget, guest);
      }}
      onPointerUp={(e) => {
        if (e.pointerType === "touch") onShow(e.currentTarget, guest);
      }}
    >
      <GuestAvatar
        name={guest.displayname}
        src={guest.avatar_url}
        className={cn(
          "transition duration-150 group-hover:opacity-100 group-hover:grayscale-0 sm:size-10 sm:text-sm",
          faded && FADED,
        )}
      />
    </span>
  );
}
