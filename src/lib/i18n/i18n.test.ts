import { describe, it, expect } from "vitest";
import { messageModules, translations } from "./translations";

const RECOVERY_KEYS = [
  "forgotPassword",
  "forgotPasswordTitle",
  "recoveryCodeLabel",
  "verifyCode",
  "verifying",
  "invalidRecoveryCode",
  "newPassword",
  "setNewPassword",
  "settingPassword",
  "passwordChanged",
  "forgotPasswordButton",
  "recoveryCodeDialogTitle",
  "recoveryCodeDialogBody",
  "generatingCode",
  "generateCode",
  "recoveryCodeGeneratedTitle",
  "copyCode",
  "codeCopied",
  "failedGenerateCode",
] as const;

describe("i18n — password recovery keys", () => {
  for (const key of RECOVERY_KEYS) {
    it(`EN has non-empty translation for '${key}'`, () => {
      expect(translations.en[key]).toBeTruthy();
    });

    it(`ES has non-empty translation for '${key}'`, () => {
      expect(translations.es[key]).toBeTruthy();
    });

    it(`EN and ES translations for '${key}' are different`, () => {
      expect(translations.en[key]).not.toBe(translations.es[key]);
    });
  }

  it("passwordChanged contains the {0} placeholder in EN", () => {
    expect(translations.en.passwordChanged).toContain("{0}");
  });

  it("passwordChanged contains the {0} placeholder in ES", () => {
    expect(translations.es.passwordChanged).toContain("{0}");
  });

  it("recoveryCodeGeneratedTitle contains the {0} placeholder in EN", () => {
    expect(translations.en.recoveryCodeGeneratedTitle).toContain("{0}");
  });

  it("recoveryCodeGeneratedTitle contains the {0} placeholder in ES", () => {
    expect(translations.es.recoveryCodeGeneratedTitle).toContain("{0}");
  });

  it("EN and ES objects have the same set of keys (no key missing from either language)", () => {
    const enKeys = new Set(Object.keys(translations.en));
    const esKeys = new Set(Object.keys(translations.es));
    const onlyInEN = [...enKeys].filter((k) => !esKeys.has(k));
    const onlyInES = [...esKeys].filter((k) => !enKeys.has(k));
    expect(onlyInEN, "keys present in EN but not ES").toEqual([]);
    expect(onlyInES, "keys present in ES but not EN").toEqual([]);
  });
});

describe("i18n — message modules", () => {
  it("defines every key in exactly one module", () => {
    const owners = new Map<string, string[]>();
    for (const [name, mod] of Object.entries(messageModules)) {
      for (const key of Object.keys(mod.en)) {
        owners.set(key, [...(owners.get(key) ?? []), name]);
      }
    }
    const duplicated = [...owners].filter(([, mods]) => mods.length > 1);
    expect(duplicated).toEqual([]);
  });

  it("gives every module the same keys in English and Spanish", () => {
    for (const mod of Object.values(messageModules)) {
      expect(Object.keys(mod.es).sort()).toEqual(Object.keys(mod.en).sort());
    }
  });
});
