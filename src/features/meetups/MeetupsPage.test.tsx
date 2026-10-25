import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { LanguageProvider } from "@/lib/i18n";
import { MeetupsPage } from "./MeetupsPage";
import type { components } from "@/api/types";

const mockApiGet = vi.fn();
const mockApiPost = vi.fn();
vi.mock("@/api/client", () => ({
  api: {
    GET: (...a: unknown[]) => mockApiGet(...a),
    POST: (...a: unknown[]) => mockApiPost(...a),
  },
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/org", () => ({
  useOrg: () => ({
    activeOrg: { org_id: "org-1", org_name: "Club Vanta", role: "ADMIN" },
  }),
}));

type Meetup = components["schemas"]["MeetupPublic"];

function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(22, 0, 0, 0);
  return d.toISOString();
}

function meetup(id: string, name: string, date: string): Meetup {
  return {
    id,
    name,
    mazmo_meetup_url: `https://mazmo.net/+eventos/${id}`,
    date,
    is_finalized: false,
    finalized_at: null,
    requires_payment: false,
    location_label: null,
    latitude: null,
    longitude: null,
  };
}

function renderPage({
  meetups = [],
  url = "/meetups",
}: { meetups?: Meetup[]; url?: string } = {}) {
  mockApiGet.mockResolvedValue({
    data: { total: meetups.length, meetups },
    error: undefined,
  });
  mockApiPost.mockResolvedValue({
    data: { id: "new-meetup" },
    error: undefined,
  });

  return render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <LanguageProvider>
        <MemoryRouter initialEntries={[url]}>
          <MeetupsPage />
        </MemoryRouter>
      </LanguageProvider>
    </QueryClientProvider>,
  );
}

describe("MeetupsPage — new meetup dialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem("lang", "en");
  });

  it("sends requires_payment: true when the checkbox is checked", async () => {
    renderPage();

    await userEvent.click(
      await screen.findByRole("button", { name: "New Meetup" }),
    );
    await userEvent.type(screen.getByLabelText("Name"), "Paid Night");
    await userEvent.type(
      screen.getByLabelText("Mazmo URL"),
      "https://mazmo.net/eventos/paid-night",
    );
    await userEvent.click(
      screen.getByRole("checkbox", { name: "Requires payment" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Create" }));

    expect(mockApiPost).toHaveBeenCalledWith(
      "/organizations/{org_id}/meetups/",
      expect.objectContaining({
        body: expect.objectContaining({ requires_payment: true }),
      }),
    );
  });
});

describe("MeetupsPage — list", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem("lang", "en");
  });

  const MEETUPS = [
    meetup("m-far", "Alter #43", daysFromNow(20)),
    meetup("m-old", "Alter #40", daysFromNow(-30)),
    meetup("m-today", "Spookink II", daysFromNow(0)),
  ];

  it("groups meetups into today-and-upcoming and past", async () => {
    renderPage({ meetups: MEETUPS });

    const upcoming = await screen.findByRole("region", {
      name: /Today and upcoming/,
    });
    const names = within(upcoming)
      .getAllByRole("link", { name: /^(Alter|Spookink)/ })
      .map((a) => a.textContent);
    expect(names).toEqual(["Spookink II", "Alter #43"]);
    expect(within(upcoming).getByText("Today")).toBeInTheDocument();

    const past = screen.getByRole("region", { name: /Past/ });
    expect(
      within(past).getByRole("link", { name: "Alter #40" }),
    ).toHaveAttribute("href", "/meetups/m-old");
  });

  it("shows one flat list once a sort is picked", async () => {
    renderPage({ meetups: MEETUPS });

    await userEvent.click(await screen.findByRole("button", { name: /Name/ }));

    expect(
      screen.queryByRole("region", { name: /Today and upcoming/ }),
    ).not.toBeInTheDocument();
    const names = screen
      .getAllByRole("link", { name: /^(Alter|Spookink)/ })
      .map((a) => a.textContent);
    expect(names).toEqual(["Alter #40", "Alter #43", "Spookink II"]);
  });

  it("opens the new meetup dialog when linked with ?new=1", async () => {
    renderPage({ url: "/meetups?new=1" });

    expect(
      await screen.findByRole("dialog", { name: "New Meetup" }),
    ).toBeInTheDocument();
  });
});
