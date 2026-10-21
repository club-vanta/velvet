import { render, screen, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LanguageProvider } from "@/lib/i18n";
import { GuestProfile } from "./GuestProfile";
import type { components } from "@/api/types";

type Guest = components["schemas"]["GuestPublic"];
type History = components["schemas"]["GuestDisplaynameHistoryPublic"];
type BannedGuest = components["schemas"]["BannedGuestPublic"];

const mockApiGet = vi.fn();
vi.mock("@/api/client", () => ({
  api: { GET: (...a: unknown[]) => mockApiGet(...a) },
}));

const GUEST: Guest = {
  id: "g-1",
  mazmo_user_id: 200003,
  mazmo_handle: "juanp",
  displayname: "Juan P.",
  instagram_username: "juan.ig",
  mazmo_profile: {
    avatar_url: null,
    age: 31,
    gender: "MALE_CIS",
    pronoun: "MALE",
    mazmo_suspended: false,
    mazmo_banned: false,
    mazmo_deleted: false,
    synced_at: "2026-10-18T03:00:00Z",
  },
};

const HISTORY: History[] = [
  {
    displayname: "Juan P.",
    source: "SYNC",
    recorded_at: "2026-10-18T03:00:00Z",
    actor: null,
  },
  {
    displayname: "Juan Perez",
    source: "MANUAL_EDIT",
    recorded_at: "2026-10-11T03:00:00Z",
    actor: { id: 1, username: "carla" },
  },
  {
    displayname: "Juan",
    source: "BACKFILL",
    recorded_at: "2026-10-01T03:00:00Z",
    actor: null,
  },
];

function setup({
  guest = GUEST,
  status = 200,
  history = HISTORY,
  banned = [],
}: {
  guest?: Guest | undefined;
  status?: number;
  history?: History[];
  banned?: BannedGuest[];
} = {}) {
  mockApiGet.mockImplementation((path: string) => {
    if (path === "/guests/{guest_id}")
      return Promise.resolve(
        status === 200
          ? { data: guest, error: undefined, response: { status } }
          : { data: undefined, error: { detail: "x" }, response: { status } },
      );
    if (path === "/guests/{guest_id}/displayname-history")
      return Promise.resolve({
        data: { total: history.length, history },
        error: undefined,
      });
    if (path === "/organizations/{org_id}/guests/banned")
      return Promise.resolve({
        data: { total: banned.length, guests: banned },
        error: undefined,
      });
    return Promise.resolve({ data: undefined, error: undefined });
  });

  return render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <LanguageProvider>
        <GuestProfile guestId="g-1" orgId="org-1" orgName="Club Vanta" />
      </LanguageProvider>
    </QueryClientProvider>,
  );
}

describe("GuestProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem("lang", "en");
  });

  it("shows identity and Mazmo profile details", async () => {
    setup();

    expect(
      await screen.findByRole("heading", { level: 1, name: "Juan P." }),
    ).toBeInTheDocument();
    expect(screen.getByText("Age").closest("div")).toHaveTextContent(
      "31 years",
    );
    expect(screen.getByText("Gender").closest("div")).toHaveTextContent(
      "Cis man",
    );
    expect(screen.getByText("Pronouns").closest("div")).toHaveTextContent(
      "Masculine",
    );
    expect(screen.getByRole("link", { name: /@juanp/ })).toHaveAttribute(
      "href",
      "https://mazmo.net/@juanp",
    );
    expect(screen.getByText("he/him")).toBeInTheDocument();
    expect(screen.getByText("Mazmo ID").closest("div")).toHaveTextContent(
      "200003",
    );
    expect(screen.getByRole("link", { name: /@juan\.ig/ })).toHaveAttribute(
      "href",
      "https://instagram.com/juan.ig",
    );
  });

  it("lists the name history newest first, with source and actor", async () => {
    setup();

    const items = await screen.findAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent("Juan P.");
    expect(items[0]).toHaveTextContent("Current");
    expect(items[0]).toHaveTextContent("Mazmo sync");
    expect(items[1]).toHaveTextContent("Juan Perez");
    expect(items[1]).toHaveTextContent("Manual");
    expect(items[1]).toHaveTextContent("by carla");
    expect(items[1]).not.toHaveTextContent("Current");
    expect(items[2]).toHaveTextContent("Imported");
    expect(items[2]).toHaveTextContent(/history tracking started/);
  });

  it("explains a linked guest whose Mazmo data is not synced yet", async () => {
    setup({ guest: { ...GUEST, mazmo_profile: null } });

    expect(
      await screen.findByText(/Mazmo profile data isn't synced yet/),
    ).toBeInTheDocument();
    expect(screen.queryByText("Age")).not.toBeInTheDocument();
  });

  it("explains a guest with no Mazmo account", async () => {
    setup({
      guest: {
        ...GUEST,
        mazmo_user_id: null,
        mazmo_handle: null,
        mazmo_profile: null,
      },
    });

    expect(
      await screen.findByText(/No Mazmo account linked/),
    ).toBeInTheDocument();
  });

  it("shows the org vant with its reason", async () => {
    setup({
      banned: [
        {
          id: "g-1",
          mazmo_user_id: 200003,
          mazmo_handle: "juanp",
          displayname: "Juan P.",
          instagram_username: null,
          banned_at: "2026-08-22T03:00:00Z",
          banned_reason: "Aggressive at Alter #40",
          banned_by_id: 1,
        },
      ],
    });

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Vanted in Club Vanta");
    expect(alert).toHaveTextContent("Aggressive at Alter #40");
  });

  it("calls out Mazmo's own ban as separate from org vants", async () => {
    setup({
      guest: {
        ...GUEST,
        mazmo_profile: { ...GUEST.mazmo_profile!, mazmo_banned: true },
      },
    });

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Mazmo banned this account");
    expect(alert).toHaveTextContent(/separate from vants/);
    expect(screen.getByText("Banned on Mazmo")).toBeInTheDocument();
    expect(screen.getByText("@juanp")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /juanp/ })).toBeNull();
    expect(within(document.body).queryByText("Vanted")).not.toBeInTheDocument();
  });

  it("marks a deleted Mazmo account and drops the dead profile link", async () => {
    setup({
      guest: {
        ...GUEST,
        mazmo_handle: "machoarriba",
        mazmo_profile: { ...GUEST.mazmo_profile!, mazmo_deleted: true },
      },
    });

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("This account no longer exists on Mazmo");
    expect(screen.getByText("Mazmo account deleted")).toBeInTheDocument();
    expect(screen.getByText("@machoarriba")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /machoarriba/ })).toBeNull();
  });

  it("shows a not-found state for an unknown guest", async () => {
    setup({ guest: undefined, status: 404 });

    expect(
      await screen.findByRole("heading", { name: "Guest not found" }),
    ).toBeInTheDocument();
  });
});
