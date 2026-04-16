import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { LanguageProvider } from "@/lib/i18n";
import { StaffPage } from "./StaffPage";
import type { components } from "@/api/types";

type User = components["schemas"]["UserPublic"];

// ── Mocks ─────────────────────────────────────────────────────────────────────
const mockApiGet = vi.fn();
const mockApiPost = vi.fn();
const mockApiPatch = vi.fn();
vi.mock("@/api/client", () => ({
  api: {
    GET: (...a: unknown[]) => mockApiGet(...a),
    POST: (...a: unknown[]) => mockApiPost(...a),
    PATCH: (...a: unknown[]) => mockApiPatch(...a),
  },
}));

vi.mock("@/auth/AuthContext", () => ({
  useAuth: () => ({ user: { id: 1, role: { name: "ADMIN" } } }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// ── Test data ─────────────────────────────────────────────────────────────────
const ADMIN_USER: User = {
  id: 1,
  username: "adminuser",
  role: { id: 1, name: "ADMIN" },
  is_approved: true,
  is_disabled: false,
  created_at: "2024-01-01T00:00:00Z",
};

const STAFF_USER: User = {
  id: 2,
  username: "staffuser",
  role: { id: 2, name: "STAFF" },
  is_approved: true,
  is_disabled: false,
  created_at: "2024-01-01T00:00:00Z",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function renderStaffPage() {
  mockApiGet.mockImplementation((path: string) => {
    if (path === "/staff/") return Promise.resolve({ data: [ADMIN_USER, STAFF_USER], error: undefined });
    if (path === "/staff/pending") return Promise.resolve({ data: [], error: undefined });
    return Promise.resolve({ data: [], error: undefined });
  });

  return render(
    <LanguageProvider>
      <MemoryRouter>
        <QueryClientProvider client={makeQueryClient()}>
          <StaffPage />
        </QueryClientProvider>
      </MemoryRouter>
    </LanguageProvider>,
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe("RecoveryCodeDialog (via StaffPage)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("each staff row has a 'Olvidó su contraseña' button", async () => {
    renderStaffPage();
    const buttons = await screen.findAllByRole("button", { name: /olvidó su contraseña/i });
    // one per user row
    expect(buttons.length).toBeGreaterThanOrEqual(2);
  });

  it("clicking the button opens the confirmation dialog for that user", async () => {
    const user = userEvent.setup();
    renderStaffPage();

    const [firstBtn] = await screen.findAllByRole("button", { name: /olvidó su contraseña/i });
    await user.click(firstBtn);

    expect(
      await screen.findByText(/generar código de recuperación para/i),
    ).toBeInTheDocument();
  });

  it("Cancel button closes the dialog", async () => {
    const user = userEvent.setup();
    renderStaffPage();

    const [firstBtn] = await screen.findAllByRole("button", { name: /olvidó su contraseña/i });
    await user.click(firstBtn);
    await screen.findByText(/generar código de recuperación para/i);

    await user.click(screen.getByRole("button", { name: /cancelar/i }));

    await waitFor(() =>
      expect(
        screen.queryByText(/generar código de recuperación para/i),
      ).not.toBeInTheDocument(),
    );
  });

  it("confirmation dialog shows the username and warning text", async () => {
    const user = userEvent.setup();
    renderStaffPage();

    // Click the button for staffuser row
    const buttons = await screen.findAllByRole("button", { name: /olvidó su contraseña/i });
    // second button = staffuser
    await user.click(buttons[1]);

    // The dialog title contains the username — find it within the heading role
    const dialogTitle = await screen.findByRole("heading", {
      name: /generar código de recuperación para/i,
    });
    expect(dialogTitle).toHaveTextContent("staffuser");
    expect(
      screen.getByText(/invalidará cualquier código previo/i),
    ).toBeInTheDocument();
  });

  it("clicking 'Generar código' calls POST /staff/{user_id}/recovery-code and shows the code", async () => {
    const user = userEvent.setup();
    mockApiPost.mockResolvedValue({
      data: { username: "staffuser", code: "042567" },
      error: undefined,
    });

    renderStaffPage();

    const buttons = await screen.findAllByRole("button", { name: /olvidó su contraseña/i });
    await user.click(buttons[1]);
    await screen.findByText(/generar código de recuperación para/i);

    await user.click(screen.getByRole("button", { name: /generar código/i }));

    expect(
      await screen.findByText("042567"),
    ).toBeInTheDocument();

    expect(mockApiPost).toHaveBeenCalledWith("/staff/{user_id}/recovery-code", {
      params: { path: { user_id: 2 } },
    });
  });

  it("shows 'Generando…' while the request is in flight", async () => {
    const user = userEvent.setup();
    mockApiPost.mockReturnValue(new Promise(() => {}));

    renderStaffPage();

    const [firstBtn] = await screen.findAllByRole("button", { name: /olvidó su contraseña/i });
    await user.click(firstBtn);
    await screen.findByText(/generar código de recuperación para/i);

    await user.click(screen.getByRole("button", { name: /generar código/i }));

    expect(await screen.findByRole("button", { name: /generando/i })).toBeInTheDocument();
  });

  it("generated code is rendered in a monospace element", async () => {
    const user = userEvent.setup();
    mockApiPost.mockResolvedValue({
      data: { username: "staffuser", code: "999000" },
      error: undefined,
    });

    renderStaffPage();

    const buttons = await screen.findAllByRole("button", { name: /olvidó su contraseña/i });
    await user.click(buttons[1]);
    await user.click(await screen.findByRole("button", { name: /generar código/i }));

    const codeEl = await screen.findByText("999000");
    expect(codeEl.className).toMatch(/mono/);
  });

  it("Copy button writes code to clipboard and temporarily shows 'Copiado!'", async () => {
    const user = userEvent.setup();
    mockApiPost.mockResolvedValue({
      data: { username: "adminuser", code: "123456" },
      error: undefined,
    });

    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      writable: true,
      configurable: true,
    });

    renderStaffPage();

    const [firstBtn] = await screen.findAllByRole("button", { name: /olvidó su contraseña/i });
    await user.click(firstBtn);
    await user.click(await screen.findByRole("button", { name: /generar código/i }));
    await screen.findByText("123456");

    await user.click(screen.getByRole("button", { name: /copiar/i }));

    expect(writeText).toHaveBeenCalledWith("123456");
    expect(await screen.findByRole("button", { name: /copiado/i })).toBeInTheDocument();
  });

  it("API error on generate closes dialog and shows toast", async () => {
    const { toast } = await import("sonner");
    const user = userEvent.setup();
    mockApiPost.mockResolvedValue({ data: undefined, error: { detail: "Forbidden" } });

    renderStaffPage();

    const [firstBtn] = await screen.findAllByRole("button", { name: /olvidó su contraseña/i });
    await user.click(firstBtn);
    await user.click(await screen.findByRole("button", { name: /generar código/i }));

    await waitFor(() =>
      expect(
        screen.queryByText(/generar código de recuperación para/i),
      ).not.toBeInTheDocument(),
    );
    expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/error al generar código/i));
  });
});
