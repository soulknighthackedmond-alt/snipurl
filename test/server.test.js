// End-to-end tests that boot the real server on an ephemeral port with an
// in-memory database, hit every endpoint, and assert the behaviour.

import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { rmSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(fileURLToPath(new URL('..', import.meta.url)));

function startServer(env) {
  return new Promise((resolve, reject) => {
    const proc = spawn(process.execPath, ['--experimental-sqlite', 'src/server.js'], {
      cwd: ROOT,
      env: { ...process.env, ...env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let log = '';
    proc.stdout.on('data', (d) => { log += d; });
    proc.stderr.on('data', (d) => { log += d; });
    const timer = setInterval(() => {
      const m = log.match(/listening on http:\/\/[^ ]+:(\d+)/);
      if (m) {
        clearInterval(timer);
        resolve({ proc, port: Number(m[1]), getLog: () => log });
      }
    }, 100);
    setTimeout(() => {
      clearInterval(timer);
      proc.kill('SIGKILL');
      reject(new Error(`server failed to start:\n${log}`));
    }, 15000).unref();
  });
}

async function fetchJson(port, path, opts = {}) {
  const res = await fetch(`http://127.0.0.1:${port}${path}`, opts);
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body, headers: res.headers };
}

test('health, create, redirect, stats, list, delete', async () => {
  const { proc, port } = await startServer({ PORT: '0', DATABASE_PATH: ':memory:' });
  try {
    // health
    let out = await fetchJson(port, '/health');
    assert.equal(out.status, 200);
    assert.equal(out.body.ok, true);

    // create without code
    out = await fetchJson(port, '/api/links', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com/long/path' }),
    });
    assert.equal(out.status, 201);
    assert.equal(out.body.ok, true);
    assert.match(out.body.code, /^[a-zA-Z0-9_-]{7,9}$/);
    assert.equal(out.body.url, 'https://example.com/long/path');
    const code = out.body.code;

    // same URL returns the same link
    out = await fetchJson(port, '/api/links', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url: 'example.com/long/path' }),
    });
    assert.equal(out.status, 200);
    assert.equal(out.body.code, code);
    assert.equal(out.body.existing, true);

    // custom code
    out = await fetchJson(port, '/api/links', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url: 'https://fly.io', code: 'fly-docs' }),
    });
    assert.equal(out.status, 201);
    assert.equal(out.body.code, 'fly-docs');

    // duplicate custom code -> 409
    out = await fetchJson(port, '/api/links', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url: 'https://fly.io/docs', code: 'fly-docs' }),
    });
    assert.equal(out.status, 409);

    // reserved word rejected
    out = await fetchJson(port, '/api/links', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url: 'https://x.com', code: 'health' }),
    });
    assert.equal(out.status, 400);

    // bad URL rejected
    out = await fetchJson(port, '/api/links', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url: 'not a url' }),
    });
    assert.equal(out.status, 400);

    // redirect works and counts
    const red = await fetch(`http://127.0.0.1:${port}/${code}`, { redirect: 'manual' });
    assert.equal(red.status, 302);
    assert.equal(red.headers.get('location'), 'https://example.com/long/path');
    await red.arrayBuffer();

    // stats reflect the click
    out = await fetchJson(port, `/api/links/${code}/stats`);
    assert.equal(out.status, 200);
    assert.equal(out.body.summary.total, 1);

    // list includes both
    out = await fetchJson(port, '/api/links?limit=10');
    assert.equal(out.body.total, 2);
    assert(out.body.items.some((i) => i.code === 'fly-docs'));

    // pages render
    for (const p of ['/', '/dashboard', `/stats/${code}`, '/api/docs', '/nope-does-not-exist']) {
      const page = await fetch(`http://127.0.0.1:${port}${p}`);
      assert.equal(page.status, p.includes('nope') ? 404 : 200, `page ${p}`);
      const text = await page.text();
      assert(text.includes('<!doctype html>'), `page ${p} is html`);
    }

    // delete
    out = await fetchJson(port, `/api/links/${code}`, { method: 'DELETE' });
    assert.equal(out.status, 200);
    assert.equal(out.body.ok, true);

    // redirect now 404s
    const gone = await fetch(`http://127.0.0.1:${port}/${code}`, { redirect: 'manual' });
    assert.equal(gone.status, 404);
    await gone.arrayBuffer();
  } finally {
    proc.kill('SIGTERM');
    await delay(200);
  }
});

test('persistent file database survives restart', async () => {
  const dir = join(ROOT, '.tmp-test-db');
  const file = join(dir, 'links.db');
  const env = { PORT: '0', DATABASE_PATH: file };

  const first = await startServer(env);
  let out = await fetchJson(first.port, '/api/links', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ url: 'https://example.com/persist', code: 'persist-me' }),
  });
  assert.equal(out.status, 201);
  first.proc.kill('SIGTERM');
  await delay(400);

  const second = await startServer(env);
  try {
    out = await fetchJson(second.port, '/api/links/persist-me/stats');
    assert.equal(out.status, 200);
    assert.equal(out.body.link.code, 'persist-me');
  } finally {
    second.proc.kill('SIGTERM');
    await delay(200);
    try { rmSync(dir, { recursive: true, force: true }); } catch {}
  }
});
