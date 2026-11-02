import { describe, expect, it } from "vitest";
import { editGuestBody } from "./editGuestBody";

const GUEST = { displayname: "Luna", instagram_username: "luna.ig" };

describe("editGuestBody", () => {
  it("sends nothing when nothing changed", () => {
    expect(
      editGuestBody(GUEST, { displayname: " Luna ", instagram: "luna.ig " }),
    ).toEqual({});
  });

  it("sends only a changed name, trimmed", () => {
    expect(
      editGuestBody(GUEST, {
        displayname: " Luna Roja ",
        instagram: "luna.ig",
      }),
    ).toEqual({ displayname: "Luna Roja" });
  });

  it("never sends a blank name", () => {
    expect(
      editGuestBody(GUEST, { displayname: "   ", instagram: "luna.ig" }),
    ).toEqual({});
  });

  it("sends an explicit null when the Instagram handle is cleared", () => {
    expect(
      editGuestBody(GUEST, { displayname: "Luna", instagram: "  " }),
    ).toEqual({ instagram_username: null });
  });

  it("sends a new Instagram handle, trimmed, also when there was none", () => {
    expect(
      editGuestBody(
        { displayname: "Luna", instagram_username: null },
        { displayname: "Luna", instagram: " luna.roja " },
      ),
    ).toEqual({ instagram_username: "luna.roja" });
  });

  it("leaves a missing Instagram handle alone when it stays empty", () => {
    expect(
      editGuestBody(
        { displayname: "Luna", instagram_username: null },
        { displayname: "Luna", instagram: "" },
      ),
    ).toEqual({});
  });
});
