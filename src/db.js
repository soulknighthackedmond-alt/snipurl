// Data layer. Uses Node's built-in SQLite (node:sqlite) so there is no native
// module to compile — identical behaviour locally and in the Fly builder image.

import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export const CODE_RE = /^[a-zA-Z0-9_-]{3,32}$/;

// Reserved paths that must never be handed out as short codes.
export const RESERVED = new Set([
  'api',
  'health',
  'favicon.ico',
  'robots.txt',
  'assets',
  'admin',
  'login',
  'logout',
  'static',
]);

const ALPHABET = '23456789abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';

export function normalizeUrl(input) {
  if (typeof input !== 'string') return null;
  const raw = input.trim();
  if (!raw || raw.length > 2048) return null;
  if (/[\s\u0000-\u001f\u007f]/.test(raw)) return null;
  const withScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(raw) ? raw : `https://${raw}`;
  let url;
  try {
    url = new URL(withScheme);
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  if (!url.hostname) return null;
  if (!url.hostname.includes('.') && url.hostname !== 'localhost') return null;
  return url.toString();
}

export function randomCode(length = 7, random = Math.random) {
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += ALPHABET[Math.floor(random() * ALPHABET.length) % ALPHABET.length];
  }
  return out;
}

export function openStore(file = ':memory:') {
  if (file !== ':memory:') mkdirSync(dirname(file), { recursive: true });
  const db = new DatabaseSync(file);

  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 5000;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS links (
      code        TEXT PRIMARY KEY,
      url         TEXT NOT NULL,
      created_at  TEXT NOT NULL,
      clicks      INTEGER NOT NULL DEFAULT 0,
      last_click  TEXT
    );

    CREATE TABLE IF NOT EXISTS visits (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      code       TEXT NOT NULL REFERENCES links(code) ON DELETE CASCADE,
      clicked_at TEXT NOT NULL,
      referer    TEXT,
      user_agent TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_visits_code_time ON visits(code, clicked_at DESC);
  `);

  const existsStmt = db.prepare('SELECT 1 FROM links WHERE code = ?');
  const insertStmt = db.prepare(
    'INSERT INTO links (code, url, created_at) VALUES (?, ?, ?)',
  );
  const findByCode = db.prepare('SELECT * FROM links WHERE code = ?');
  const listStmt = db.prepare(
    'SELECT code, url, created_at, clicks, last_click FROM links ORDER BY created_at DESC LIMIT ? OFFSET ?',
  );
  const countStmt = db.prepare('SELECT COUNT(*) AS n FROM links');
  const deleteStmt = db.prepare('DELETE FROM links WHERE code = ?');
  const bumpStmt = db.prepare(
    'UPDATE links SET clicks = clicks + 1, last_click = ? WHERE code = ?',
  );
  const visitStmt = db.prepare(
    'INSERT INTO visits (code, clicked_at, referer, user_agent) VALUES (?, ?, ?, ?)',
  );
  const statsStmt = db.prepare(
    'SELECT COUNT(*) AS total, COUNT(DISTINCT referer) AS referrers, MIN(clicked_at) AS first, MAX(clicked_at) AS last FROM visits WHERE code = ?',
  );
  const recentStmt = db.prepare(
    'SELECT clicked_at, referer, user_agent FROM visits WHERE code = ? ORDER BY clicked_at DESC, id DESC LIMIT ?',
  );
  const codeForUrl = db.prepare(
    'SELECT code FROM links WHERE url = ? ORDER BY created_at LIMIT 1',
  );

  function create({ url, code, random = Math.random } = {}) {
    const normalized = normalizeUrl(url);
    if (!normalized) {
      return { ok: false, status: 400, error: 'That does not look like a valid http(s) URL.' };
    }

    let chosen = code ? String(code).trim() : null;
    if (chosen) {
      if (!CODE_RE.test(chosen)) {
        return {
          ok: false,
          status: 400,
          error: 'Custom code must be 3-32 characters: letters, numbers, - or _.',
        };
      }
      if (RESERVED.has(chosen.toLowerCase())) {
        return { ok: false, status: 400, error: `"${chosen}" is a reserved word.` };
      }
      if (existsStmt.get(chosen)) {
        return { ok: false, status: 409, error: `"${chosen}" is already taken.` };
      }
    } else {
      const existing = codeForUrl.get(normalized);
      if (existing) {
        return { ok: true, link: findByCode.get(existing.code), existing: true };
      }
      for (let attempt = 0; attempt < 12; attempt += 1) {
        const candidate = randomCode(attempt < 8 ? 7 : 9, random);
        if (!existsStmt.get(candidate)) {
          chosen = candidate;
          break;
        }
      }
      if (!chosen) {
        return { ok: false, status: 503, error: 'Could not allocate a free code, try again.' };
      }
    }

    insertStmt.run(chosen, normalized, new Date().toISOString());
    return { ok: true, link: findByCode.get(chosen), existing: false };
  }

  function resolve(code) {
    if (typeof code !== 'string' || !CODE_RE.test(code)) return null;
    return findByCode.get(code) ?? null;
  }

  function recordVisit(code, { referer, userAgent } = {}) {
    const now = new Date().toISOString();
    const hit = referer ? String(referer).slice(0, 512) : null;
    const ua = userAgent ? String(userAgent).slice(0, 512) : null;
    db.exec('BEGIN IMMEDIATE');
    try {
      const info = bumpStmt.run(now, code);
      if (info.changes === 0) {
        db.exec('ROLLBACK');
        return false;
      }
      visitStmt.run(code, now, hit, ua);
      db.exec('COMMIT');
      return true;
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  }

  function list({ limit = 100, offset = 0 } = {}) {
    const lim = Math.min(Math.max(Number(limit) || 20, 1), 200);
    const off = Math.max(Number(offset) || 0, 0);
    return {
      total: countStmt.get().n,
      items: listStmt.all(lim, off),
    };
  }

  function stats(code) {
    const link = resolve(code);
    if (!link) return null;
    return {
      link,
      summary: statsStmt.get(code),
      recent: recentStmt.all(code, 20),
    };
  }

  function remove(code) {
    return deleteStmt.run(code).changes > 0;
  }

  function close() {
    db.close();
  }

  return { create, resolve, recordVisit, list, stats, remove, close, db };
}
