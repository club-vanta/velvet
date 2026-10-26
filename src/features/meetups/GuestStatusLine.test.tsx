import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Check } from "lucide-react";
import { GuestStatusLine, type StatusTone } from "./GuestStatusLine";

describe("GuestStatusLine", () => {
  it("renders the sentence and the action", () => {
    render(
      <GuestStatusLine tone="done" action={<button type="button">Undo</button>}>
        Checked in
      </GuestStatusLine>,
    );
    expect(screen.getByText("Checked in")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Undo" })).toBeInTheDocument();
  });

  it("hides the icon from assistive tech", () => {
    const { container } = render(
      <GuestStatusLine tone="done" icon={Check}>
        Checked in
      </GuestStatusLine>,
    );
    expect(container.querySelector("svg")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  it("exposes its id for aria-describedby", () => {
    const { container } = render(
      <GuestStatusLine tone="missing" id="x">
        Entrance fee not paid
      </GuestStatusLine>,
    );
    expect(container.querySelector("#x")?.textContent).toBe(
      "Entrance fee not paid",
    );
  });

  it.each<[StatusTone, string]>([
    ["done", "emerald"],
    ["paid", "violet"],
    ["missing", "amber"],
  ])("tints the %s tone %s", (tone, color) => {
    const { container } = render(
      <GuestStatusLine tone={tone}>State</GuestStatusLine>,
    );
    expect((container.firstChild as HTMLElement).className).toContain(
      `bg-${color}-500/10`,
    );
  });
});
