import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LanguageProvider } from "@/lib/i18n";
import { FinalizeMeetupDialog } from "./FinalizeMeetupDialog";
import type { components } from "@/api/types";

const mockApiGet = vi.fn();
const mockApiPatch = vi.fn();
vi.mock("@/api/client", () => ({
  api: {
    GET: (...a: unknown[]) => mockApiGet(...a),
    PATCH: (...a: unknown[]) => mockApiPatch(...a),
  },
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

type Meetup = components["schemas"]["MeetupPublic"];

function meetup(isFinalized: boolean): Meetup {
  return {
    id: "meetup-1",
    name: "Alter Night",
    mazmo_meetup_url: "https://mazmo.net/+eventos/meetup-1",
    date: "2026-10-01T22:00:00Z",
    is_finalized: isFinalized,
    finalized_at: isFinalized ? "2026-10-02T03:00:00Z" : null,
    requires_payment: false,
  };
}

function renderDialog(m: Meetup) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const invalidate = vi.spyOn(queryClient, "invalidateQueries");
  const onClose = vi.fn();
  render(
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <FinalizeMeetupDialog orgId="org-1" meetup={m} onClose={onClose} />
      </LanguageProvider>
    </QueryClientProvider>,
  );
  return { invalidate, onClose };
}

describe("FinalizeMeetupDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiGet.mockResolvedValue({ data: undefined, error: undefined });
    mockApiPatch.mockResolvedValue({
      data: { ...meetup(true) },
      error: undefined,
    });
  });

  it("refreshes the org stats when finalizing a meetup", async () => {
    const { invalidate, onClose } = renderDialog(meetup(false));

    await userEvent.click(
      screen.getByRole("button", { name: "Finalizar evento" }),
    );

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["stats", "org-1"] });
  });

  it("refreshes the org stats when reopening a meetup", async () => {
    const { invalidate, onClose } = renderDialog(meetup(true));

    await userEvent.click(
      screen.getByRole("button", { name: "Reabrir evento" }),
    );

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["stats", "org-1"] });
  });

  it("does not refresh the org stats when the request fails", async () => {
    mockApiPatch.mockResolvedValue({
      data: undefined,
      error: { detail: "nope" },
    });
    const { invalidate, onClose } = renderDialog(meetup(false));

    await userEvent.click(
      screen.getByRole("button", { name: "Finalizar evento" }),
    );

    await waitFor(() => expect(mockApiPatch).toHaveBeenCalledTimes(1));
    expect(onClose).not.toHaveBeenCalled();
    expect(invalidate).not.toHaveBeenCalledWith({
      queryKey: ["stats", "org-1"],
    });
  });
});
