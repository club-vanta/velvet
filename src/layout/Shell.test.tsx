import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { LanguageProvider } from "@/lib/i18n";
import { Shell } from "./Shell";

let role: "ADMIN" | "STAFF" = "STAFF";

vi.mock("@/api/client", () => ({ api: { GET: vi.fn() } }));
vi.mock("@/auth/AuthContext", () => ({
  useAuth: () => ({
    user: { username: "ana", role: { name: "USER" } },
    logout: vi.fn(),
  }),
}));
vi.mock("@/lib/org", () => ({
  useIsOrgAdmin: () => role === "ADMIN",
  useOrg: () => ({
    orgs: [],
    activeOrg: { org_id: "org-1", org_name: "Club Vanta", role },
    setActiveOrg: vi.fn(),
  }),
}));

function renderShell() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <LanguageProvider>
        <MemoryRouter>
          <Shell>content</Shell>
        </MemoryRouter>
      </LanguageProvider>
    </QueryClientProvider>,
  );
}

describe("Shell nav", () => {
  it("hides the Estadísticas link from org staff", () => {
    role = "STAFF";
    renderShell();
    expect(
      screen.queryByRole("link", { name: "Estadísticas" }),
    ).not.toBeInTheDocument();
  });

  it("shows the Estadísticas link to org admins", () => {
    role = "ADMIN";
    renderShell();
    // One link in the sidebar and one in the mobile bottom nav (labelled "Stats").
    expect(screen.getByRole("link", { name: "Estadísticas" })).toHaveAttribute(
      "href",
      "/stats",
    );
    expect(screen.getByRole("link", { name: "Stats" })).toHaveAttribute(
      "href",
      "/stats",
    );
  });

  it("keeps each bottom-nav label inside its own slot on narrow phones", () => {
    role = "ADMIN";
    renderShell();
    const navs = document.querySelectorAll("nav");
    const bottom = navs[navs.length - 1]!;
    const links = Array.from(bottom.querySelectorAll("a"));
    expect(links.length).toBeGreaterThan(0);
    // jsdom has no layout, so pin what keeps the labels apart: a slot that
    // may shrink below its label and a label that is clipped, not spilled.
    for (const link of links) {
      expect(link).toHaveClass("min-w-0");
      expect(link.querySelector("span:last-child")).toHaveClass("truncate");
    }
  });
});
