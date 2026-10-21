import { useState } from "react";
import { cn } from "@/lib/utils";

const SIZE_CLASS = {
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-20 text-2xl",
} as const;

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  // Array.from splits by code point, so an emoji at the start of a name
  // is kept whole instead of leaving half a surrogate pair.
  const firstChar = (word: string | undefined) =>
    word ? (Array.from(word)[0] ?? "") : "";
  const first = firstChar(words[0]);
  const last = words.length > 1 ? firstChar(words.at(-1)) : "";
  return (first + last).toUpperCase();
}

/**
 * A guest's Mazmo avatar, falling back to their initials when there is no
 * avatar or the image fails to load.
 *
 * Decorative by default (`alt=""`), since it almost always sits next to the
 * guest's name. Pass `alt` when the avatar stands on its own.
 */
export function GuestAvatar({
  name,
  src,
  size = "sm",
  alt = "",
  className,
}: {
  name: string;
  src: string | null | undefined;
  size?: keyof typeof SIZE_CLASS;
  alt?: string;
  className?: string;
}) {
  // Track the URL that failed rather than a boolean, so a new src (after a
  // sync updates the avatar) gets a fresh attempt without an effect.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showImage = !!src && src !== failedSrc;

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary font-medium text-muted-foreground select-none",
        SIZE_CLASS[size],
        className,
      )}
      aria-hidden={alt === "" ? true : undefined}
    >
      {showImage ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          referrerPolicy="no-referrer"
          className="size-full object-cover"
          onError={() => setFailedSrc(src)}
        />
      ) : (
        <span
          role={alt === "" ? undefined : "img"}
          aria-label={alt || undefined}
        >
          {initials(name)}
        </span>
      )}
    </span>
  );
}
