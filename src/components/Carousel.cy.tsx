import { useState } from "react";
import { Carousel, type CarouselSlide } from "./Carousel";

const SLIDES: CarouselSlide[] = [
  {
    id: "one",
    label: "One",
    content: <button type="button">First action</button>,
  },
  {
    id: "two",
    label: "Two",
    content: <button type="button">Second action</button>,
  },
];

function mount(slides = SLIDES) {
  cy.mount(
    <div style={{ width: 360 }}>
      <Carousel label="Summary" slides={slides} data-cy="carousel" />
    </div>,
  );
}

/** Drops to one slide and back, as the meetup page does when guests go and come. */
function Remounting() {
  const [both, setBoth] = useState(true);
  return (
    <div style={{ width: 360 }}>
      <button type="button" data-cy="toggle" onClick={() => setBoth(!both)}>
        toggle
      </button>
      <Carousel label="Summary" slides={both ? SLIDES : [SLIDES[1]]} />
    </div>
  );
}

const slide = (id: string) => cy.getBySel(`carousel-slide-${id}`);
const track = () => slide("one").parent();

describe("<Carousel />", () => {
  it("names itself and its slides for screen readers", () => {
    mount();
    cy.getByRole("region", { name: "Summary" }).should(
      "have.attr",
      "aria-roledescription",
      "carousel",
    );
    cy.getByRole("group", { name: "One", native: false }).should(
      "have.attr",
      "aria-roledescription",
      "slide",
    );
    cy.checkA11yAA();
  });

  it("starts on the first slide", () => {
    mount();
    cy.getBySel("carousel-tab-one").should("have.attr", "aria-current", "true");
    cy.getBySel("carousel-tab-two").should("not.have.attr", "aria-current");
    cy.getBySel("carousel-previous").should(
      "have.attr",
      "aria-disabled",
      "true",
    );
  });

  it("moves with the arrows, keeping focus on the arrow at the end", () => {
    mount();
    cy.getBySel("carousel-next").focus();
    cy.getBySel("carousel-next").click();
    track().its("0.scrollLeft").should("eq", 360);
    cy.getBySel("carousel-tab-two").should("have.attr", "aria-current", "true");
    cy.getBySel("carousel-next")
      .should("have.attr", "aria-disabled", "true")
      .and("have.focus");
    cy.getByRole("button", { name: "Second action" }).should("be.visible");

    // Pressing it again at the end does nothing.
    cy.getBySel("carousel-next").click();
    track().its("0.scrollLeft").should("eq", 360);

    cy.getBySel("carousel-previous").click();
    track().its("0.scrollLeft").should("eq", 0);
    cy.getBySel("carousel-tab-one").should("have.attr", "aria-current", "true");
  });

  it("brings a slide into view when focus moves into it", () => {
    mount();
    cy.getByRole("button", { name: "Second action" }).focus();
    cy.getBySel("carousel-tab-two").should("have.attr", "aria-current", "true");
  });

  it("starts a track that comes back on its first slide", () => {
    cy.mount(<Remounting />);
    cy.getBySel("carousel-tab-two").click();
    cy.getBySel("carousel-tab-two").should("have.attr", "aria-current", "true");
    cy.getBySel("toggle").click();
    cy.getBySel("carousel-next").should("not.exist");
    cy.getBySel("toggle").click();
    cy.getBySel("carousel-tab-one").should("have.attr", "aria-current", "true");
    track().its("0.scrollLeft").should("eq", 0);
  });

  it("jumps to a slide from its tab", () => {
    mount();
    cy.getBySel("carousel-tab-two").click();
    cy.getBySel("carousel-tab-two").should("have.attr", "aria-current", "true");
  });

  it("follows a swipe", () => {
    mount();
    track().scrollTo(360, 0);
    cy.getBySel("carousel-tab-two").should("have.attr", "aria-current", "true");
  });

  it("renders a single slide on its own, with no controls", () => {
    mount([SLIDES[0]]);
    cy.getByRole("button", { name: "First action" }).should("be.visible");
    cy.getBySel("carousel").should("not.exist");
    cy.getBySel("carousel-next").should("not.exist");
  });
});
