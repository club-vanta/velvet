import { describe, expect, it } from "vitest";
import { translations, type TranslationKey } from "@/lib/i18n";
import { MAZMO_LOOKUP_ERRORS, apiErrorMessage } from "./apiErrorMessage";

const t = (key: TranslationKey) => translations.en[key];

describe("apiErrorMessage", () => {
  it("uses our own copy for the statuses it is given", () => {
    expect(
      apiErrorMessage(
        404,
        { detail: "x" },
        MAZMO_LOOKUP_ERRORS,
        "banFailed",
        t,
      ),
    ).toBe("Mazmo user not found. Check the handle.");
    expect(
      apiErrorMessage(504, undefined, MAZMO_LOOKUP_ERRORS, "banFailed", t),
    ).toBe("Could not connect to Mazmo. Try again.");
  });

  it("shows the backend's detail for any other status", () => {
    expect(
      apiErrorMessage(
        409,
        { detail: "Already linked" },
        MAZMO_LOOKUP_ERRORS,
        "failedLinkMazmo",
        t,
      ),
    ).toBe("Already linked");
  });

  it("joins validation messages from a 422", () => {
    expect(
      apiErrorMessage(
        422,
        {
          detail: [
            { loc: ["body", "reason"], msg: "Too short", type: "value_error" },
            { loc: ["body", "x"], msg: "Required", type: "missing" },
          ],
        },
        {},
        "banFailed",
        t,
      ),
    ).toBe("Too short, Required");
  });

  it("falls back to the given copy when the error has no detail", () => {
    expect(apiErrorMessage(502, "Bad Gateway", {}, "unbanFailed", t)).toBe(
      "Unvant failed",
    );
  });
});
