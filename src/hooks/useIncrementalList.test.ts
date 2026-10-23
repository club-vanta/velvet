import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useIncrementalList } from "./useIncrementalList";

const range = (n: number) => Array.from({ length: n }, (_, i) => i);

describe("useIncrementalList", () => {
  it("shows one page, then the next on showMore", () => {
    const items = range(25);
    const { result } = renderHook(() => useIncrementalList(items, 10));
    expect(result.current.visible).toHaveLength(10);
    expect(result.current.nextCount).toBe(10);

    act(() => result.current.showMore());
    expect(result.current.visible).toHaveLength(20);
    expect(result.current.nextCount).toBe(5);

    act(() => result.current.showMore());
    expect(result.current.visible).toHaveLength(25);
    expect(result.current.nextCount).toBe(0);
  });

  it("starts again from the first page when the list changes", () => {
    const { result, rerender } = renderHook(
      ({ items }) => useIncrementalList(items, 10),
      { initialProps: { items: range(25) } },
    );
    act(() => result.current.showMore());
    expect(result.current.visible).toHaveLength(20);

    rerender({ items: range(30) });
    expect(result.current.visible).toHaveLength(10);
  });

  it("keeps the page when re-rendered with the same list", () => {
    const items = range(25);
    const { result, rerender } = renderHook(() =>
      useIncrementalList(items, 10),
    );
    act(() => result.current.showMore());
    rerender();
    expect(result.current.visible).toHaveLength(20);
  });

  it("passes undefined through while loading", () => {
    const { result } = renderHook(() => useIncrementalList(undefined, 10));
    expect(result.current.visible).toBeUndefined();
    expect(result.current.nextCount).toBe(0);
  });
});
