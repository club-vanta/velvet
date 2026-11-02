import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MeteogramTooltip } from "./MeteogramTooltip";

const point = {
  tip: {
    title: "21:00",
    lines: [
      ["Temperatura", "12,5 °C"],
      ["Sensación térmica", "9,5 °C"],
    ] as [string, string][],
  },
};

describe("MeteogramTooltip", () => {
  it("shows the hovered hour and each value with its name", () => {
    render(<MeteogramTooltip active payload={[{ payload: point }]} />);
    expect(screen.getByText("21:00")).toBeInTheDocument();
    const rows = screen
      .getAllByRole("listitem")
      .map((li) => Array.from(li.children).map((c) => c.textContent));
    expect(rows).toEqual([
      ["Temperatura", "12,5 °C"],
      ["Sensación térmica", "9,5 °C"],
    ]);
  });

  it("shows nothing when no point is hovered", () => {
    const { container } = render(
      <MeteogramTooltip active={false} payload={[{ payload: point }]} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
