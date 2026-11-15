import { Table, TableHeader, TableRow } from "@/components/ui/table";
import type { GuestSort } from "../lib/guestListView";
import { SortableHead } from "./SortableHead";

function mount(sort: GuestSort) {
  cy.mount(
    <Table data-cy="table">
      <TableHeader>
        <TableRow>
          <SortableHead
            col="rsvp"
            label="RSVP"
            sort={sort}
            onSort={cy.spy().as("onSort")}
          />
        </TableRow>
      </TableHeader>
    </Table>,
  );
}

describe("<SortableHead />", () => {
  it("is unsorted while another column sorts", () => {
    mount({ key: "name", dir: "asc" });
    cy.getBySel("guest-sort-rsvp").should("have.attr", "aria-sort", "none");
  });

  it("says its direction while it sorts", () => {
    mount({ key: "rsvp", dir: "desc" });
    cy.getBySel("guest-sort-rsvp").should(
      "have.attr",
      "aria-sort",
      "descending",
    );
  });

  it("asks to sort by its column, also from the keyboard", () => {
    mount({ key: "name", dir: "asc" });
    cy.getByRole("button", { name: "RSVP" }).click();
    cy.get("@onSort").should("have.been.calledOnceWith", "rsvp");
    cy.getByRole("button", { name: "RSVP" }).should("be.focused");
    cy.checkA11yAA('[data-cy="table"]');
  });
});
