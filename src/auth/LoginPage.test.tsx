import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { LanguageProvider } from "@/lib/i18n";
import { LoginPage } from "./LoginPage";

// ── Mocks ─────────────────────────────────────────────────────────────────────
vi.mock("./AuthContext", () => ({
  useAuth: () => ({ login: vi.fn() }),
}));

function renderPage() {
  return render(
    <LanguageProvider>
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    </LanguageProvider>,
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe("LoginPage — forgot password link", () => {
  it("renders the forgot-password link", () => {
    renderPage();
    const link = screen.getByRole("link", { name: /olvidaste tu contraseña/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/forgot-password");
  });

  it("forgot-password link is visible alongside the sign-up link", () => {
    renderPage();
    expect(
      screen.getByRole("link", { name: /olvidaste tu contraseña/i }),
    ).toBeVisible();
    expect(screen.getByRole("link", { name: /registrate/i })).toBeVisible();
  });
});
