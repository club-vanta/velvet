import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { InputWithPrefix } from "./input-with-prefix";

describe("InputWithPrefix", () => {
  it("renders the prefix text", () => {
    render(<InputWithPrefix prefix="@" placeholder="username" />);
    expect(screen.getByText("@")).toBeInTheDocument();
  });

  it("renders the input with the given placeholder", () => {
    render(<InputWithPrefix prefix="@" placeholder="username" />);
    expect(screen.getByPlaceholderText("username")).toBeInTheDocument();
  });

  it("the prefix element is not an input — it cannot be typed into", () => {
    render(<InputWithPrefix prefix="@" placeholder="username" />);
    // Only one input in the DOM
    expect(screen.getAllByRole("textbox")).toHaveLength(1);
  });

  it("forwards value and onChange to the input", async () => {
    const onChange = vi.fn();
    render(<InputWithPrefix prefix="@" placeholder="username" value="" onChange={onChange} />);
    await userEvent.type(screen.getByPlaceholderText("username"), "a");
    expect(onChange).toHaveBeenCalled();
  });

  it("forwards the disabled prop to the input", () => {
    render(<InputWithPrefix prefix="@" placeholder="username" disabled />);
    expect(screen.getByPlaceholderText("username")).toBeDisabled();
  });
});
