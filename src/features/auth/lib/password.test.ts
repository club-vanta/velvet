import { describe, expect, it } from "vitest";
import { translate } from "@/lib/i18n";
import { minCharsMessage, passwordLength } from "./password";

describe("passwordLength", () => {
  it("counts plain characters", () => {
    expect(passwordLength("a-very-long-password")).toBe(20);
  });

  it("counts an emoji once, as the backend does", () => {
    expect("🔑🔑".length).toBe(4);
    expect(passwordLength("🔑🔑")).toBe(2);
  });
});

describe("minCharsMessage", () => {
  it("fills in the minimum length in both languages", () => {
    expect(minCharsMessage((key) => translate("en", key))).toBe(
      "Minimum 15 characters.",
    );
    expect(minCharsMessage((key) => translate("es", key))).toBe(
      "Mínimo 15 caracteres.",
    );
  });
});
