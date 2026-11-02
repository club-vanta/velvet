import { Check } from "lucide-react";
import { GuestStatusLine, type StatusTone } from "./GuestStatusLine";

describe("<GuestStatusLine />", () => {
  it("renders the sentence and its action", () => {
    cy.mount(
      <GuestStatusLine
        tone="done"
        data-cy="line"
        action={<button type="button">Undo</button>}
      >
        Checked in
      </GuestStatusLine>,
    );
    cy.getBySel("line").should("have.text", "Checked inUndo");
    cy.getByRole("button", { name: "Undo" }).should("be.visible");
  });

  it("hides the icon from assistive tech", () => {
    cy.mount(
      <GuestStatusLine tone="done" icon={Check} data-cy="line">
        Checked in
      </GuestStatusLine>,
    );
    cy.getBySel("line").find("svg").should("have.attr", "aria-hidden", "true");
  });

  it("exposes its id so a disabled button can point at it", () => {
    cy.mount(
      <>
        <button type="button" disabled aria-describedby="x">
          Check in
        </button>
        <GuestStatusLine tone="missing" id="x">
          Entrance fee not paid
        </GuestStatusLine>
      </>,
    );
    cy.getByRole("button", { name: "Check in" }).should(($b) =>
      expect($b[0].ownerDocument.getElementById("x")?.textContent).to.equal(
        "Entrance fee not paid",
      ),
    );
  });

  it("keeps every tone at AA contrast", () => {
    const tones: StatusTone[] = ["done", "paid", "missing", "neutral"];
    cy.mount(
      <div data-cy="tones">
        {tones.map((tone) => (
          <GuestStatusLine key={tone} tone={tone}>
            {tone}
          </GuestStatusLine>
        ))}
      </div>,
    );
    cy.checkA11yAA('[data-cy="tones"]');
  });
});
