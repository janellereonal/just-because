import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { existsSync, readdirSync } from "node:fs";

/** Spline exports in public/models, so the 3D Bo only asks for files that exist (no 404s). */
function modelFiles(dir = "public/models", base = "/models"): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
    d.isDirectory() ? modelFiles(`${dir}/${d.name}`, `${base}/${d.name}`) : d.name.endsWith(".glb") ? [`${base}/${d.name}`] : [],
  );
}

// Builds for Vercel by default. Set NITRO_PRESET=node to run the build locally
// with `node .output/server/index.mjs`.
export default defineConfig(({ command }) => ({
  plugins: [
    tailwindcss(),
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tanstackStart({
      // src/server.ts wraps the SSR handler with a friendly error page.
      server: { entry: "server" },
      importProtection: {
        behavior: "error",
        client: { files: ["**/server/**"], specifiers: ["server-only"] },
      },
    }),
    ...(command === "build" ? [nitro({ preset: process.env["NITRO_PRESET"] || "vercel" })] : []),
    viteReact(),
  ],
  define: { __BO_MODEL_FILES__: JSON.stringify(modelFiles()) },
  css: { transformer: "lightningcss" },
  resolve: {
    alias: { "@": `${process.cwd()}/src` },
    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "@tanstack/react-query",
      "@tanstack/query-core",
    ],
  },
  server: { port: 8080 },
}));
