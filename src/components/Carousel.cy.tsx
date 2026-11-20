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

  it("starts on the first slide and keeps the others out of reach", () => {
    mount();
    cy.getBySel("carousel-tab-one").should("have.attr", "aria-current", "true");
    cy.getBySel("carousel-tab-two").should("not.have.attr", "aria-current");
    cy.getBySel("carousel-previous").should("be.disabled");
    slide("one").should("not.have.attr", "inert");
    slide("two").should("have.attr", "inert");
  });

  it("moves with the arrows", () => {
    mount();
    cy.getBySel("carousel-next").click();
    track().its("0.scrollLeft").should("eq", 360);
    cy.getBySel("carousel-tab-two").should("have.attr", "aria-current", "true");
    cy.getBySel("carousel-next").should("be.disabled");
    slide("two").should("not.have.attr", "inert");
    slide("one").should("have.attr", "inert");
    cy.getByRole("button", { name: "Second action" }).should("be.visible");

    cy.getBySel("carousel-previous").click();
    track().its("0.scrollLeft").should("eq", 0);
    cy.getBySel("carousel-tab-one").should("have.attr", "aria-current", "true");
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
