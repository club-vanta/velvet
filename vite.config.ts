import { fileURLToPath } from "node:url";
import { configDefaults, defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import istanbul from "vite-plugin-istanbul";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [
      react(),
      // React Compiler: memoizes components and hooks at build time, so a
      // keystroke in a search box doesn't re-render every row of a list.
      babel({ presets: [reactCompilerPreset()] }),
      tailwindcss(),
      // Code coverage for Cypress runs: instruments src/ only when
      // VITE_COVERAGE=true (the cy:coverage scripts set it).
      istanbul({
        include: "src/*",
        exclude: [
          "node_modules",
          "src/**/*.test.{ts,tsx}",
          "src/**/*.cy.tsx",
          "src/tests/**",
          "src/api/types.ts",
        ],
        extension: [".ts", ".tsx"],
        requireEnv: true,
      }),
    ],
    server: {
      // Set VITE_HOST_ALL=true in .env.local (or prefix the dev command) to expose
      // the dev server on all network interfaces for LAN testing.
      host: env.VITE_HOST_ALL === "true" ? true : undefined,
      port: 5200,
      strictPort: false, // try 5201, 5202... if 5200 is taken
    },
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
    test: {
      environment: "jsdom",
      globals: true,
      setupFiles: ["./src/tests/setup.ts"],
      passWithNoTests: true,
      // Agent worktrees live in .claude/worktrees; their tests are not ours.
      exclude: [...configDefaults.exclude, ".claude/**"],
      coverage: {
        provider: "istanbul",
        include: ["src/**/*.{ts,tsx}"],
        exclude: [
          "src/**/*.test.{ts,tsx}",
          "src/**/*.cy.tsx",
          "src/tests/**",
          "src/api/types.ts",
        ],
        reporter: ["json", "text-summary", "html"],
        reportsDirectory: "coverage/unit",
      },
    },
  };
});
