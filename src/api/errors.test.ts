import { beforeEach, describe, expect, it } from "vitest";
import { NetworkError, extractApiError } from "./errors";

describe("extractApiError", () => {
  it("returns a FastAPI detail string as is", () => {
    expect(
      extractApiError({ detail: "Código inválido o expirado." }, "x"),
    ).toBe("Código inválido o expirado.");
  });

  it("joins the messages of a 422 validation error", () => {
    const error = {
      detail: [
        { loc: ["body", "username"], msg: "Field required", type: "missing" },
        { loc: ["body", "code"], msg: "Too short", type: "string_too_short" },
      ],
    };
    expect(extractApiError(error, "x")).toBe("Field required, Too short");
  });

  it("returns the fallback for a 422 error without messages", () => {
    expect(extractApiError({ detail: [] }, "Fallback")).toBe("Fallback");
  });

  it("returns the fallback for an unknown error shape", () => {
    expect(extractApiError({}, "Fallback")).toBe("Fallback");
    expect(extractApiError(undefined, "Fallback")).toBe("Fallback");
  });
});

describe("NetworkError", () => {
  beforeEach(() => localStorage.clear());

  it("speaks the UI language the viewer picked", () => {
    localStorage.setItem("lang", "en");
    expect(new NetworkError().message).toBe(
      "Could not reach the server.\nCheck your connection.",
    );
  });

  it("speaks Spanish by default", () => {
    expect(new NetworkError().message).toBe(
      "No se pudo conectar con el servidor.\nVerificá tu conexión.",
    );
  });

  it("keeps the fetch failure as its cause", () => {
    const cause = new TypeError("Failed to fetch");
    const error = new NetworkError({ cause });
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("NetworkError");
    expect(error.cause).toBe(cause);
  });
});
