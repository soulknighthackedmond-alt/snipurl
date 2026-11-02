// SnipURL server — a small URL shortener with click stats, ready for Fly.io.
// Zero runtime dependencies: Node's built-in http + node:sqlite.

import http from 'node:http';
import { openStore, RESERVED, CODE_RE } from './db.js';
import {
  json,
  html,
  readJson,
  esc,
  absoluteBase,
  serializeCookie,
  parseCookies,
} from './http.js';
import {
  homePage,
  dashboardPage,
  statsPage,
  docsPage,
  notFoundPage,
} from './pages.js';

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const DB_FILE = process.env.DATABASE_PATH || ':memory:';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';
const BASE_URL = (process.env.BASE_URL || '').replace(/\/+$/, '');

const store = openStore(DB_FILE);

function requireAdmin(req) {
  if (!ADMIN_TOKEN) return true; // auth disabled when no token configured
  return req.headers['x-admin-token'] === ADMIN_TOKEN;
}

const server = http.createServer(async (req, res) => {
  const method = req.method || 'GET';
  const parsed = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const path = decodeURIComponent(parsed.pathname).replace(/\/+/g, '/');
  const base = absoluteBase(req, BASE_URL);

  try {
    // --- health ---
    if (path === '/health') {
      return json(res, 200, { ok: true, status: 'ok', uptime: process.uptime() });
    }

    if (path === '/robots.txt') {
      res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' });
      return res.end('User-agent: *\nAllow: /\nDisallow: /api\nDisallow: /dashboard\n');
    }

    // --- API routes ---
    if (path === '/api/links' && method === 'POST') {
      const body = await readJson(req);
      const result = store.create({ url: body.url, code: body.code });
      if (!result.ok) return json(res, result.status, { ok: false, error: result.error });
      return json(res, result.existing ? 200 : 201, {
        ok: true,
        code: result.link.code,
        url: result.link.url,
        shortUrl: `${base}/${result.link.code}`,
        createdAt: result.link.created_at,
        existing: Boolean(result.existing),
      });
    }

    if (path === '/api/links' && method === 'GET') {
      const limit = Number(parsed.searchParams.get('limit')) || 50;
      const offset = Number(parsed.searchParams.get('offset')) || 0;
      const links = store.list({ limit, offset });
      return json(res, 200, {
        ok: true,
        total: links.total,
        items: links.items.map((l) => ({
          code: l.code,
          url: l.url,
          clicks: l.clicks,
          createdAt: l.created_at,
          lastClick: l.last_click,
          shortUrl: `${base}/${l.code}`,
        })),
      });
    }

    // --- pages ---
    if (path === '/' && method === 'GET') {
      const links = store.list({ limit: 8, offset: 0 });
      return html(res, 200, homePage({ base, links }));
    }

    if (path === '/dashboard' && method === 'GET') {
      const perPage = 20;
      const page = Math.max(1, Number(parsed.searchParams.get('page')) || 1);
      const links = store.list({ limit: perPage, offset: (page - 1) * perPage });
      return html(res, 200, dashboardPage({ links, page, perPage, base }));
    }

    if (path === '/api/docs' && method === 'GET') {
      return html(res, 200, docsPage({ base }));
    }

    // /api/links/:code/stats  OR  /stats/:code (page)
    let m = path.match(/^\/api\/links\/([^/]+)\/stats$/);
    if (m && method === 'GET') {
      const stats = store.stats(m[1]);
      if (!stats) return json(res, 404, { ok: false, error: 'Link not found.' });
      return json(res, 200, {
        ok: true,
        link: {
          code: stats.link.code,
          url: stats.link.url,
          clicks: stats.link.clicks,
          createdAt: stats.link.created_at,
          lastClick: stats.link.last_click,
        },
        summary: stats.summary,
        recent: stats.recent.map((v) => ({
          clickedAt: v.clicked_at,
          referer: v.referer,
          userAgent: v.user_agent,
        })),
      });
    }

    m = path.match(/^\/stats\/([^/]+)$/);
    if (m && method === 'GET') {
      const stats = store.stats(m[1]);
      if (!stats) return html(res, 404, notFoundPage());
      return html(res, 200, statsPage({ stats, base }));
    }

    // DELETE /api/links/:code
    m = path.match(/^\/api\/links\/([^/]+)$/);
    if (m && method === 'DELETE') {
      if (!requireAdmin(req)) {
        return json(res, 401, { ok: false, error: 'Missing or invalid x-admin-token header.' });
      }
      const removed = store.remove(m[1]);
      if (!removed) return json(res, 404, { ok: false, error: 'Link not found.' });
      return json(res, 200, { ok: true, deleted: m[1] });
    }

    // --- redirect: /:code ---
    const redirect = path.match(/^\/([^/]+)$/);
    if (redirect && method === 'GET') {
      const code = redirect[1];
      if (RESERVED.has(code.toLowerCase()) || code.includes('.')) {
        return html(res, 404, notFoundPage());
      }
      if (CODE_RE.test(code)) {
        const link = store.resolve(code);
        if (link) {
          store.recordVisit(code, {
            referer: req.headers.referer,
            userAgent: req.headers['user-agent'],
          });
          res.writeHead(302, {
            location: link.url,
            'cache-control': 'no-store',
            'referrer-policy': 'no-referrer-when-downgrade',
          });
          return res.end();
        }
      }
      return html(res, 404, notFoundPage());
    }

    return method === 'GET' || method === 'HEAD'
      ? html(res, 404, notFoundPage())
      : json(res, 405, { ok: false, error: `Method ${method} not allowed.` });
  } catch (err) {
    const status = err.status || 500;
    if (status >= 500) console.error('[error]', err);
    if (req.url && req.url.startsWith('/api')) {
      return json(res, status, { ok: false, error: err.message || 'Unexpected error.' });
    }
    return html(res, status, notFoundPage());
  }
});

server.listen(PORT, HOST, () => {
  console.log(`SnipURL listening on http://${HOST}:${PORT} (db: ${DB_FILE})`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    console.log(`\n${signal} received, shutting down.`);
    server.close(() => {
      store.close();
      process.exit(0);
    });
    setTimeout(() => process.exit(0), 5000).unref();
  });
}

export default server;
