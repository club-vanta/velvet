import { makeGuestRowContext, makeMeetupGuest } from "@/tests/factories";
import { DEFAULT_GUEST_SORT } from "../lib/guestListView";
import { GuestList } from "./GuestList";

const LUNA = makeMeetupGuest({ guest: { id: "g-luna" } });

type Props = Partial<React.ComponentProps<typeof GuestList>>;

function mount(props: Props = {}) {
  cy.mount(
    <div className="@container">
      <GuestList
        guests={[LUNA]}
        total={1}
        loading={false}
        loaded
        searching={false}
        ctx={makeGuestRowContext()}
        sort={DEFAULT_GUEST_SORT}
        onSort={cy.spy().as("onSort")}
        {...props}
      />
    </div>,
  );
}

describe("<GuestList />", () => {
  it("is a sortable table on wide screens", () => {
    cy.viewport(1280, 800);
    mount();
    cy.getBySel("guest-table").should("be.visible");
    cy.getBySel("guest-cards").should("not.exist");
    cy.getBySel("guest-row-g-luna").should("be.visible");
    cy.getBySel("guest-sort-name").should(
      "have.attr",
      "aria-sort",
      "ascending",
    );
    cy.getByRole("button", { name: "RSVP" }).click();
    cy.get("@onSort").should("have.been.calledOnceWith", "rsvp");
  });

  it("is a labelled list of cards on phones", () => {
    cy.viewport(375, 812);
    mount();
    cy.getBySel("guest-table").should("not.exist");
    cy.getBySel("guest-cards")
      .should("have.attr", "aria-label", "Guest list")
      .findBySel("guest-row-g-luna")
      .should("be.visible");
    cy.checkA11yAA('[data-cy="guest-cards"]');
  });

  it("shows placeholder rows while loading, and no empty message", () => {
    cy.viewport(1280, 800);
    mount({ guests: [], total: 0, loading: true, loaded: false });
    cy.getBySel("guest-list-loading").should("have.length", 5);
    cy.getBySel("guest-list-empty").should("not.exist");
  });

  it("asks for a sync when the meetup has nobody", () => {
    mount({ guests: [], total: 0 });
    cy.getBySel("guest-list-empty").should(
      "have.text",
      "No guests yet. Sync from Mazmo to load the RSVP list.",
    );
  });

  it("tells a search with no match from filters with no match", () => {
    mount({ guests: [], total: 3, searching: true });
    cy.getBySel("guest-list-empty").should(
      "have.text",
      "No guests match that search.",
    );
    mount({ guests: [], total: 3 });
    cy.getBySel("guest-list-empty").should(
      "have.text",
      "No guests match these filters.",
    );
  });

  it("says nothing about an empty list when the load failed", () => {
    mount({ guests: [], total: 0, loaded: false });
    cy.getBySel("guest-list-empty").should("not.exist");
  });

  it("has no accessibility violations as a table", () => {
    cy.viewport(1280, 800);
    mount({ ctx: makeGuestRowContext({ requiresPayment: true }) });
    cy.checkA11yAA('[data-cy="guest-table"]');
  });
});
