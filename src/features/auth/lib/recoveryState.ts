/**
 * What the forgot-password page hands the reset page in the router state
 * once the recovery code checks out. It is not in the URL, so a reload or a
 * direct visit to /reset-password has none and goes back to login.
 */
export type RecoveryState = { username: string; code: string };

export function isRecoveryState(value: unknown): value is RecoveryState {
  if (typeof value !== "object" || value === null) return false;
  const { username, code } = value as Partial<Record<string, unknown>>;
  return (
    typeof username === "string" &&
    username !== "" &&
    typeof code === "string" &&
    code !== ""
  );
}
