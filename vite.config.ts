import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// PROD-SAFE Vite config.
// - root is client/ so /src/... resolves to client/src/...
// - outDir is dist/public (what your server serves).
// - Replit plugins are loaded ONLY on Replit in dev.
// - @assets points to client/src/assets (not deleted attached_assets).

export default defineConfig(async () => {
  const isDev = process.env.NODE_ENV !== "production";
  const isReplit = !!process.env.REPL_ID;

  const plugins = [react()];

  // Load Replit plugins only when actually running on Replit in dev
  if (isDev && isReplit) {
    const { default: runtimeErrorOverlay } = await import("@replit/vite-plugin-runtime-error-modal").catch(() => ({ default: null as any }));
    if (runtimeErrorOverlay) plugins.push(runtimeErrorOverlay());

    const cartographer = await import("@replit/vite-plugin-cartographer").catch(() => null);
    if (cartographer?.cartographer) plugins.push(cartographer.cartographer());

    const devBanner = await import("@replit/vite-plugin-dev-banner").catch(() => null);
    if (devBanner?.devBanner) plugins.push(devBanner.devBanner());
  }

  return {
    root: path.resolve(import.meta.dirname, "client"),
    publicDir: path.resolve(import.meta.dirname, "client/public"),
    plugins,
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "client", "src"),
        "@shared": path.resolve(import.meta.dirname, "shared"),
        // point @assets to a folder that exists in the repo
        "@assets": path.resolve(import.meta.dirname, "client", "src", "assets"),
      },
    },
  build: {
  outDir: path.resolve(import.meta.dirname, "../dist/public"),
  emptyOutDir: true,
    },
    server: {
      fs: { strict: true, deny: ["**/.*"] },
    },
  };
});
