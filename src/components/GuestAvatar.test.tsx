import { fireEvent, render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { GuestAvatar } from "./GuestAvatar";

describe("GuestAvatar", () => {
  it("renders initials when there is no avatar", () => {
    const { container } = render(<GuestAvatar name="Cindy Dark" src={null} />);
    expect(container).toHaveTextContent("CD");
    expect(container.querySelector("img")).toBeNull();
  });

  it("uses one initial for a single-word name", () => {
    const { container } = render(<GuestAvatar name="Sol" src={null} />);
    expect(container).toHaveTextContent("S");
  });

  it("falls back to initials when the image fails to load", () => {
    const { container } = render(
      <GuestAvatar name="Juan Perez" src="https://cdn.example/broken.jpg" />,
    );
    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    fireEvent.error(img!);
    expect(container.querySelector("img")).toBeNull();
    expect(container).toHaveTextContent("JP");
  });

  it("tries again when the avatar URL changes", () => {
    const { container, rerender } = render(
      <GuestAvatar name="Juan" src="https://cdn.example/old.jpg" />,
    );
    fireEvent.error(container.querySelector("img")!);
    rerender(<GuestAvatar name="Juan" src="https://cdn.example/new.jpg" />);
    expect(container.querySelector("img")).toHaveAttribute(
      "src",
      "https://cdn.example/new.jpg",
    );
  });

  it("is exposed as an image when given alt text", () => {
    render(
      <GuestAvatar
        name="Juan"
        src="https://cdn.example/a.jpg"
        alt="Profile picture of Juan"
      />,
    );
    expect(
      screen.getByRole("img", { name: "Profile picture of Juan" }),
    ).toBeInTheDocument();
  });
});
