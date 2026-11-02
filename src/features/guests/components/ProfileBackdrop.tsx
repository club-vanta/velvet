import { useState } from "react";

/**
 * The guest's own avatar, blurred and faded into the card, so each profile
 * reads as that person's pass rather than a generic form.
 */
export function ProfileBackdrop({ src }: { src: string | null | undefined }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-44 overflow-hidden"
    >
      {src && src !== failedSrc ? (
        <img
          src={src}
          alt=""
          referrerPolicy="no-referrer"
          onError={() => setFailedSrc(src)}
          className="size-full scale-125 object-cover opacity-80 blur-2xl saturate-150"
        />
      ) : (
        <div className="size-full bg-gradient-to-br from-muted to-transparent" />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-card/0 via-card/45 to-card" />
    </div>
  );
}
