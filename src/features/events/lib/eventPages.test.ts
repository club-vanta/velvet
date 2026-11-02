import { describe, expect, it } from "vitest";
import { makeEventLog } from "@/tests/factories";
import { mergeEventPages } from "./eventPages";

const ids = (events: { id: number }[]) => events.map((e) => e.id);

describe("mergeEventPages", () => {
  it("joins the pages in order", () => {
    const pages = [
      { events: [makeEventLog({ id: 4 }), makeEventLog({ id: 3 })] },
      { events: [makeEventLog({ id: 2 }), makeEventLog({ id: 1 })] },
    ];
    expect(ids(mergeEventPages(pages))).toEqual([4, 3, 2, 1]);
  });

  it("keeps each event once when new events shifted the next page", () => {
    const pages = [
      { events: [makeEventLog({ id: 4 }), makeEventLog({ id: 3 })] },
      // Two events were logged after the first page loaded.
      { events: [makeEventLog({ id: 4 }), makeEventLog({ id: 3 })] },
      { events: [makeEventLog({ id: 2 }), makeEventLog({ id: 1 })] },
    ];
    expect(ids(mergeEventPages(pages))).toEqual([4, 3, 2, 1]);
  });

  it("is empty without pages", () => {
    expect(mergeEventPages([])).toEqual([]);
  });
});
