import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useMediaQuery } from "./useMediaQuery";

/** A matchMedia whose answer the test can flip, notifying listeners. */
function stubMatchMedia(initial: boolean) {
  let matches = initial;
  const listeners = new Set<() => void>();
  vi.stubGlobal("matchMedia", (media: string) => ({
    get matches() {
      return matches;
    },
    media,
    addEventListener: (_: string, l: () => void) => listeners.add(l),
    removeEventListener: (_: string, l: () => void) => listeners.delete(l),
  }));
  return {
    set(next: boolean) {
      matches = next;
      listeners.forEach((l) => l());
    },
    listeners,
  };
}

describe("useMediaQuery", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("follows the query as it starts and stops matching", () => {
    const media = stubMatchMedia(false);
    const { result } = renderHook(() => useMediaQuery("(min-width: 1280px)"));
    expect(result.current).toBe(false);

    act(() => media.set(true));
    expect(result.current).toBe(true);
  });

  it("stops listening on unmount", () => {
    const media = stubMatchMedia(true);
    const { unmount } = renderHook(() => useMediaQuery("(min-width: 1px)"));
    expect(media.listeners.size).toBe(1);
    unmount();
    expect(media.listeners.size).toBe(0);
  });

  it("falls back where matchMedia is missing, as in jsdom", () => {
    vi.stubGlobal("matchMedia", undefined);
    expect(renderHook(() => useMediaQuery("(x)")).result.current).toBe(true);
    expect(renderHook(() => useMediaQuery("(x)", false)).result.current).toBe(
      false,
    );
  });
});
