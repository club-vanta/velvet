import { useState } from "react";
import {
  FilterChips,
  FilterMenu,
  ListToolbarRow,
  MenuRadios,
  ShowMoreButton,
  SortMenu,
} from "./ListToolbar";

type Key = "name" | "date";
type Sort = { key: Key; dir: "asc" | "desc" };

function SortHarness({ onSort }: { onSort: (sort: Sort) => void }) {
  const [sort, setSort] = useState<Sort>({ key: "name", dir: "asc" });
  return (
    <div className="@container">
      <ListToolbarRow search="" onSearch={() => {}}>
        <SortMenu
          sort={sort}
          onSort={(next) => {
            setSort(next);
            onSort(next);
          }}
          keys={["name", "date"]}
          label={(k) => (k === "name" ? "Name" : "Date")}
          dirLabel={(k, d) =>
            k === "name"
              ? d === "asc"
                ? "A to Z"
                : "Z to A"
              : d === "asc"
                ? "Oldest first"
                : "Newest first"
          }
        />
      </ListToolbarRow>
    </div>
  );
}

describe("<ListToolbarRow />", () => {
  it("reports what is typed in its labelled search field", () => {
    cy.mount(
      <div className="@container">
        <ListToolbarRow search="" onSearch={cy.spy().as("onSearch")}>
          <span />
        </ListToolbarRow>
      </div>,
    );
    cy.getByRole("searchbox", { name: "Search guest list…" }).type("a");
    cy.get("@onSearch").should("have.been.calledOnceWith", "a");
  });
});

describe("<FilterMenu /> and <MenuRadios />", () => {
  it("shows how many filters are on and offers the options", () => {
    cy.mount(
      <FilterMenu activeCount={2}>
        <MenuRadios
          label="Mazmo account"
          value="all"
          onChange={cy.spy().as("onChange")}
          options={[
            { value: "all", label: "All" },
            { value: "linked", label: "With Mazmo" },
          ]}
        />
      </FilterMenu>,
    );
    cy.getBySel("list-filter-count").should("have.text", "2");
    cy.getBySel("list-filter").click();
    cy.getByRole("group", { name: "Mazmo account", native: false })
      .getByRole("menuitemradio", { name: "All" })
      .should("have.attr", "aria-checked", "true");
    cy.getByRole("menuitemradio", { name: "With Mazmo" }).click();
    cy.get("@onChange").should("have.been.calledOnceWith", "linked");
  });

  it("hides the count while no filter is on", () => {
    cy.mount(
      <FilterMenu activeCount={0}>
        <span />
      </FilterMenu>,
    );
    cy.getBySel("list-filter").should("have.text", "Filter");
    cy.getBySel("list-filter-count").should("not.exist");
  });
});

describe("<SortMenu />", () => {
  beforeEach(() => {
    cy.mount(<SortHarness onSort={cy.spy().as("onSort")} />);
  });

  it("names the current sort on its button", () => {
    cy.getByRole("button", { name: /^Sort by: ?Name$/ }).should("be.visible");
  });

  it("sorts a newly picked field ascending, labelling its directions", () => {
    cy.getBySel("list-sort").click();
    cy.getByRole("menuitemradio", { name: "Date" }).click();
    cy.get("@onSort").should("have.been.calledOnceWith", {
      key: "date",
      dir: "asc",
    });
    cy.getByRole("menuitemradio", { name: "Newest first" }).click();
    cy.get("@onSort").should("have.been.calledWith", {
      key: "date",
      dir: "desc",
    });
    cy.press(Cypress.Keyboard.Keys.ESC);
    cy.getBySel("list-sort").should("have.text", "Sort by:Date");
  });

  it("opens from the keyboard", () => {
    cy.getBySel("list-sort").focus();
    cy.press(Cypress.Keyboard.Keys.DOWN);
    cy.getByRole("menu").should("be.visible");
    cy.press(Cypress.Keyboard.Keys.ESC);
    cy.getByRole("menu").should("not.exist");
    cy.focused().should("have.attr", "data-cy", "list-sort");
  });
});

describe("<FilterChips />", () => {
  it("renders nothing while the list is neither filtered nor searched", () => {
    cy.mount(
      <div data-cy="host">
        <FilterChips
          chips={[]}
          narrowed={false}
          shown={3}
          total={3}
          onClear={() => {}}
        />
      </div>,
    );
    cy.getBySel("host").should("be.empty");
  });

  it("shows the result count while searching, without Clear", () => {
    cy.mount(
      <FilterChips
        chips={[]}
        narrowed
        shown={1}
        total={3}
        onClear={() => {}}
      />,
    );
    cy.getBySel("list-count").should("have.text", "Showing 1 of 3");
    cy.getBySel("list-clear-filters").should("not.exist");
  });

  it("removes one chip or clears them all", () => {
    cy.mount(
      <FilterChips
        chips={[
          { key: "mazmo", label: "With Mazmo", onRemove: cy.spy().as("rm1") },
          { key: "vanted", label: "Vanted", onRemove: cy.spy().as("rm2") },
        ]}
        narrowed={false}
        shown={1}
        total={3}
        onClear={cy.spy().as("onClear")}
      />,
    );
    cy.getByRole("button", { name: "Remove filter: Vanted" }).click();
    cy.get("@rm2").should("have.been.calledOnce");
    cy.get("@rm1").should("not.have.been.called");
    cy.getBySel("list-clear-filters").click();
    cy.get("@onClear").should("have.been.calledOnce");
    cy.checkA11yAA();
  });
});

describe("<ShowMoreButton />", () => {
  it("renders nothing when there is nothing more", () => {
    cy.mount(
      <div data-cy="host">
        <ShowMoreButton count={0} onShowMore={() => {}} />
      </div>,
    );
    cy.getBySel("host").should("be.empty");
  });

  it("loads the next page on its own once it is near the screen", () => {
    cy.mount(<ShowMoreButton count={50} onShowMore={cy.spy().as("more")} />);
    cy.getBySel("list-show-more").should("have.text", "Show 50 more");
    cy.get("@more").should("have.been.called");
  });

  it("works by click where IntersectionObserver is missing", () => {
    cy.window().then((win) => {
      cy.stub(win, "IntersectionObserver").value(undefined);
    });
    cy.mount(<ShowMoreButton count={50} onShowMore={cy.spy().as("more")} />);
    cy.get("@more").should("not.have.been.called");
    cy.getBySel("list-show-more").click();
    cy.get("@more").should("have.been.calledOnce");
  });
});
