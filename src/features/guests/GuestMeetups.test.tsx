import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { LanguageProvider } from "@/lib/i18n";
import { GuestMeetups } from "./GuestMeetups";
import type { components } from "@/api/types";

type Response = components["schemas"]["GuestMeetupAttendanceListResponse"];
type GuestMeetup = components["schemas"]["GuestMeetupAttendancePublic"];

const mockApiGet = vi.fn();
vi.mock("@/api/client", () => ({
  api: { GET: (...a: unknown[]) => mockApiGet(...a) },
}));

function meetup(overrides: Partial<GuestMeetup>): GuestMeetup {
  return {
    meetup_id: "m-1",
    name: "Munch",
    date: "2026-10-11T23:00:00Z",
    status: "ATTENDED",
    rsvp_time: "2026-10-02T15:00:00Z",
    arrival_time: null,
    guest_type: "NORMAL",
    ...overrides,
  };
}

const RESPONSE: Response = {
  total: 5,
  summary: { attended: 2, walkin: 1, no_show: 1, cancelled: 1, upcoming: 1 },
  meetups: [
    meetup({ meetup_id: "m-5", name: "Sadoplace", status: "UPCOMING" }),
    meetup({ meetup_id: "m-4", name: "Cuerdas", status: "NO_SHOW" }),
    meetup({
      meetup_id: "m-3",
      name: "Munch Palermo",
      status: "ATTENDED",
      arrival_time: "2026-09-26T00:47:00Z",
      guest_type: "VENDOR",
    }),
    meetup({ meetup_id: "m-2", name: "Septiembre", status: "CANCELLED" }),
    meetup({
      meetup_id: "m-1",
      name: "Munch Agosto",
      status: "WALKIN",
      arrival_time: "2026-08-15T01:10:00Z",
    }),
  ],
};

function setup({
  orgId = "org-1",
  result = { data: RESPONSE, error: undefined },
}: {
  orgId?: string;
  result?: { data?: Response; error?: unknown };
} = {}) {
  mockApiGet.mockResolvedValue(result);
  return render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <LanguageProvider>
        <MemoryRouter>
          <GuestMeetups guestId="g-1" orgId={orgId} headingAs="h2" />
        </MemoryRouter>
      </LanguageProvider>
    </QueryClientProvider>,
  );
}

describe("GuestMeetups", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem("lang", "en");
  });

  it("asks the org-scoped endpoint for this guest", async () => {
    setup();

    await screen.findByText("Sadoplace");
    expect(mockApiGet).toHaveBeenCalledWith(
      "/organizations/{org_id}/guests/{guest_id}/meetups",
      { params: { path: { org_id: "org-1", guest_id: "g-1" } } },
    );
  });

  it("renders each meetup with its status label, newest first", async () => {
    setup();

    const list = await screen.findByRole("list");
    const items = within(list).getAllByRole("listitem");
    expect(items.map((li) => li.textContent)).toEqual([
      expect.stringContaining("SadoplaceUpcoming"),
      expect.stringContaining("CuerdasNo-show"),
      expect.stringContaining("Munch PalermoAttended"),
      expect.stringContaining("SeptiembreCancelled"),
      expect.stringContaining("Munch AgostoWalk-in"),
    ]);
  });

  it("uses Discreto for walk-ins in Spanish", async () => {
    localStorage.setItem("lang", "es");
    setup();

    const items = await screen.findAllByRole("listitem");
    expect(items[4]).toHaveTextContent("Discreto");
    expect(items[1]).toHaveTextContent("No fue");
    expect(items[3]).toHaveTextContent("Se bajó");
  });

  it("summary shows walk-ins inside attended", async () => {
    setup();

    const totals = await screen.findByLabelText("Totals");
    expect(totals).toHaveTextContent(
      "Attended2(Walk-in: 1)No-show1Cancelled1Upcoming1",
    );
  });

  it("summary hides zero counts", async () => {
    setup({
      result: {
        data: {
          total: 1,
          summary: {
            attended: 0,
            walkin: 0,
            no_show: 1,
            cancelled: 0,
            upcoming: 0,
          },
          meetups: [meetup({ status: "NO_SHOW" })],
        },
      },
    });

    const totals = await screen.findByLabelText("Totals");
    expect(totals).toHaveTextContent(/^No-show1$/);
  });

  it("links each meetup to its page", async () => {
    setup();

    expect(
      await screen.findByRole("link", { name: "Cuerdas" }),
    ).toHaveAttribute("href", "/meetups/m-4");
  });

  it("shows the guest type badge only when it is not NORMAL", async () => {
    setup();

    const items = await screen.findAllByRole("listitem");
    expect(items[2]).toHaveTextContent("Vendor");
    expect(screen.queryByText("Regular")).not.toBeInTheDocument();
  });

  it("says a walk-in did not sign up, and shows arrival times", async () => {
    setup();

    const items = await screen.findAllByRole("listitem");
    expect(items[4]).toHaveTextContent("Didn't sign up");
    expect(items[4]).toHaveTextContent("Arrived");
    expect(items[1]).toHaveTextContent("Signed up");
    expect(items[1]).not.toHaveTextContent("Arrived");
  });

  it("shows the empty state", async () => {
    setup({
      result: {
        data: {
          total: 0,
          summary: {
            attended: 0,
            walkin: 0,
            no_show: 0,
            cancelled: 0,
            upcoming: 0,
          },
          meetups: [],
        },
      },
    });

    expect(
      await screen.findByText(
        "Hasn't signed up for any meetup of this organization.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Totals")).not.toBeInTheDocument();
  });

  it("shows retry when meetups fail, and recovers", async () => {
    setup({ result: { data: undefined, error: { detail: "boom" } } });

    expect(
      await screen.findByText("Failed to load meetups."),
    ).toBeInTheDocument();

    mockApiGet.mockResolvedValue({ data: RESPONSE, error: undefined });
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("Sadoplace")).toBeInTheDocument();
  });

  it("renders nothing and does not query without an org", () => {
    const { container } = setup({ orgId: "" });

    expect(container).toBeEmptyDOMElement();
    expect(mockApiGet).not.toHaveBeenCalled();
  });
});
