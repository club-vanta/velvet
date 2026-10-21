import { useSyncExternalStore } from "react";

/**
 * Whether a CSS media query currently matches. Falls back to `fallback`
 * where matchMedia is unavailable (jsdom in tests).
 */
export function useMediaQuery(query: string, fallback = true): boolean {
  return useSyncExternalStore(
    (onChange) => {
      if (typeof window.matchMedia !== "function") return () => {};
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () =>
      typeof window.matchMedia === "function"
        ? window.matchMedia(query).matches
        : fallback,
  );
}
