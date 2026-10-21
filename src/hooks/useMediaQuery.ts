import { useCallback, useSyncExternalStore } from "react";

/**
 * Whether a CSS media query currently matches. Falls back to `fallback`
 * where matchMedia is unavailable (jsdom in tests).
 */
export function useMediaQuery(query: string, fallback = true): boolean {
  // Stable per query, so React does not resubscribe on every render.
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (typeof window.matchMedia !== "function") return () => {};
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    [query],
  );
  return useSyncExternalStore(subscribe, () =>
    typeof window.matchMedia === "function"
      ? window.matchMedia(query).matches
      : fallback,
  );
}
