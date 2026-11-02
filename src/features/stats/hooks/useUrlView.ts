import { useSearchParams } from "react-router-dom";

/**
 * A view choice kept in the URL so a shared link opens the same view. The
 * default is left out of the URL, and an unknown value falls back to it.
 */
export function useUrlView<V extends string>(
  param: string,
  views: readonly V[],
  fallback: V,
) {
  const [searchParams, setSearchParams] = useSearchParams();
  const raw = searchParams.get(param);
  const view = views.find((v) => v === raw) ?? fallback;

  function setView(next: V) {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      if (next === fallback) params.delete(param);
      else params.set(param, next);
      return params;
    });
  }

  return [view, setView] as const;
}
