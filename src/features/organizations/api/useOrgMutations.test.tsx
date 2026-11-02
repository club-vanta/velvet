import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { LanguageProvider } from "@/lib/i18n";
import { makeOrgMember } from "@/tests/factories";
import { useUpdateMemberRole } from "./useOrgMutations";

const mockApiPatch = vi.fn();
vi.mock("@/api/client", () => ({
  api: { PATCH: (...a: unknown[]) => mockApiPatch(...a) },
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

function setup() {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <LanguageProvider>{children}</LanguageProvider>
    </QueryClientProvider>
  );
  return renderHook(() => useUpdateMemberRole("org-1"), { wrapper });
}

describe("useUpdateMemberRole", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem("lang", "en");
  });

  // A proxy or gateway error has no FastAPI detail to show.
  it("reports a failure, not success, when the error has no detail", async () => {
    mockApiPatch.mockResolvedValue({ data: undefined, error: "Bad Gateway" });
    const { result } = setup();

    await act(async () => {
      await result.current
        .mutateAsync({ member: makeOrgMember(), role: "ADMIN" })
        .catch(() => {});
    });

    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith("Failed to update role");
  });
});
