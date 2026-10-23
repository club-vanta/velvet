import { describe, expect, it } from "vitest";
import { foldForSearch, matchesWords, searchWords } from "./searchText";

describe("foldForSearch", () => {
  it("drops accents and case", () => {
    expect(foldForSearch("José Núñez")).toBe("jose nunez");
  });

  it("turns styled Mazmo letters into plain ones", () => {
    expect(foldForSearch("𝑩𝑨𝑹𝑴𝑨𝑵")).toBe("barman");
  });

  it("folds small caps and letters with a stroke or ligature", () => {
    expect(foldForSearch("ʙᴀʀᴍᴀɴ")).toBe("barman");
    expect(foldForSearch("Øyvind Łukasz Straße")).toBe("oyvind lukasz strasse");
  });

  it("keeps emoji and symbols", () => {
    expect(foldForSearch("☆ Luna 🌙")).toBe("☆ luna 🌙");
  });
});

describe("searchWords", () => {
  it("splits on any whitespace and folds each word", () => {
    expect(searchWords("  María\tJOSÉ ")).toEqual(["maria", "jose"]);
  });

  it("drops a leading @ from handles", () => {
    expect(searchWords("@cindydark")).toEqual(["cindydark"]);
  });

  it("returns nothing for a blank query or a lone @", () => {
    expect(searchWords("   ")).toEqual([]);
    expect(searchWords("@")).toEqual([]);
  });
});

describe("matchesWords", () => {
  it("needs every word, in any order", () => {
    expect(matchesWords("juan perez juanp", ["perez", "juan"])).toBe(true);
    expect(matchesWords("juan perez juanp", ["perez", "maria"])).toBe(false);
  });
});
