import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { LanguageProvider } from "@/lib/i18n";
import { ReasonDialog } from "./ReasonDialog";

function renderDialog(onConfirm = vi.fn(), onClose = vi.fn()) {
  render(
    <LanguageProvider>
      <ReasonDialog
        title="Undo something?"
        placeholder="e.g. Wrong guest"
        confirmLabel="Confirm"
        pendingLabel="Confirming…"
        isPending={false}
        onConfirm={onConfirm}
        onClose={onClose}
      />
    </LanguageProvider>,
  );
  return { onConfirm, onClose };
}

describe("ReasonDialog", () => {
  it("keeps the confirm button disabled below 5 characters", async () => {
    renderDialog();
    const textarea = screen.getByRole("textbox");
    const confirmButton = screen.getByRole("button", { name: "Confirm" });

    await userEvent.type(textarea, "abcd");
    expect(confirmButton).toBeDisabled();
  });

  it("enables the confirm button at exactly 5 characters", async () => {
    renderDialog();
    const textarea = screen.getByRole("textbox");
    const confirmButton = screen.getByRole("button", { name: "Confirm" });

    await userEvent.type(textarea, "abcde");
    expect(confirmButton).toBeEnabled();
  });

  it("disables the confirm button again above 500 characters", async () => {
    renderDialog();
    const textarea = screen.getByRole("textbox");
    const confirmButton = screen.getByRole("button", { name: "Confirm" });

    await userEvent.type(textarea, "a".repeat(501));
    expect(confirmButton).toBeDisabled();
  });

  it("calls onConfirm with the trimmed reason", async () => {
    const { onConfirm } = renderDialog();
    const textarea = screen.getByRole("textbox");
    const confirmButton = screen.getByRole("button", { name: "Confirm" });

    await userEvent.type(textarea, "   a valid reason   ");
    await userEvent.click(confirmButton);
    expect(onConfirm).toHaveBeenCalledWith("a valid reason");
  });

  it("does not satisfy the minimum with whitespace-only input", async () => {
    renderDialog();
    const textarea = screen.getByRole("textbox");
    const confirmButton = screen.getByRole("button", { name: "Confirm" });

    await userEvent.type(textarea, "          ");
    expect(confirmButton).toBeDisabled();
  });
});
