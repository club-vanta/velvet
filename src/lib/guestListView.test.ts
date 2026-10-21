import { describe, expect, it } from "vitest";
import {
  DEFAULT_GUEST_FILTERS,
  DEFAULT_GUEST_SORT,
  activeGuestFilters,
  viewGuestList,
} from "./guestListView";
import type { components } from "@/api/types";

type MeetupGuest = components["schemas"]["MeetupGuestPublic"];

function mg(
  n: number,
  name: string,
  rsvp: Partial<MeetupGuest["rsvp"]> = {},
): MeetupGuest {
  return {
    guest: {
      id: `id-${n}`,
      mazmo_user_id: n,
      mazmo_handle: null,
      displayname: name,
      instagram_username: null,
      is_banned: false,
      mazmo_profile: null,
    },
    rsvp: {
      rsvp_time: `2026-08-0${n}T12:00:00Z`,
      cancelled_rsvp: false,
      has_arrived: false,
      arrival_time: null,
      arrival_order: null,
      is_walkin: false,
      has_paid: false,
      paid_at: null,
      guest_type: "NORMAL",
      ...rsvp,
    },
  };
}

const names = (list: MeetupGuest[]) => list.map((g) => g.guest.displayname);

describe("viewGuestList", () => {
  it("sorts by name ignoring case and accents by default", () => {
    const list = [mg(1, "Óscar"), mg(2, "ana"), mg(3, "Bruno")];
    expect(
      names(
        viewGuestList(list, DEFAULT_GUEST_FILTERS, DEFAULT_GUEST_SORT, false),
      ),
    ).toEqual(["ana", "Bruno", "Óscar"]);
  });

  it("files decorated Mazmo names under their first letter", () => {
    const list = [
      mg(1, "☆ selene ☆"),
      mg(2, "𝑩𝑨𝑹𝑴𝑨𝑵 🍷"),
      mg(3, "Carla"),
      mg(4, "✨"),
    ];
    expect(
      names(
        viewGuestList(list, DEFAULT_GUEST_FILTERS, DEFAULT_GUEST_SORT, false),
      ),
    ).toEqual(["✨", "𝑩𝑨𝑹𝑴𝑨𝑵 🍷", "Carla", "☆ selene ☆"]);
  });

  it("keeps guests without an arrival order last in both directions", () => {
    const list = [
      mg(1, "Zoe"),
      mg(2, "Late", { has_arrived: true, arrival_order: 2 }),
      mg(3, "Early", { has_arrived: true, arrival_order: 1 }),
      mg(4, "Ana"),
    ];
    const asc = { key: "arrival", dir: "asc" } as const;
    const desc = { key: "arrival", dir: "desc" } as const;
    expect(
      names(viewGuestList(list, DEFAULT_GUEST_FILTERS, asc, false)),
    ).toEqual(["Early", "Late", "Ana", "Zoe"]);
    expect(
      names(viewGuestList(list, DEFAULT_GUEST_FILTERS, desc, false)),
    ).toEqual(["Late", "Early", "Ana", "Zoe"]);
  });

  it("treats exempt guests as not owing payment", () => {
    const list = [
      mg(1, "Owes"),
      mg(2, "Paid", { has_paid: true }),
      mg(3, "Staff", { guest_type: "STAFF" }),
    ];
    const f = (payment: "unpaid" | "exempt" | "paid") =>
      names(
        viewGuestList(
          list,
          { ...DEFAULT_GUEST_FILTERS, payment },
          DEFAULT_GUEST_SORT,
          true,
        ),
      );
    expect(f("unpaid")).toEqual(["Owes"]);
    expect(f("exempt")).toEqual(["Staff"]);
    expect(f("paid")).toEqual(["Paid"]);
  });

  it("ignores the payment filter on a free meetup", () => {
    const filters = { ...DEFAULT_GUEST_FILTERS, payment: "unpaid" as const };
    const list = [mg(1, "A", { has_paid: true }), mg(2, "B")];
    expect(
      viewGuestList(list, filters, DEFAULT_GUEST_SORT, false),
    ).toHaveLength(2);
    expect(activeGuestFilters(filters, false)).toEqual([]);
    expect(activeGuestFilters(filters, true)).toEqual(["payment"]);
  });

  it("combines filters", () => {
    const list = [
      mg(1, "Walkin in", { is_walkin: true, has_arrived: true }),
      mg(2, "Walkin out", { is_walkin: true }),
      mg(3, "Cancelled", { cancelled_rsvp: true }),
    ];
    const filters = {
      ...DEFAULT_GUEST_FILTERS,
      walkinOnly: true,
      status: "pending" as const,
    };
    expect(
      names(viewGuestList(list, filters, DEFAULT_GUEST_SORT, false)),
    ).toEqual(["Walkin out"]);
    expect(
      names(
        viewGuestList(
          list,
          { ...DEFAULT_GUEST_FILTERS, rsvp: "active" },
          DEFAULT_GUEST_SORT,
          false,
        ),
      ),
    ).toEqual(["Walkin in", "Walkin out"]);
  });
});
