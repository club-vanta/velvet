import { describe, expect, it } from "vitest";
import { mapUrl } from "./mapUrl";

describe("mapUrl", () => {
  it("pins the point on OpenStreetMap at street zoom", () => {
    expect(mapUrl(-34.6, -58.4)).toBe(
      "https://www.openstreetmap.org/?mlat=-34.6&mlon=-58.4#map=17/-34.6/-58.4",
    );
  });
});
