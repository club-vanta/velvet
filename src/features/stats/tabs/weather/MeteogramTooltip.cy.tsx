import { MeteogramTooltip } from "./MeteogramTooltip";

const point = {
  tip: {
    title: "21:00",
    lines: [
      ["Temperature", "12.5 °C"],
      ["Feels like", "9.5 °C"],
    ] as [string, string][],
  },
};

describe("<MeteogramTooltip />", () => {
  it("shows the hovered hour and each value with its name", () => {
    cy.mount(<MeteogramTooltip active payload={[{ payload: point }]} />);
    cy.getBySel("stats-tooltip-title").should("have.text", "21:00");
    cy.getBySel("stats-tooltip-line").should(($lines) => {
      expect(
        $lines
          .toArray()
          .map((li) => Array.from(li.children, (c) => c.textContent)),
      ).to.deep.equal([
        ["Temperature", "12.5 °C"],
        ["Feels like", "9.5 °C"],
      ]);
    });
  });

  it("shows nothing when no point is hovered", () => {
    cy.mount(
      <MeteogramTooltip active={false} payload={[{ payload: point }]} />,
    );
    cy.getBySel("stats-tooltip").should("not.exist");
  });

  it("shows nothing for a point without a tip", () => {
    cy.mount(<MeteogramTooltip active payload={[{ payload: {} }]} />);
    cy.getBySel("stats-tooltip").should("not.exist");
  });

  it("has no accessibility violations", () => {
    cy.mount(<MeteogramTooltip active payload={[{ payload: point }]} />);
    cy.checkA11yAA();
  });
});
