import { describe, expect, it } from "vitest";
import { unlinkBlockedReason, vantStatus } from "./vantStatus";

describe("vantStatus", () => {
  it("is unknown until the vanted list has loaded, whatever it says", () => {
    expect(vantStatus(false, false)).toBe("unknown");
    expect(vantStatus(false, true)).toBe("unknown");
  });

  it("is vanted or clear once the list has loaded", () => {
    expect(vantStatus(true, true)).toBe("vanted");
    expect(vantStatus(true, false)).toBe("clear");
  });
});

describe("unlinkBlockedReason", () => {
  it("only allows unlinking a guest known not to be vanted", () => {
    expect(unlinkBlockedReason("clear")).toBeNull();
    expect(unlinkBlockedReason("vanted")).toBe("unlinkBlockedVanted");
    expect(unlinkBlockedReason("unknown")).toBe("unlinkBlockedUnknown");
  });
});
