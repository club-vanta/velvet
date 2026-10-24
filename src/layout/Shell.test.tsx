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
    expect(
      screen.getAllByRole("link", { name: "Estadísticas" })[0],
    ).toHaveAttribute("href", "/stats");
  });
});
