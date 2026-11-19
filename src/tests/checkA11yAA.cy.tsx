// The shared cy.checkA11yAA command (cypress/support/commands/a11y.ts).
export {};
describe("cy.checkA11yAA", () => {
  it("scans once a fade-in is over, not a frame of it", () => {
    cy.mount(
      <div style={{ background: "#171717", padding: 16 }}>
        <p
          className="animate-in fade-in"
          style={{ color: "#a1a1a1", animationDuration: "1500ms" }}
        >
          Fading in
        </p>
      </div>,
    );
    cy.checkA11yAA();
  });

  it("does not wait for animations that never end", () => {
    cy.mount(
      <div style={{ background: "#ffffff", padding: 16, color: "#000000" }}>
        <span className="inline-block animate-spin">◌</span> Loading
      </div>,
    );
    cy.checkA11yAA();
  });
});
