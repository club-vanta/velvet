import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { LanguageProvider } from "@/lib/i18n";
import { EventsPage } from "./EventsPage";
import type { components } from "@/api/types";

type EventLog = components["schemas"]["EventLogPublic"];

const mockApiGet = vi.fn();
vi.mock("@/api/client", () => ({
  api: { GET: (...a: unknown[]) => mockApiGet(...a) },
}));

vi.mock("@/lib/org", () => ({
  useOrg: () => ({
    activeOrg: { org_id: "org-1", org_name: "Club Vanta", role: "ADMIN" },
  }),
}));

function event(overrides: Partial<EventLog>): EventLog {
  return {
    id: 1,
    event_type: "CHECK_IN",
    timestamp: "2026-10-20T22:00:00Z",
    actor: { id: 1, username: "admin" },
    guest: {
      id: "g-1",
      mazmo_user_id: 1,
      mazmo_handle: "cindy",
      displayname: "Cindy Dark",
    },
    meetup_id: null,
    reason: null,
    ...overrides,
  } as EventLog;
}

function renderPage(events: EventLog[]) {
  mockApiGet.mockImplementation((path: string) => {
    if (path === "/organizations/{org_id}/events/")
      return Promise.resolve({
        data: { total: events.length, events },
        error: undefined,
      });
    return Promise.resolve({
      data: { total: 0, meetups: [] },
      error: undefined,
    });
  });
  return render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <LanguageProvider>
        <MemoryRouter>
          <EventsPage />
        </MemoryRouter>
      </LanguageProvider>
    </QueryClientProvider>,
  );
}

describe("EventsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem("lang", "en");
  });

  it("labels a guest type change and makes its reason readable", async () => {
    renderPage([
      event({
        event_type: "GUEST_TYPE_CHANGED",
        reason: "Changed guest_type from NORMAL to VENDOR",
      }),
    ]);

    expect(await screen.findByText("Guest type changed")).toBeInTheDocument();
    expect(screen.getByText("Regular → Vendor")).toBeInTheDocument();
  });

  it("keeps an unrecognized reason as-is", async () => {
    renderPage([
      event({ event_type: "GUEST_TYPE_CHANGED", reason: "Something else" }),
    ]);

    expect(await screen.findByText("Something else")).toBeInTheDocument();
  });

  it("links the guest name to the guest profile", async () => {
    renderPage([event({})]);

    expect(
      await screen.findByRole("link", { name: "Cindy Dark" }),
    ).toHaveAttribute("href", "/guests/g-1");
  });
});
