/**
 * A tooltip `labelFormatter` for per-event charts: the hovered event's name
 * instead of the day on the axis.
 */
export function eventNameLabel(
  _label: unknown,
  payload: readonly { payload?: { name?: string } }[],
): string | undefined {
  return payload[0]?.payload?.name;
}
