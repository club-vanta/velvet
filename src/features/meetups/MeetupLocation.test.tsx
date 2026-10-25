import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { toast } from "sonner";
import { LanguageProvider } from "@/lib/i18n";
import { makeMeetup } from "@/tests/fixtures";
import { MeetupLocation } from "./MeetupLocation";

const mockApiGet = vi.fn();
const mockApiPatch = vi.fn();
vi.mock("@/api/client", () => ({
  api: {
    GET: (...a: unknown[]) => mockApiGet(...a),
    PATCH: (...a: unknown[]) => mockApiPatch(...a),
  },
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const CORRIENTES = {
  label: "Av. Corrientes 1234, Buenos Aires",
  latitude: -34.6037,
  longitude: -58.3816,
};
const CALLAO = {
  label: "Av. Callao 500, Buenos Aires",
  latitude: -34.605,
  longitude: -58.392,
};
const LOCATED = makeMeetup({
  location_label: "Teatro Vanta, Buenos Aires",
  latitude: -34.6,
  longitude: -58.4,
});

function renderLocation(meetup = makeMeetup(), canEdit = true) {
  return render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <LanguageProvider>
        <MeetupLocation orgId="org-1" meetup={meetup} canEdit={canEdit} />
      </LanguageProvider>
    </QueryClientProvider>,
  );
}

const searchBox = () =>
  screen.getByRole("combobox", { name: "Search an address" });
const geocodeCalls = () =>
  mockApiGet.mock.calls.filter(
    (c) => c[0] === "/organizations/{org_id}/geocode",
  );

describe("MeetupLocation", () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem("lang", "en");
    vi.useFakeTimers({ shouldAdvanceTime: true });
    user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    mockApiGet.mockResolvedValue({
      data: [CORRIENTES, CALLAO],
      error: undefined,
    });
    mockApiPatch.mockResolvedValue({ data: LOCATED, error: undefined });
  });
  afterEach(() => vi.useRealTimers());

  async function type(text: string) {
    await user.type(searchBox(), text);
    await act(() => vi.advanceTimersByTimeAsync(300));
  }

  it("shows the label and a map link, with no edit control, to a member", () => {
    renderLocation(LOCATED, false);
    expect(screen.getByText("Teatro Vanta, Buenos Aires")).toBeInTheDocument();
    const link = screen.getByRole("link", {
      name: "Open in map: Teatro Vanta, Buenos Aires",
    });
    expect(link).toHaveAttribute(
      "href",
      "https://www.openstreetmap.org/?mlat=-34.6&mlon=-58.4#map=17/-34.6/-58.4",
    );
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noreferrer");
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Remove location" }),
    ).not.toBeInTheDocument();
  });

  it("says there is no location to a member when none is set", () => {
    renderLocation(makeMeetup(), false);
    expect(screen.getByText("No location yet")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("makes one request after a 300 ms pause in typing", async () => {
    renderLocation();
    await user.type(searchBox(), "Av. Corrientes");
    expect(geocodeCalls()).toHaveLength(0);
    await act(() => vi.advanceTimersByTimeAsync(300));
    await screen.findByRole("listbox");
    expect(geocodeCalls()).toHaveLength(1);
    expect(geocodeCalls()[0][1]).toEqual({
      params: { path: { org_id: "org-1" }, query: { q: "Av. Corrientes" } },
      signal: expect.any(AbortSignal),
    });
  });

  it("does not search or show a list below 3 characters", async () => {
    renderLocation();
    await type("Av");
    expect(geocodeCalls()).toHaveLength(0);
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("hides the previous results when the input shrinks under 3 characters", async () => {
    renderLocation();
    await type("Corr");
    await screen.findByRole("listbox");
    await user.clear(searchBox());
    await user.type(searchBox(), "Co");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("never shows a late response for an old query", async () => {
    let resolveOld: (v: unknown) => void = () => {};
    mockApiGet.mockImplementation(
      (_p: string, opts: { params: { query: { q: string } } }) =>
        opts.params.query.q === "Corrientes"
          ? new Promise((r) => (resolveOld = r))
          : Promise.resolve({ data: [CALLAO], error: undefined }),
    );
    renderLocation();
    await type("Corrientes");
    await user.type(searchBox(), "x");
    await act(() => vi.advanceTimersByTimeAsync(300));
    await screen.findByRole("option", { name: CALLAO.label });
    await act(async () => {
      resolveOld({ data: [CORRIENTES], error: undefined });
    });
    expect(
      screen.queryByRole("option", { name: CORRIENTES.label }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("option", { name: CALLAO.label })).toBeVisible();
  });

  it("picks a result with arrow keys and Enter and saves its exact values", async () => {
    renderLocation();
    await type("Av.");
    await screen.findByRole("listbox");
    await user.keyboard("{ArrowDown}{ArrowDown}");
    expect(searchBox()).toHaveAttribute(
      "aria-activedescendant",
      screen.getByRole("option", { name: CALLAO.label }).id,
    );
    expect(screen.getByRole("option", { name: CALLAO.label })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await user.keyboard("{Enter}");
    await waitFor(() =>
      expect(mockApiPatch).toHaveBeenCalledWith(
        "/organizations/{org_id}/meetups/{meetup_id}/location",
        {
          params: { path: { org_id: "org-1", meetup_id: "meetup-1" } },
          body: {
            location_label: CALLAO.label,
            latitude: CALLAO.latitude,
            longitude: CALLAO.longitude,
          },
        },
      ),
    );
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Location saved"),
    );
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("wraps the active option and closes the list on Escape", async () => {
    renderLocation();
    await type("Av.");
    await screen.findByRole("listbox");
    await user.keyboard("{ArrowUp}");
    expect(searchBox()).toHaveAttribute(
      "aria-activedescendant",
      screen.getByRole("option", { name: CALLAO.label }).id,
    );
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(searchBox()).toHaveAttribute("aria-expanded", "false");
    expect(mockApiPatch).not.toHaveBeenCalled();
  });

  it("saves a result picked with the mouse", async () => {
    renderLocation();
    await type("Av.");
    await user.click(
      await screen.findByRole("option", { name: CORRIENTES.label }),
    );
    await waitFor(() => expect(mockApiPatch).toHaveBeenCalledTimes(1));
    expect(mockApiPatch.mock.calls[0][1].body).toEqual({
      location_label: CORRIENTES.label,
      latitude: CORRIENTES.latitude,
      longitude: CORRIENTES.longitude,
    });
  });

  it("sends nulls from Remove location", async () => {
    renderLocation(LOCATED);
    await user.click(screen.getByRole("button", { name: "Remove location" }));
    await waitFor(() =>
      expect(mockApiPatch).toHaveBeenCalledWith(
        "/organizations/{org_id}/meetups/{meetup_id}/location",
        {
          params: { path: { org_id: "org-1", meetup_id: "meetup-1" } },
          body: { location_label: null, latitude: null, longitude: null },
        },
      ),
    );
  });

  it("offers no removal when there is no location", () => {
    renderLocation();
    expect(
      screen.queryByRole("button", { name: "Remove location" }),
    ).not.toBeInTheDocument();
  });

  it("shows the search error and keeps the field usable", async () => {
    mockApiGet.mockResolvedValue({ data: undefined, error: { detail: "x" } });
    renderLocation();
    await type("Av.");
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not search the address. Try again.",
    );
    expect(searchBox()).toBeEnabled();
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("says when no addresses are found", async () => {
    mockApiGet.mockResolvedValue({ data: [], error: undefined });
    renderLocation();
    await type("Zzzz");
    expect(await screen.findByText(/^No addresses found$/)).toBeInTheDocument();
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("reports a failed save through a toast", async () => {
    mockApiPatch.mockResolvedValue({ data: undefined, error: {} });
    renderLocation();
    await type("Av.");
    await user.click(
      await screen.findByRole("option", { name: CORRIENTES.label }),
    );
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Could not save the location."),
    );
    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("marks the list busy while the next search loads", async () => {
    renderLocation();
    await type("Corr");
    await screen.findByRole("listbox");
    mockApiGet.mockImplementation(() => new Promise(() => {}));
    await user.type(searchBox(), "i");
    await act(() => vi.advanceTimersByTimeAsync(300));
    expect(screen.getByRole("listbox")).toHaveAttribute("aria-busy", "true");
  });

  it("wraps from the last option back to the first", async () => {
    renderLocation();
    await type("Av.");
    await screen.findByRole("listbox");
    await user.keyboard("{ArrowDown}{ArrowDown}{ArrowDown}");
    expect(searchBox()).toHaveAttribute(
      "aria-activedescendant",
      screen.getByRole("option", { name: CORRIENTES.label }).id,
    );
  });

  it("resets the highlighted option when the results change", async () => {
    renderLocation();
    await type("Av.");
    await screen.findByRole("listbox");
    await user.keyboard("{ArrowDown}");
    mockApiGet.mockResolvedValue({ data: [CALLAO], error: undefined });
    await type("x");
    await waitFor(() => expect(screen.getAllByRole("option")).toHaveLength(1));
    expect(searchBox()).not.toHaveAttribute("aria-activedescendant");
  });

  it("keeps focus and ignores a second pick while saving", async () => {
    mockApiPatch.mockImplementation(() => new Promise(() => {}));
    renderLocation();
    await type("Av.");
    await user.click(
      await screen.findByRole("option", { name: CORRIENTES.label }),
    );
    expect(searchBox()).toHaveFocus();
    expect(searchBox()).toHaveAttribute("readonly");
    await type("Av.");
    await user.keyboard("{ArrowDown}{Enter}");
    expect(mockApiPatch).toHaveBeenCalledTimes(1);
  });

  it("returns focus to the search after removing the location", async () => {
    renderLocation(LOCATED);
    await user.click(screen.getByRole("button", { name: "Remove location" }));
    await waitFor(() => expect(searchBox()).toHaveFocus());
  });
});
