// server/vite.ts
import path from "path";
import fs from "fs";
import express, { type Express } from "express";
import { fileURLToPath } from "url";

// Recreate __dirname safely for ESM environments (like Node 22+)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function log(msg: string) {
  console.log(msg);
}


/**
 * Production static serving.
 * We don't import vite.config at runtime. We know Vite builds to dist/public,
 * and the compiled server runs from dist/server, so ../public is correct.
 */
export function serveStatic(app: Express) {
  // At runtime, __dirname === <project>/dist/server
  const distPath = path.resolve(import.meta.dirname, "../dist/public");
  
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}. Run "npm run build" first.`
    );
  }

  // Serve the built SPA assets
  app.use(express.static(distPath));

  // SPA fallback
  app.get("*", (_req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

/**
 * Your dev-only Vite integration can stay as-is.
 * Render runs with NODE_ENV=production, so index.ts will call serveStatic().
 */
export async function setupVite(_app: Express, _server: any) {
  // ... keep whatever you already have for local development
}
