import { describe, expect, it } from "vitest";
import { isRecoveryState } from "./recoveryState";

describe("isRecoveryState", () => {
  it("accepts a username and a code", () => {
    expect(isRecoveryState({ username: "alice", code: "123456" })).toBe(true);
  });

  it("rejects a missing state (reload or direct visit)", () => {
    expect(isRecoveryState(null)).toBe(false);
    expect(isRecoveryState(undefined)).toBe(false);
  });

  it("rejects a state without a username", () => {
    expect(isRecoveryState({ code: "123456" })).toBe(false);
    expect(isRecoveryState({ username: "", code: "123456" })).toBe(false);
  });

  it("rejects a state without a code", () => {
    expect(isRecoveryState({ username: "alice" })).toBe(false);
    expect(isRecoveryState({ username: "alice", code: 123456 })).toBe(false);
  });
});
