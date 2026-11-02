import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { LanguageProvider } from "@/lib/i18n";
import { CohortTable } from "./CohortTable";
import type { components } from "@/api/types";

type Cohort = components["schemas"]["CohortRowPublic"];

const COHORTS: Cohort[] = [
  { month: "2026-01", size: 40, retention: [0.5, 0.25, 0, 1] },
  { month: "2026-02", size: 4, retention: [0.25] },
];

function renderTable(cohorts: Cohort[] = COHORTS) {
  render(
    <LanguageProvider>
      <h2 id="cohorts-heading">Cohortes</h2>
      <CohortTable cohorts={cohorts} labelledBy="cohorts-heading" />
    </LanguageProvider>,
  );
}

function row(month: string): HTMLElement {
  return screen.getByRole("rowheader", { name: new RegExp(`^${month}`) })
    .parentElement as HTMLElement;
}

/** The retention cells of a row, "+1" first. */
const cells = (r: HTMLElement) =>
  Array.from(r.querySelectorAll<HTMLElement>('[data-slot="retention"]'));

const part = (el: HTMLElement, name: string) =>
  el.querySelector(`[data-slot="${name}"]`)?.textContent ?? null;

describe("CohortTable", () => {
  beforeEach(() => localStorage.clear());

  it("is named by its heading and has a column per month after the first", () => {
    renderTable();
    const table = screen.getByRole("table", { name: "Cohortes" });
    expect(
      within(table)
        .getAllByRole("columnheader")
        .map((th) => th.textContent),
    ).toEqual([
      "Primer mes",
      "Personas",
      "+1",
      "+2",
      "+3",
      "+4",
      "+5",
      "+6",
      "+7",
      "+8",
      "+9",
      "+10",
      "+11",
      "+12",
    ]);
    for (const th of within(table).getAllByRole("columnheader")) {
      expect(th).toHaveAttribute("scope", "col");
    }
  });

  it("labels each row by its month and shows its size and shares", () => {
    renderTable();
    const jan = row("ene 2026");
    expect(part(jan, "month")).toBe("ene 2026");
    expect(part(jan, "size")).toBe("40");
    expect(cells(jan).map((c) => c.textContent)).toEqual([
      "50%",
      "25%",
      "0%",
      "100%",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
    ]);
  });

  it("tints each share by its value, capped so the text keeps its contrast", () => {
    renderTable();
    const [half, quarter, zero, all, future] = cells(row("ene 2026"));
    const tint = (pct: number) =>
      `color-mix(in oklch, var(--chart-2) ${pct}%, transparent)`;
    expect(half.style.backgroundColor).toBe(tint(25));
    expect(quarter.style.backgroundColor).toBe(tint(13));
    expect(zero.style.backgroundColor).toBe(tint(0));
    expect(all.style.backgroundColor).toBe(tint(50));
    expect(future.style.backgroundColor).toBe("");
  });

  it("dims a cohort of fewer than 10 people without a tint, its size already in the Personas column", () => {
    renderTable();
    const feb = row("feb 2026");
    expect(feb).toHaveClass("text-muted-foreground");
    expect(within(feb).getByRole("rowheader").textContent).toBe("feb 2026");
    expect(part(feb, "size")).toBe("4");
    const [first] = cells(feb);
    expect(first.textContent).toBe("25%");
    expect(first.style.backgroundColor).toBe("");

    const jan = row("ene 2026");
    expect(jan).not.toHaveClass("text-muted-foreground");
  });

  it("keeps the month column in view while the shares scroll sideways", () => {
    renderTable();
    const table = screen.getByRole("table", { name: "Cohortes" });
    const [monthHeader] = within(table).getAllByRole("columnheader");
    expect(monthHeader).toHaveClass("sticky", "left-0", "bg-card");
    for (const th of within(table).getAllByRole("rowheader")) {
      expect(th).toHaveClass("sticky", "left-0", "bg-card");
    }
  });

  it("formats the cohort size for the locale", () => {
    renderTable([{ month: "2026-01", size: 12000, retention: [] }]);
    expect(part(row("ene 2026"), "size")).toBe("12.000");
  });
});
