import { beforeEach, describe, expect, it, vi } from "vitest";
import { api, setAuthToken } from "./client";
import { NetworkError } from "./errors";

const offline = () => Promise.reject(new TypeError("Failed to fetch"));
const status = (code: number) => () =>
  Promise.resolve(
    new Response(JSON.stringify({ detail: "x" }), { status: code }),
  );

describe("api client", () => {
  beforeEach(() => {
    localStorage.clear();
    setAuthToken(null);
  });

  it("turns a failed fetch into a NetworkError in the UI language", async () => {
    localStorage.setItem("lang", "en");
    const request = api.GET("/auth/userinfo", { fetch: offline });
    await expect(request).rejects.toBeInstanceOf(NetworkError);
    await expect(request).rejects.toThrow(
      "Could not reach the server.\nCheck your connection.",
    );
  });

  it("rethrows errors that are not network failures", async () => {
    const aborted = new DOMException("Aborted", "AbortError");
    const fetch = vi.fn(() => Promise.reject(aborted));
    await expect(api.GET("/auth/userinfo", { fetch })).rejects.toBe(aborted);
  });

  it("signs out when an authenticated request gets a 401", async () => {
    setAuthToken("expired");
    await api.GET("/auth/userinfo", { fetch: status(401) });
    expect(localStorage.getItem("auth_token")).toBeNull();
  });

  it("keeps the token on a 401 from the login endpoint", async () => {
    setAuthToken("current");
    await api.POST("/auth/token", {
      fetch: status(401),
      body: { username: "door", password: "wrong", scope: "" },
    });
    expect(localStorage.getItem("auth_token")).toBe("current");
  });

  it("keeps the token on other errors", async () => {
    setAuthToken("current");
    await api.GET("/auth/userinfo", { fetch: status(403) });
    expect(localStorage.getItem("auth_token")).toBe("current");
  });
});
