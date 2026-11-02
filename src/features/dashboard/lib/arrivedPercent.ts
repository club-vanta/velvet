/** Share of RSVPs that checked in, as a whole percentage (0 with no RSVPs). */
export function arrivedPercent(arrived: number, rsvps: number): number {
  return rsvps > 0 ? Math.round((arrived / rsvps) * 100) : 0;
}
