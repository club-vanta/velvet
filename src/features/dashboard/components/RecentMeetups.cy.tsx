import { makeMeetup } from "@/tests/factories";
import { RecentMeetups } from "./RecentMeetups";

type Props = Parameters<typeof RecentMeetups>[0];

function mountList(props: Partial<Props>) {
  cy.mount(
    <div className="@container">
      <RecentMeetups
        meetups={[]}
        isLoading={false}
        isError={false}
        onRetry={cy.spy().as("onRetry")}
        {...props}
      />
    </div>,
  );
}

describe("<RecentMeetups />", () => {
  it("links each meetup to its page", () => {
    mountList({
      meetups: [
        makeMeetup({ id: "m-2", name: "Alter #2" }),
        makeMeetup({ id: "m-1", name: "Alter #1" }),
      ],
    });
    cy.getByRole("heading", { name: "Recent meetups" }).should("be.visible");
    cy.getByRole("link", { name: "Alter #2" }).should(
      "have.attr",
      "href",
      "/meetups/m-2",
    );
    cy.getByRole("link", { name: "Alter #1" }).should("be.visible");
  });

  it("shows placeholders while loading", () => {
    mountList({ isLoading: true });
    cy.getBySel("dashboard-meetups-loading").should("be.visible");
    cy.getBySel("dashboard-meetups-empty").should("not.exist");
  });

  it("says so when there are no meetups", () => {
    mountList({});
    cy.getBySel("dashboard-meetups-empty").should(
      "have.text",
      "No meetups yet.",
    );
  });

  it("shows the error, not the empty message, and retries", () => {
    mountList({ isError: true });
    cy.getBySel("dashboard-meetups-empty").should("not.exist");
    cy.getBySel("dashboard-meetups-error").within(() => {
      cy.getByRole("button", { name: "Retry" }).click();
    });
    cy.get("@onRetry").should("have.been.calledOnce");
  });

  it("has no accessibility violations", () => {
    mountList({ isError: true });
    cy.checkA11yAA();
  });
});
