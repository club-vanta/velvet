import { describe, expect, it } from "vitest";
import {
  makeBannedGuest,
  makeGuest,
  makeMazmoProfile,
} from "@/tests/factories";
import {
  DEFAULT_DIRECTORY_FILTERS,
  activeDirectoryFilters,
  viewDirectory,
  viewVanted,
  type DirectoryFilters,
} from "./guestDirectoryView";

const ANA = makeGuest({
  id: "g-ana",
  displayname: "Ana",
  mazmo_handle: null,
  mazmo_user_id: null,
  mazmo_profile: null,
});
const BEA = makeGuest({
  id: "g-bea",
  displayname: "bea",
  mazmo_handle: "zbea",
  mazmo_user_id: 20,
  instagram_username: "bea",
  mazmo_profile: makeMazmoProfile({ pronoun: "FEMALE", mazmo_banned: true }),
});
const NANDU = makeGuest({
  id: "g-nandu",
  displayname: "Ñandú",
  mazmo_handle: "nandu",
  mazmo_user_id: 10,
  mazmo_profile: makeMazmoProfile({ pronoun: "MALE", mazmo_deleted: true }),
});
const NICO = makeGuest({
  id: "g-nico",
  displayname: "☆ Nico ☆",
  mazmo_handle: "nico",
  mazmo_user_id: 10,
  instagram_username: "nico",
  mazmo_profile: makeMazmoProfile({ pronoun: null, mazmo_suspended: true }),
});
const ALL = [NANDU, NICO, BEA, ANA];
const NONE = new Set<string>();

const names = (guests: { displayname: string }[]) =>
  guests.map((g) => g.displayname);

function view(filters: Partial<DirectoryFilters>, vanted = NONE) {
  return names(
    viewDirectory(
      ALL,
      { ...DEFAULT_DIRECTORY_FILTERS, ...filters },
      { key: "name", dir: "asc" },
      vanted,
    ),
  );
}

describe("viewDirectory", () => {
  it("sorts by name with Spanish collation, ignoring case and decoration", () => {
    expect(view({})).toEqual(["Ana", "bea", "☆ Nico ☆", "Ñandú"]);
  });

  it("does not change the list it is given", () => {
    const before = [...ALL];
    view({ mazmo: "linked" });
    expect(ALL).toEqual(before);
  });

  it.each<[Partial<DirectoryFilters>, string[]]>([
    [{ mazmo: "linked" }, ["bea", "☆ Nico ☆", "Ñandú"]],
    [{ mazmo: "unlinked" }, ["Ana"]],
    [{ instagram: "with" }, ["bea", "☆ Nico ☆"]],
    [{ instagram: "without" }, ["Ana", "Ñandú"]],
    [{ pronoun: "FEMALE" }, ["bea"]],
    [{ pronoun: "NEUTRAL" }, []],
    [{ mazmoFlaggedOnly: true }, ["bea", "☆ Nico ☆"]],
    [{ mazmo: "linked", instagram: "without" }, ["Ñandú"]],
  ])("filters %o", (filters, expected) => {
    expect(view(filters)).toEqual(expected);
  });

  it("keeps only vanted guests when asked, using the org's vanted ids", () => {
    expect(view({ vantedOnly: true }, new Set(["g-ana", "g-nico"]))).toEqual([
      "Ana",
      "☆ Nico ☆",
    ]);
  });

  it("sorts names Z to A", () => {
    expect(
      names(
        viewDirectory(
          ALL,
          DEFAULT_DIRECTORY_FILTERS,
          { key: "name", dir: "desc" },
          NONE,
        ),
      ),
    ).toEqual(["Ñandú", "☆ Nico ☆", "bea", "Ana"]);
  });

  it.each([
    ["asc", ["☆ Nico ☆", "Ñandú", "bea", "Ana"]],
    ["desc", ["bea", "☆ Nico ☆", "Ñandú", "Ana"]],
  ] as const)(
    "sorts by Mazmo ID %s, ties by name and missing ids last",
    (dir, expected) => {
      expect(
        names(
          viewDirectory(
            ALL,
            DEFAULT_DIRECTORY_FILTERS,
            { key: "mazmoId", dir },
            NONE,
          ),
        ),
      ).toEqual(expected);
    },
  );

  it("sorts by handle and by Instagram with the missing ones last", () => {
    const by = (key: "handle" | "instagram") =>
      names(
        viewDirectory(
          ALL,
          DEFAULT_DIRECTORY_FILTERS,
          { key, dir: "asc" },
          NONE,
        ),
      );
    expect(by("handle")).toEqual(["Ñandú", "☆ Nico ☆", "bea", "Ana"]);
    expect(by("instagram")).toEqual(["bea", "☆ Nico ☆", "Ana", "Ñandú"]);
  });
});

describe("activeDirectoryFilters", () => {
  it("lists only the filters that differ from the defaults", () => {
    expect(activeDirectoryFilters(DEFAULT_DIRECTORY_FILTERS)).toEqual([]);
    expect(
      activeDirectoryFilters({
        ...DEFAULT_DIRECTORY_FILTERS,
        instagram: "with",
        vantedOnly: true,
      }),
    ).toEqual(["instagram", "vantedOnly"]);
  });
});

describe("viewVanted", () => {
  const ZOE = makeBannedGuest({
    id: "b-zoe",
    displayname: "Zoe",
    mazmo_handle: "a_zoe",
    banned_at: "2026-09-01T03:00:00Z",
    banned_reason: "Photos without consent",
  });
  const ANA_V = makeBannedGuest({
    id: "b-ana",
    displayname: "Ana",
    mazmo_handle: null,
    banned_at: "2026-10-05T03:00:00Z",
    banned_reason: "Aggressive at the door",
  });
  const LIST = [ZOE, ANA_V];

  it("sorts by name by default and leaves the input alone", () => {
    expect(names(viewVanted(LIST, { key: "name", dir: "asc" }))).toEqual([
      "Ana",
      "Zoe",
    ]);
    expect(LIST).toEqual([ZOE, ANA_V]);
  });

  it.each([
    ["bannedAt", "desc", ["Ana", "Zoe"]],
    ["bannedAt", "asc", ["Zoe", "Ana"]],
    ["reason", "asc", ["Ana", "Zoe"]],
    ["handle", "asc", ["Zoe", "Ana"]],
  ] as const)("sorts by %s %s", (key, dir, expected) => {
    expect(names(viewVanted(LIST, { key, dir }))).toEqual(expected);
  });
});
