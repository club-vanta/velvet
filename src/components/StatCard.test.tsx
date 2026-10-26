import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatCard } from "./StatCard";

describe("StatCard", () => {
  it("is named by its heading when the heading has an id", () => {
    render(
      <StatCard title="Cohortes" headingId="cohorts-heading">
        <p>body</p>
      </StatCard>,
    );
    const region = screen.getByRole("region", { name: "Cohortes" });
    expect(region).toHaveAttribute("aria-labelledby", "cohorts-heading");
    expect(region).not.toHaveAttribute("aria-label");
  });

  it("is named by its title without a heading id", () => {
    render(
      <StatCard title="Pagos">
        <p>body</p>
      </StatCard>,
    );
    const region = screen.getByRole("region", { name: "Pagos" });
    expect(region).toHaveAttribute("aria-label", "Pagos");
    expect(region).not.toHaveAttribute("aria-labelledby");
  });
});
