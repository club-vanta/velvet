const ZONE_SUFFIX = /(?:[zZ]|[+-]\d{2}:\d{2})$/;

/**
 * Parses an API datetime. A string without a zone suffix is UTC, so it gets
 * a "Z" instead of being read as browser local time by `new Date`.
 */
export function parseApiDateTime(iso: string): Date {
  return new Date(ZONE_SUFFIX.test(iso) ? iso : `${iso}Z`);
}
