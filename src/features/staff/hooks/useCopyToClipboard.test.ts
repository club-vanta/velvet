import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCopyToClipboard } from "./useCopyToClipboard";

describe("useCopyToClipboard", () => {
  const writeText = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    writeText.mockReset().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("copies the text and says so for two seconds", async () => {
    const { result } = renderHook(() => useCopyToClipboard());

    await act(async () => result.current.copy("042567"));
    expect(writeText).toHaveBeenCalledWith("042567");
    expect(result.current.copied).toBe(true);

    act(() => vi.advanceTimersByTime(1999));
    expect(result.current.copied).toBe(true);
    act(() => vi.advanceTimersByTime(1));
    expect(result.current.copied).toBe(false);
  });

  it("restarts the two seconds on a second copy", async () => {
    const { result } = renderHook(() => useCopyToClipboard());

    await act(async () => result.current.copy("1"));
    act(() => vi.advanceTimersByTime(1500));
    await act(async () => result.current.copy("2"));
    act(() => vi.advanceTimersByTime(1500));
    expect(result.current.copied).toBe(true);
  });

  it("does nothing without a clipboard (plain http)", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: undefined,
      configurable: true,
    });
    const { result } = renderHook(() => useCopyToClipboard());

    await act(async () => result.current.copy("042567"));
    expect(result.current.copied).toBe(false);
  });

  it("does not claim a copy the browser refused", async () => {
    writeText.mockRejectedValue(new Error("denied"));
    const { result } = renderHook(() => useCopyToClipboard());

    await act(async () => result.current.copy("042567"));
    expect(result.current.copied).toBe(false);
  });
});
