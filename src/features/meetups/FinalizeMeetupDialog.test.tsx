import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import { meetupGuestsKey } from "@/lib/queryKeys";
import { LanguageProvider } from "@/lib/i18n";
import { FinalizeMeetupDialog } from "./FinalizeMeetupDialog";
import type { components } from "@/api/types";
import { makeMeetup } from "@/tests/fixtures";

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
  return makeMeetup({
    is_finalized: isFinalized,
    finalized_at: isFinalized ? "2026-10-02T03:00:00Z" : null,
  });
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

  it("refreshes nothing when the request fails", async () => {
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
    expect(invalidate).not.toHaveBeenCalled();
  });

  it("refreshes the meetup's guest list, where pending RSVPs become no-shows", async () => {
    let status = "PENDING";
    mockApiPatch.mockImplementation(() => {
      status = "NO_SHOW";
      return Promise.resolve({ data: { ...meetup(true) }, error: undefined });
    });
    function GuestStatus() {
      const { data } = useQuery({
        queryKey: meetupGuestsKey("org-1", "meetup-1"),
        queryFn: () => Promise.resolve(status),
        // Only an invalidation may refetch it.
        staleTime: Infinity,
      });
      return <p data-testid="guest-status">{data}</p>;
    }
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <GuestStatus />
          <FinalizeMeetupDialog
            orgId="org-1"
            meetup={meetup(false)}
            onClose={vi.fn()}
          />
        </LanguageProvider>
      </QueryClientProvider>,
    );
    await waitFor(() =>
      expect(screen.getByTestId("guest-status")).toHaveTextContent("PENDING"),
    );

    await userEvent.click(
      screen.getByRole("button", { name: "Finalizar evento" }),
    );

    await waitFor(() =>
      expect(screen.getByTestId("guest-status")).toHaveTextContent("NO_SHOW"),
    );
  });
});
