import {
  DEFAULT_GUEST_FILTERS,
  DEFAULT_GUEST_SORT,
  type GuestFilters,
} from "../lib/guestListView";
import { GuestListToolbar } from "./GuestListToolbar";

function mount(
  filters: GuestFilters = DEFAULT_GUEST_FILTERS,
  requiresPayment = true,
  search = "",
) {
  cy.mount(
    <div className="@container" data-cy="toolbar">
      <GuestListToolbar
        search={search}
        onSearch={cy.spy().as("onSearch")}
        filters={filters}
        onFilters={cy.spy().as("onFilters")}
        sort={DEFAULT_GUEST_SORT}
        onSort={cy.spy().as("onSort")}
        requiresPayment={requiresPayment}
        shown={2}
        total={6}
      />
    </div>,
  );
}

const pick = (name: string) =>
  cy.getByRole("menuitemradio", { name, native: false }).click();

describe("<GuestListToolbar />", () => {
  it("reports what is typed in the search", () => {
    mount();
    cy.getByRole("searchbox", { name: "Search guest list…" }).type("a");
    cy.get("@onSearch").should("have.been.calledOnceWith", "a");
  });

  it("sets one filter at a time, keeping the others", () => {
    mount({ ...DEFAULT_GUEST_FILTERS, walkinOnly: true });
    cy.getByRole("button", { name: /^Filter/ }).click();
    pick("Not arrived");
    cy.get("@onFilters").should("have.been.calledOnceWith", {
      ...DEFAULT_GUEST_FILTERS,
      walkinOnly: true,
      status: "pending",
    });
  });

  it("offers the payment filter only on a paid meetup", () => {
    mount(DEFAULT_GUEST_FILTERS, false);
    cy.getByRole("button", { name: "Filter" }).click();
    cy.getByRole("menuitemradio", {
      name: "Owes payment",
      native: false,
    }).should("not.exist");
  });

  it("shows a chip per active filter with the count, and clears them", () => {
    mount({ ...DEFAULT_GUEST_FILTERS, status: "pending", type: "VENDOR" });
    cy.getByRole("button", { name: /^Filter/ }).should("contain.text", "2");
    cy.getByRole("button", { name: "Remove filter: Not arrived" }).click();
    cy.get("@onFilters").should("have.been.calledOnceWith", {
      ...DEFAULT_GUEST_FILTERS,
      type: "VENDOR",
    });
    cy.getBySel("toolbar").should("contain.text", "Showing 2 of 6");
    cy.getByRole("button", { name: "Clear filters" }).click();
    cy.get("@onFilters").should("have.been.calledWith", DEFAULT_GUEST_FILTERS);
    cy.checkA11yAA('[data-cy="toolbar"]');
  });

  it("ignores a payment filter left over from a paid meetup", () => {
    mount({ ...DEFAULT_GUEST_FILTERS, payment: "unpaid" }, false);
    cy.getByRole("button", { name: "Filter" }).should("be.visible");
    cy.getByRole("button", { name: /^Remove filter/ }).should("not.exist");
  });

  it("sorts by a field, then by direction", () => {
    mount();
    cy.getByRole("button", { name: /^Sort by/ }).click();
    pick("Arrival order");
    cy.get("@onSort").should("have.been.calledOnceWith", {
      key: "arrival",
      dir: "asc",
    });
  });

  it("names the directions after the field", () => {
    mount();
    cy.getByRole("button", { name: /^Sort by/ }).click();
    cy.getByRole("menuitemradio", { name: "A to Z", native: false }).should(
      "have.attr",
      "aria-checked",
      "true",
    );
    pick("Z to A");
    cy.get("@onSort").should("have.been.calledOnceWith", {
      key: "name",
      dir: "desc",
    });
  });
});
