import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { LanguageProvider } from "@/lib/i18n";
import { ForgotPasswordPage } from "./ForgotPasswordPage";

// ── API mock ──────────────────────────────────────────────────────────────────
const mockPost = vi.fn();
vi.mock("@/api/client", () => ({
  api: { POST: (...a: unknown[]) => mockPost(...a) },
}));

// ── Helpers ───────────────────────────────────────────────────────────────────
/** Records the location that react-router navigates to. */
function LocationSpy() {
  const loc = useLocation();
  return (
    <div data-testid="spy-path" data-state={JSON.stringify(loc.state)}>
      {loc.pathname}
    </div>
  );
}

function renderPage() {
  return render(
    <LanguageProvider>
      <MemoryRouter initialEntries={["/forgot-password"]}>
        <Routes>
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<LocationSpy />} />
          <Route path="/" element={<div data-testid="login-page">login</div>} />
        </Routes>
      </MemoryRouter>
    </LanguageProvider>,
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe("ForgotPasswordPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders title, username field, code field, verify button, and back-to-login link", () => {
    renderPage();
    expect(screen.getByText("Alter Tracker")).toBeInTheDocument();
    expect(screen.getByLabelText(/usuario/i)).toBeInTheDocument();
    expect(
      screen.getByLabelText(/código de recuperación/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /verificar código/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /volver/i })).toHaveAttribute(
      "href",
      "/",
    );
  });

  it("code field has inputMode=numeric and maxLength=6", () => {
    renderPage();
    const codeInput = screen.getByLabelText(/código de recuperación/i);
    expect(codeInput).toHaveAttribute("inputMode", "numeric");
    expect(codeInput).toHaveAttribute("maxLength", "6");
  });

  it("shows 'Verificando…' while the request is in flight", async () => {
    const user = userEvent.setup();
    // never resolves → stays pending
    mockPost.mockReturnValue(new Promise(() => {}));

    renderPage();
    await user.type(screen.getByLabelText(/usuario/i), "alice");
    await user.type(screen.getByLabelText(/código de recuperación/i), "123456");
    await user.click(screen.getByRole("button", { name: /verificar código/i }));

    expect(
      await screen.findByRole("button", { name: /verificando/i }),
    ).toBeInTheDocument();
  });

  it("navigates to /reset-password with username and code in state on success", async () => {
    const user = userEvent.setup();
    mockPost.mockResolvedValue({ data: { ok: true }, error: undefined });

    renderPage();
    await user.type(screen.getByLabelText(/usuario/i), "alice");
    await user.type(screen.getByLabelText(/código de recuperación/i), "123456");
    await user.click(screen.getByRole("button", { name: /verificar código/i }));

    await waitFor(() =>
      expect(screen.getByTestId("spy-path")).toHaveTextContent(
        "/reset-password",
      ),
    );
    const state = JSON.parse(screen.getByTestId("spy-path").dataset.state!);
    expect(state).toEqual({ username: "alice", code: "123456" });
  });

  it("api is called with the correct path and body", async () => {
    const user = userEvent.setup();
    mockPost.mockResolvedValue({ data: { ok: true }, error: undefined });

    renderPage();
    await user.type(screen.getByLabelText(/usuario/i), "bob");
    await user.type(screen.getByLabelText(/código de recuperación/i), "654321");
    await user.click(screen.getByRole("button", { name: /verificar código/i }));

    await waitFor(() => expect(mockPost).toHaveBeenCalledOnce());
    expect(mockPost).toHaveBeenCalledWith("/auth/verify-recovery-code", {
      body: { username: "bob", code: "654321" },
    });
  });

  it("shows the API error message on failure (FastAPI detail string)", async () => {
    const user = userEvent.setup();
    mockPost.mockResolvedValue({
      data: undefined,
      error: { detail: "Código inválido o expirado." },
    });

    renderPage();
    await user.type(screen.getByLabelText(/usuario/i), "alice");
    await user.type(screen.getByLabelText(/código de recuperación/i), "000000");
    await user.click(screen.getByRole("button", { name: /verificar código/i }));

    expect(
      await screen.findByText("Código inválido o expirado."),
    ).toBeInTheDocument();
  });

  it("shows fallback error when API returns unknown error shape", async () => {
    const user = userEvent.setup();
    mockPost.mockResolvedValue({ data: undefined, error: {} });

    renderPage();
    await user.type(screen.getByLabelText(/usuario/i), "alice");
    await user.type(screen.getByLabelText(/código de recuperación/i), "000000");
    await user.click(screen.getByRole("button", { name: /verificar código/i }));

    expect(
      await screen.findByText(/código inválido o expirado/i),
    ).toBeInTheDocument();
  });

  it("shows generic error when the fetch itself throws (network error)", async () => {
    const user = userEvent.setup();
    mockPost.mockRejectedValue(new Error("Network failure"));

    renderPage();
    await user.type(screen.getByLabelText(/usuario/i), "alice");
    await user.type(screen.getByLabelText(/código de recuperación/i), "123456");
    await user.click(screen.getByRole("button", { name: /verificar código/i }));

    expect(await screen.findByText(/algo salió mal/i)).toBeInTheDocument();
  });

  it("clears error between attempts", async () => {
    const user = userEvent.setup();
    mockPost
      .mockResolvedValueOnce({
        data: undefined,
        error: { detail: "Código inválido o expirado." },
      })
      .mockResolvedValueOnce({ data: { ok: true }, error: undefined });

    renderPage();
    await user.type(screen.getByLabelText(/usuario/i), "alice");
    await user.type(screen.getByLabelText(/código de recuperación/i), "000000");
    await user.click(screen.getByRole("button", { name: /verificar código/i }));
    expect(
      await screen.findByText("Código inválido o expirado."),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /verificar código/i }));
    await waitFor(() =>
      expect(
        screen.queryByText("Código inválido o expirado."),
      ).not.toBeInTheDocument(),
    );
  });
});
