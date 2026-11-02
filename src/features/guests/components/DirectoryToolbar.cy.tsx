import {
  DEFAULT_DIRECTORY_FILTERS,
  type DirectoryFilters,
} from "../lib/guestDirectoryView";
import { DirectoryToolbar } from "./DirectoryToolbar";

function mount(filters: DirectoryFilters = DEFAULT_DIRECTORY_FILTERS) {
  cy.mount(
    <div className="@container">
      <DirectoryToolbar
        search=""
        onSearch={cy.spy().as("onSearch")}
        filters={filters}
        onFilters={cy.spy().as("onFilters")}
        sort={{ key: "name", dir: "asc" }}
        onSort={cy.spy().as("onSort")}
        searching={false}
        shown={2}
        total={5}
      />
    </div>,
  );
}

describe("<DirectoryToolbar />", () => {
  it("sets one filter at a time, keeping the others", () => {
    mount({ ...DEFAULT_DIRECTORY_FILTERS, instagram: "with" });
    cy.getBySel("list-filter").click();
    cy.getByRole("group", { name: "Pronouns", native: false })
      .getByRole("menuitemradio", { name: "he/him" })
      .click();
    cy.get("@onFilters").should("have.been.calledOnceWith", {
      ...DEFAULT_DIRECTORY_FILTERS,
      instagram: "with",
      pronoun: "MALE",
    });
  });

  it("toggles the show-only filters", () => {
    mount();
    cy.getBySel("list-filter").click();
    cy.getByRole("menuitemcheckbox", { name: "Flagged by Mazmo" }).click();
    cy.get("@onFilters").should("have.been.calledOnceWith", {
      ...DEFAULT_DIRECTORY_FILTERS,
      mazmoFlaggedOnly: true,
    });
  });

  it("shows a chip per active filter that resets only that filter", () => {
    mount({ ...DEFAULT_DIRECTORY_FILTERS, mazmo: "linked", vantedOnly: true });
    cy.getBySel("list-filter-count").should("have.text", "2");
    cy.getBySel("list-count").should("have.text", "Showing 2 of 5");
    cy.getByRole("button", { name: "Remove filter: With Mazmo" }).click();
    cy.get("@onFilters").should("have.been.calledOnceWith", {
      ...DEFAULT_DIRECTORY_FILTERS,
      vantedOnly: true,
    });
    cy.getBySel("list-clear-filters").click();
    cy.get("@onFilters").should(
      "have.been.calledWith",
      DEFAULT_DIRECTORY_FILTERS,
    );
  });

  it("sorts by any directory field", () => {
    mount();
    cy.getBySel("list-sort").click();
    cy.getByRole("menuitemradio", { name: "Instagram" }).click();
    cy.get("@onSort").should("have.been.calledOnceWith", {
      key: "instagram",
      dir: "asc",
    });
  });

  it("passes the search up", () => {
    mount();
    cy.getBySel("list-search").type("l");
    cy.get("@onSearch").should("have.been.calledOnceWith", "l");
  });

  it("has no accessibility violations", () => {
    mount({ ...DEFAULT_DIRECTORY_FILTERS, pronoun: "FEMALE" });
    cy.getByRole("button", { name: "Remove filter: Pronouns: she/her" }).should(
      "be.visible",
    );
    cy.checkA11yAA();
  });
});
