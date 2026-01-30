const fs = require('node:fs');
const path = require('node:path');

function getPathSegments(req) {
  // Vercel dynamic routes often populate req.query.<param>.
  const qp = req && typeof req === 'object' ? req.query : null;
  const fromQuery = qp && qp.path != null ? qp.path : null;
  if (fromQuery) return Array.isArray(fromQuery) ? fromQuery.map(String) : [String(fromQuery)];

  const url = new URL(req.url || '/', 'http://localhost');
  const pathname = decodeURIComponent(url.pathname || '/');
  const trimmed = pathname.startsWith('/api/') ? pathname.slice('/api/'.length) : pathname.replace(/^\//, '');
  if (!trimmed) return [];
  return trimmed.split('/').filter(Boolean);
}

module.exports = async function handler(req, res) {
  const segments = getPathSegments(req);
  if (segments.some((s) => s.includes('..'))) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: false, error: 'Invalid path' }));
    return;
  }

  const rel = segments.join('/');
  const base = rel ? `${rel}.js` : 'health.js';
  const filePath = path.join(process.cwd(), 'server', 'api', base);

  if (!fs.existsSync(filePath)) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: false, error: `No api handler for /api/${rel}` }));
    return;
  }

  // Load handler (cached by default in serverless runtime).
  // For local dev, the Vite middleware clears require cache on each request.
  let fn;
  try {
    // eslint-disable-next-line global-require, import/no-dynamic-require
    fn = require(filePath);
  } catch (e) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: false, error: `Failed to load handler: ${String(e?.message || e)}` }));
    return;
  }

  if (typeof fn !== 'function') {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: false, error: `Handler did not export a function: /api/${rel}` }));
    return;
  }

  try {
    await Promise.resolve(fn(req, res));
  } catch (e) {
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
};

