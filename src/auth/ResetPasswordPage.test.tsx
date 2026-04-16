import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { LanguageProvider } from "@/lib/i18n";
import { ResetPasswordPage } from "./ResetPasswordPage";

// ── API mock ──────────────────────────────────────────────────────────────────
const mockPost = vi.fn();
vi.mock("@/api/client", () => ({ api: { POST: (...a: unknown[]) => mockPost(...a) } }));

// ── Helpers ───────────────────────────────────────────────────────────────────
const VALID_STATE = { username: "alice", code: "123456" };

function renderPage(state: object | null = VALID_STATE) {
  return render(
    <LanguageProvider>
      <MemoryRouter
        initialEntries={[{ pathname: "/reset-password", state }]}
      >
        <Routes>
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/" element={<div data-testid="login-page">login</div>} />
        </Routes>
      </MemoryRouter>
    </LanguageProvider>,
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe("ResetPasswordPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Guard: missing state ───────────────────────────────────────────────────
  it("redirects to / immediately when location.state is null", async () => {
    renderPage(null);
    await waitFor(() =>
      expect(screen.getByTestId("login-page")).toBeInTheDocument(),
    );
  });

  it("redirects to / when state is missing username", async () => {
    renderPage({ code: "123456" });
    await waitFor(() =>
      expect(screen.getByTestId("login-page")).toBeInTheDocument(),
    );
  });

  it("redirects to / when state is missing code", async () => {
    renderPage({ username: "alice" });
    await waitFor(() =>
      expect(screen.getByTestId("login-page")).toBeInTheDocument(),
    );
  });

  // ── Phase 1: form ──────────────────────────────────────────────────────────
  it("renders the new-password field and set-password button", () => {
    renderPage();
    expect(screen.getByLabelText(/nueva contraseña/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /establecer contraseña/i }),
    ).toBeInTheDocument();
  });

  it("password field type is 'password' by default", () => {
    renderPage();
    expect(screen.getByLabelText(/nueva contraseña/i)).toHaveAttribute("type", "password");
  });

  it("toggle button shows and hides password", async () => {
    const user = userEvent.setup();
    renderPage();
    const input = screen.getByLabelText(/nueva contraseña/i);
    const toggle = screen.getByRole("button", { name: "" }); // icon-only button
    expect(input).toHaveAttribute("type", "password");
    await user.click(toggle);
    expect(input).toHaveAttribute("type", "text");
    await user.click(toggle);
    expect(input).toHaveAttribute("type", "password");
  });

  it("password field enforces minLength=15", () => {
    renderPage();
    expect(screen.getByLabelText(/nueva contraseña/i)).toHaveAttribute("minLength", "15");
  });

  it("shows 'Guardando…' while the request is in flight", async () => {
    const user = userEvent.setup();
    mockPost.mockReturnValue(new Promise(() => {}));

    renderPage();
    await user.type(screen.getByLabelText(/nueva contraseña/i), "a".repeat(15));
    await user.click(screen.getByRole("button", { name: /establecer contraseña/i }));

    expect(await screen.findByRole("button", { name: /guardando/i })).toBeInTheDocument();
  });

  it("calls api with correct path and body", async () => {
    const user = userEvent.setup();
    mockPost.mockResolvedValue({ data: { username: "alice" }, error: undefined });

    renderPage();
    await user.type(screen.getByLabelText(/nueva contraseña/i), "mysupersecretpass");
    await user.click(screen.getByRole("button", { name: /establecer contraseña/i }));

    await waitFor(() => expect(mockPost).toHaveBeenCalledOnce());
    expect(mockPost).toHaveBeenCalledWith("/auth/reset-password", {
      body: { username: "alice", code: "123456", new_password: "mysupersecretpass" },
    });
  });

  // ── Phase 2: success ───────────────────────────────────────────────────────
  it("shows congratulations message with username after success", async () => {
    const user = userEvent.setup();
    mockPost.mockResolvedValue({ data: { username: "alice" }, error: undefined });

    renderPage();
    await user.type(screen.getByLabelText(/nueva contraseña/i), "mysupersecretpass");
    await user.click(screen.getByRole("button", { name: /establecer contraseña/i }));

    expect(
      await screen.findByText(/felicitaciones alice/i),
    ).toBeInTheDocument();
  });

  it("back-to-login button navigates to / after success", async () => {
    const user = userEvent.setup();
    mockPost.mockResolvedValue({ data: { username: "alice" }, error: undefined });

    renderPage();
    await user.type(screen.getByLabelText(/nueva contraseña/i), "mysupersecretpass");
    await user.click(screen.getByRole("button", { name: /establecer contraseña/i }));

    const backBtn = await screen.findByRole("link", { name: /volver/i });
    await user.click(backBtn);

    expect(screen.getByTestId("login-page")).toBeInTheDocument();
  });

  // ── Error handling ─────────────────────────────────────────────────────────
  it("shows API error detail on failure", async () => {
    const user = userEvent.setup();
    mockPost.mockResolvedValue({
      data: undefined,
      error: { detail: "Código inválido o expirado." },
    });

    renderPage();
    await user.type(screen.getByLabelText(/nueva contraseña/i), "mysupersecretpass");
    await user.click(screen.getByRole("button", { name: /establecer contraseña/i }));

    expect(
      await screen.findByText("Código inválido o expirado."),
    ).toBeInTheDocument();
  });

  it("shows generic error when fetch throws", async () => {
    const user = userEvent.setup();
    mockPost.mockRejectedValue(new Error("Network failure"));

    renderPage();
    await user.type(screen.getByLabelText(/nueva contraseña/i), "mysupersecretpass");
    await user.click(screen.getByRole("button", { name: /establecer contraseña/i }));

    expect(await screen.findByText(/algo salió mal/i)).toBeInTheDocument();
  });
});
