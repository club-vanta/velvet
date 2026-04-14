import path from "path";
import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react(), tailwindcss()],
    server: {
      // Set VITE_HOST_ALL=true in .env.local (or prefix the dev command) to expose
      // the dev server on all network interfaces for LAN testing.
      host: env.VITE_HOST_ALL === "true" ? true : undefined,
      port: 5200,
      strictPort: false, // try 5201, 5202... if 5200 is taken
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    test: {
      environment: "jsdom",
      globals: true,
      setupFiles: ["./src/tests/setup.ts"],
      passWithNoTests: true,
    },
  };
});
