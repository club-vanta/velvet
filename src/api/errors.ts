type PydanticErrorDetail = {
  loc: (string | number)[];
  msg: string;
  type: string;
};

/**
 * Error shape for HTTP 422 responses. Returned when the request body fails
 * validation — e.g. a required field is missing or a URL has the wrong format.
 * Contains one entry per invalid field, each with a human-readable message in `msg`.
 *
 * @example
 * // POST /meetups/ with an invalid mazmo_meetup_url
 * {
 *   "detail": [
 *     {
 *       "loc": ["body", "mazmo_meetup_url"],
 *       "msg": "URL must match pattern: https://mazmo.net/{community}/{thread-slug}",
 *       "type": "value_error"
 *     }
 *   ]
 * }
 */
type PydanticError = {
  detail: PydanticErrorDetail[];
};

/**
 * Error shape for non-422 error responses (e.g. 404, 409, 502).
 * `detail` is a plain string describing what went wrong.
 *
 * @example
 * // POST /meetups/ with a URL that already exists
 * {
 *   "detail": "Cannot create meetup: a meetup with this Mazmo URL already exists. Existing meetup: id=..., name='...', date=..."
 * }
 */
type FastAPIError = {
  detail: string;
};

/**
 * Returns true if the error is a Pydantic 422 validation error.
 *
 * FastAPI automatically catches Pydantic's ValidationError and serializes it
 * as an array of error objects, one per failed field. We check that `detail`
 * is an array and that every item has `msg` and `type` as strings — the two
 * fields we actually use — to avoid false positives from other array-shaped
 * responses that aren't Pydantic errors.
 */
function isPydanticError(error: unknown): error is PydanticError {
  return (
    Array.isArray((error as PydanticError)?.detail) &&
    (error as PydanticError).detail.every(
      (d) => typeof d.msg === "string" && typeof d.type === "string",
    )
  );
}

/**
 * Returns true if the error is a manually raised FastAPI HTTPException.
 *
 * When a route raises HTTPException(detail="..."), FastAPI serializes it as
 * { detail: string }. Checking that `detail` is a string is enough to
 * distinguish it from the Pydantic case, where `detail` is always an array.
 */
function isFastAPIError(error: unknown): error is FastAPIError {
  return typeof (error as FastAPIError)?.detail === "string";
}

/**
 * Extracts a human-readable message from a FastAPI error response.
 *
 * FastAPI returns two shapes depending on the error:
 *   - FastAPIError (manual HTTPException): { detail: "some message" }
 *   - PydanticError (422 validation):      { detail: [{ loc, msg, type }, ...] }
 *
 * @param error - The error object returned by openapi-fetch.
 * @param fallbackErrorMessage - Returned when the error doesn't match either known
 *   shape (e.g. a non-JSON response from a proxy or gateway), or when a PydanticError
 *   has no extractable messages. Should describe the operation that failed, e.g.
 *   "Failed to create meetup".
 */
export function extractApiError(
  error: unknown,
  fallbackErrorMessage: string,
): string {
  if (isFastAPIError(error)) return error.detail;

  if (isPydanticError(error)) {
    // juntamos todos los validation messages en una sola variable
    const validationMessages: string[] = error.detail
      .map((fieldError) => fieldError.msg)
      .filter((msg): msg is string => Boolean(msg));

    // Si llegara a no haber validation messages, devolvemos el fallback
    if (validationMessages.length === 0) return fallbackErrorMessage;

    // y despues retornamos todos los errores juntitos en un mismo string
    return validationMessages.join(", ");
  }

  // Y si el error, POR ALGUNA RAZON, no tiene ningun formato conocido, devolvemos el fallback
  return fallbackErrorMessage;
}
