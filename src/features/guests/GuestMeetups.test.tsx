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

const EMPTY: Response = {
  total: 0,
  summary: { attended: 0, walkin: 0, no_show: 0, cancelled: 0, upcoming: 0 },
  meetups: [],
};

function setup({
  orgId = "org-1",
  path = "/guests/g-1",
  result = { data: RESPONSE, error: undefined },
}: {
  orgId?: string;
  path?: string;
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
        <MemoryRouter initialEntries={[path]}>
          <GuestMeetups guestId="g-1" orgId={orgId} headingAs="h2" />
        </MemoryRouter>
      </LanguageProvider>
    </QueryClientProvider>,
  );
}

async function rows() {
  return within(await screen.findByRole("list")).getAllByRole("listitem");
}

// The count next to a summary term, e.g. "No-show" -> "1".
function totalFor(term: string) {
  const group = screen.getByRole("group", { name: /Totals|Totales/ });
  return within(group).getByText(term).nextElementSibling;
}

describe("GuestMeetups", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem("lang", "en");
  });

  it("asks the org-scoped endpoint for this guest", async () => {
    setup();

    await rows();
    expect(mockApiGet).toHaveBeenCalledWith(
      "/organizations/{org_id}/guests/{guest_id}/meetups",
      { params: { path: { org_id: "org-1", guest_id: "g-1" } } },
    );
  });

  it("renders each meetup with its status label, newest first", async () => {
    setup();

    const items = await rows();
    const expected = [
      ["Sadoplace", "Upcoming"],
      ["Cuerdas", "No-show"],
      ["Munch Palermo", "Attended"],
      ["Septiembre", "Cancelled"],
      ["Munch Agosto", "Walk-in"],
    ];
    expect(items).toHaveLength(expected.length);
    expected.forEach(([name, label], i) => {
      expect(within(items[i]).getByRole("link")).toHaveTextContent(name);
      expect(within(items[i]).getByText(label)).toBeInTheDocument();
    });
  });

  it("links each meetup to its page", async () => {
    setup();

    expect(
      await screen.findByRole("link", { name: "Cuerdas" }),
    ).toHaveAttribute("href", "/meetups/m-4");
  });

  it("does not link the meetup the page is already on, and marks it", async () => {
    setup({ path: "/meetups/m-4" });

    const items = await rows();
    expect(within(items[1]).queryByRole("link")).not.toBeInTheDocument();
    expect(within(items[1]).getByText("Cuerdas")).toBeInTheDocument();
    expect(within(items[1]).getByText("This meetup")).toBeInTheDocument();
    expect(within(items[0]).getByRole("link")).toBeInTheDocument();
  });

  it("shows the guest type badge only when it is not NORMAL", async () => {
    setup();

    const items = await rows();
    expect(within(items[2]).getByText("Vendor")).toBeInTheDocument();
    expect(screen.queryByText("Regular")).not.toBeInTheDocument();
  });

  it("says a walk-in did not sign up, and shows arrival only when present", async () => {
    setup();

    const items = await rows();
    expect(items[4]).toHaveTextContent("Didn't sign up");
    expect(items[4]).toHaveTextContent("Arrived");
    expect(items[1]).toHaveTextContent("Signed up");
    expect(items[1]).not.toHaveTextContent("Arrived");
  });

  it("summary counts each status and shows walk-ins inside attended", async () => {
    setup();

    await rows();
    expect(totalFor("Attended")).toHaveTextContent("2");
    expect(totalFor("Attended")?.nextElementSibling).toHaveTextContent(
      "(Walk-in: 1)",
    );
    expect(totalFor("No-show")).toHaveTextContent("1");
    expect(totalFor("Cancelled")).toHaveTextContent("1");
    expect(totalFor("Upcoming")).toHaveTextContent("1");
  });

  it("summary uses the Spanish labels, with Discreto for walk-ins", async () => {
    localStorage.setItem("lang", "es");
    setup();

    const items = await rows();
    expect(within(items[4]).getByText("Discreto")).toBeInTheDocument();
    expect(totalFor("Fue")).toHaveTextContent("2");
    expect(totalFor("Fue")?.nextElementSibling).toHaveTextContent(
      "(Discreto: 1)",
    );
    expect(totalFor("No fue")).toHaveTextContent("1");
    expect(totalFor("Se bajó")).toHaveTextContent("1");
    expect(totalFor("Próximo")).toHaveTextContent("1");
  });

  it("summary hides zero counts", async () => {
    setup({
      result: {
        data: {
          total: 1,
          summary: { ...EMPTY.summary, no_show: 1 },
          meetups: [meetup({ status: "NO_SHOW" })],
        },
      },
    });

    await rows();
    const group = screen.getByRole("group", { name: "Totals" });
    expect(within(group).getAllByRole("term")).toHaveLength(1);
    expect(totalFor("No-show")).toHaveTextContent("1");
  });

  it("shows the empty state", async () => {
    setup({ result: { data: EMPTY } });

    expect(
      await screen.findByText(
        "Hasn't signed up for any meetups in this organization.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole("group")).not.toBeInTheDocument();
  });

  it("shows retry when meetups fail, and recovers", async () => {
    setup({ result: { data: undefined, error: { detail: "boom" } } });

    expect(
      await screen.findByText("Failed to load meetups."),
    ).toBeInTheDocument();

    mockApiGet.mockResolvedValue({ data: RESPONSE, error: undefined });
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await rows()).toHaveLength(5);
  });

  it("renders nothing and does not query without an org", () => {
    const { container } = setup({ orgId: "" });

    expect(container).toBeEmptyDOMElement();
    expect(mockApiGet).not.toHaveBeenCalled();
  });
});
