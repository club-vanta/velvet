import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useIncrementalList } from "./useIncrementalList";

const range = (n: number) => Array.from({ length: n }, (_, i) => i);

describe("useIncrementalList", () => {
  it("shows one page, then the next on showMore", () => {
    const items = range(25);
    const { result } = renderHook(() => useIncrementalList(items, "", 10));
    expect(result.current.visible).toHaveLength(10);
    expect(result.current.nextCount).toBe(10);

    act(() => result.current.showMore());
    expect(result.current.visible).toHaveLength(20);
    expect(result.current.nextCount).toBe(5);

    act(() => result.current.showMore());
    expect(result.current.visible).toHaveLength(25);
    expect(result.current.nextCount).toBe(0);
  });

  it("starts again from the first page when the reset key changes", () => {
    const { result, rerender } = renderHook(
      ({ resetKey }) => useIncrementalList(range(25), resetKey, 10),
      { initialProps: { resetKey: "" } },
    );
    act(() => result.current.showMore());
    expect(result.current.visible).toHaveLength(20);

    rerender({ resetKey: "maria" });
    expect(result.current.visible).toHaveLength(10);
  });

  it("keeps the pages shown when the list is refetched under the same key", () => {
    const { result, rerender } = renderHook(
      ({ items }) => useIncrementalList(items, "", 10),
      { initialProps: { items: range(25) } },
    );
    act(() => result.current.showMore());

    // A new array, as after editing one guest and refetching.
    rerender({ items: range(25) });
    expect(result.current.visible).toHaveLength(20);
  });

  it("passes undefined through while loading", () => {
    const { result } = renderHook(() => useIncrementalList(undefined, "", 10));
    expect(result.current.visible).toBeUndefined();
    expect(result.current.nextCount).toBe(0);
  });
});
