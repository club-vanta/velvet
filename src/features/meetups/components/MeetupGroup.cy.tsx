import { makeMeetup } from "@/tests/factories";
import { MeetupGroup } from "./MeetupGroup";

const MEETUPS = [
  makeMeetup({ id: "m-1", name: "Alter #40" }),
  makeMeetup({ id: "m-2", name: "Alter #41" }),
];

describe("<MeetupGroup />", () => {
  it("is a region named by its title, with the count", () => {
    cy.mount(<MeetupGroup title="Past" meetups={MEETUPS} data-cy="group" />);
    cy.getByRole("region", { name: "Past (2)" }).should("be.visible");
    cy.getBySelLike("meetup-row-").should("have.length", 2);
    cy.checkA11yAA('[data-cy="group"]');
  });

  it("is one untitled list for a picked sort", () => {
    cy.mount(<MeetupGroup meetups={MEETUPS} data-cy="group" />);
    cy.getBySel("group").should("not.have.attr", "aria-labelledby");
    cy.getBySelLike("meetup-row-").should("have.length", 2);
  });

  it("renders nothing without meetups", () => {
    cy.mount(<MeetupGroup title="Past" meetups={[]} data-cy="group" />);
    cy.getBySel("group").should("not.exist");
  });
});
