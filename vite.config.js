import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

function localApiRoutes() {
  const require = createRequire(import.meta.url);
  const root = process.cwd();

  return {
    name: 'local-api-routes',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        try {
          const url = new URL(req.url || '/', 'http://localhost');
          const pathname = decodeURIComponent(url.pathname || '/');
          if (!pathname.startsWith('/api/')) return next();

          // Prevent path traversal.
          if (pathname.includes('..')) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: false, error: 'Invalid path' }));
            return;
          }

          // Map `/api/foo/bar` -> `<root>/api/foo/bar.js`
          const base = pathname.endsWith('.js') ? pathname.slice(1) : `${pathname.slice(1)}.js`;
          const filePath = path.join(root, base);

          if (!fs.existsSync(filePath)) {
            res.statusCode = 404;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: false, error: `No local api handler for ${pathname}` }));
            return;
          }

          // Reload handler on every request (fast dev iteration).
          let handler;
          try {
            const resolved = require.resolve(filePath);
            delete require.cache[resolved];
            handler = require(resolved);
          } catch (e) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: false, error: `Failed to load handler: ${String(e?.message || e)}` }));
            return;
          }

          if (typeof handler !== 'function') {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: false, error: `Handler did not export a function: ${pathname}` }));
            return;
          }

          try {
            await Promise.resolve(handler(req, res));
          } catch (e) {
            // If an async handler throws, make sure we don't drop the connection
            // (which shows up as "Failed to fetch" in the browser).
            // eslint-disable-next-line no-console
            console.error(`[local-api] handler error for ${pathname}:`, e);
            if (!res.headersSent) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ ok: false, error: String(e?.message || e) }));
            } else {
              try {
                res.end();
              } catch {
                // ignore
              }
            }
          }
          return;
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error('[local-api] middleware error:', e);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: false, error: `API middleware error: ${String(e?.message || e)}` }));
        }
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Ensure `.env` is loaded into process.env for local `/api/*` handlers,
  // since they run inside the Vite dev server (Node).
  const env = loadEnv(mode, process.cwd(), '');
  Object.assign(process.env, env);

  return {
    plugins: [localApiRoutes(), tailwindcss(), react()],
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: false,
      minify: 'esbuild',
    },
    server: {
      port: 3000,
      open: true,
    },
  };
});