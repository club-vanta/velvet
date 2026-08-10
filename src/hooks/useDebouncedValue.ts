import { useEffect, useState } from "react";

/**
 * Returns `value`, delayed by `delayMs` of no further updates. Unlike
 * `useDeferredValue`, this actually defers work (e.g. a network request)
 * rather than just deprioritizing a render.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
