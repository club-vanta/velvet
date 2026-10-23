import { describe, expect, it } from "vitest";
import { compareOptional, nameComparer } from "./sortNames";

const sorted = (names: string[]) => [...names].sort(nameComparer());

describe("nameComparer", () => {
  it("files styled letters and small caps under their plain letter", () => {
    expect(sorted(["Carla", "ʙᴀʀᴍᴀɴ", "𝑨𝒍𝒂𝒏", "Diego"])).toEqual([
      "𝑨𝒍𝒂𝒏",
      "ʙᴀʀᴍᴀɴ",
      "Carla",
      "Diego",
    ]);
  });

  it("skips leading decoration and ignores accents and case", () => {
    expect(sorted(["☆ selene ☆", "Ángel", "zoe", "María"])).toEqual([
      "Ángel",
      "María",
      "☆ selene ☆",
      "zoe",
    ]);
  });

  it("files Ñ after N, by Spanish rules on any device", () => {
    expect(sorted(["Oscar", "Ñandú", "Nicolás"])).toEqual([
      "Nicolás",
      "Ñandú",
      "Oscar",
    ]);
  });

  it("orders numbers by value", () => {
    expect(sorted(["Guest 10", "Guest 2", "Guest 1"])).toEqual([
      "Guest 1",
      "Guest 2",
      "Guest 10",
    ]);
  });

  it("puts names with no letters or digits first, as before", () => {
    expect(sorted(["Carla", "✨"])).toEqual(["✨", "Carla"]);
  });
});

describe("compareOptional", () => {
  it("sorts missing values last in either direction", () => {
    const values = ["b", null, "a"];
    expect(
      [...values].sort((x, y) => compareOptional(x, y, "asc", nameComparer())),
    ).toEqual(["a", "b", null]);
    expect(
      [...values].sort((x, y) => compareOptional(x, y, "desc", nameComparer())),
    ).toEqual(["b", "a", null]);
  });
});
