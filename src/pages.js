import { style, script } from './styles.js';
import { esc } from './http.js';

function layout({ title, body, inlineScript = '' }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)}</title>
<meta name="description" content="SnipURL - a small URL shortener with click stats." />
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>&#128279;</text></svg>" />
<style>${style}</style>
</head>
<body>
<header class="top">
  <a class="brand" href="/">Snip<span>URL</span></a>
  <nav>
    <a href="/">Shorten</a>
    <a href="/dashboard">Dashboard</a>
    <a href="/api/docs">API</a>
  </nav>
</header>
<main>
${body}
</main>
<footer class="foot">
  <span>SnipURL &middot; Node ${esc(process.version)} &middot; SQLite</span>
  <a href="https://fly.io" rel="noreferrer noopener" target="_blank">Runs on Fly.io</a>
</footer>
<script>${script}</script>
${inlineScript ? `<script>${inlineScript}</script>` : ''}
</body>
</html>`;
}

export function homePage({ base, links }) {
  const rows = links.items
    .map(
      (l) => `<tr>
  <td><a class="short" href="/${esc(l.code)}" data-path="/${esc(l.code)}">/${esc(l.code)}</a></td>
  <td class="url" title="${esc(l.url)}">${esc(l.url)}</td>
  <td class="num">${Number(l.clicks).toLocaleString('en-US')}</td>
  <td class="when">${esc((l.created_at || '').slice(0, 10))}</td>
</tr>`,
    )
    .join('\n');

  const body = `
<section class="hero">
  <h1>Short links, long on detail.</h1>
  <p class="sub">Paste a URL, get a short link, watch the clicks come in.</p>

  <form id="shorten-form" class="card" autocomplete="off">
    <label class="field">
      <span>Long URL</span>
      <input id="url" name="url" type="text" placeholder="https://example.com/a/really/long/path" required />
    </label>
    <label class="field small">
      <span>Custom code <em>(optional)</em></span>
      <input id="code" name="code" type="text" placeholder="my-link" maxlength="32" pattern="[A-Za-z0-9_-]{3,32}" />
    </label>
    <button type="submit">Shorten</button>
    <p id="form-msg" class="msg" role="status" aria-live="polite"></p>
  </form>

  <div id="result" class="result" hidden>
    <span class="result-label">Your link</span>
    <a id="result-url" href="#" target="_blank" rel="noopener"></a>
    <button id="copy" type="button" class="ghost">Copy</button>
  </div>
</section>

<section class="list">
  <div class="list-head">
    <h2>Recent links</h2>
    <a class="more" href="/dashboard">All ${Number(links.total).toLocaleString('en-US')} &rarr;</a>
  </div>
  ${
    links.items.length
      ? `<table>
    <thead><tr><th>Short</th><th>Destination</th><th class="num">Clicks</th><th>Created</th></tr></thead>
    <tbody>
${rows}
    </tbody>
  </table>`
      : `<p class="empty">No links yet. Yours will show up here.</p>`
  }
</section>
<p class="base-hint">Served from <code>${esc(base)}</code></p>
`;

  return layout({ title: 'SnipURL - short links with click stats', body });
}

export function dashboardPage({ links, page, perPage, base }) {
  const totalPages = Math.max(1, Math.ceil(links.total / perPage));
  const rows = links.items
    .map((l) => {
      const sparkMax = 1;
      return `<tr>
  <td><a class="short" href="/${esc(l.code)}">/${esc(l.code)}</a></td>
  <td class="url" title="${esc(l.url)}">${esc(l.url)}</td>
  <td class="num"><a href="/stats/${esc(l.code)}">${Number(l.clicks).toLocaleString('en-US')}</a></td>
  <td class="when">${esc((l.last_click || '-').replace('T', ' ').slice(0, 16))}</td>
  <td class="actions">
    <button class="ghost" data-copy="${esc(`${base}/${l.code}`)}" title="Copy short link">Copy</button>
    <button class="ghost danger" data-delete="/${esc(l.code)}" title="Delete link">Delete</button>
    <span class="spark" data-max="${sparkMax}"></span>
  </td>
</tr>`;
    })
    .join('\n');

  const pager = [];
  if (page > 1) pager.push(`<a href="/dashboard?page=${page - 1}">&larr; Newer</a>`);
  if (page < totalPages) pager.push(`<a href="/dashboard?page=${page + 1}">Older &rarr;</a>`);

  const body = `
<section class="list wide">
  <div class="list-head">
    <h2>Dashboard</h2>
    <span class="count">${Number(links.total).toLocaleString('en-US')} link${links.total === 1 ? '' : 's'} &middot; page ${page} / ${totalPages}</span>
  </div>
  ${
    links.items.length
      ? `<table>
    <thead><tr><th>Short</th><th>Destination</th><th class="num">Clicks</th><th>Last click</th><th></th></tr></thead>
    <tbody>
${rows}
    </tbody>
  </table>`
      : `<p class="empty">Nothing here yet. <a href="/">Create the first link</a>.</p>`
  }
  <nav class="pager">${pager.join('')}</nav>
</section>
`;

  return layout({ title: 'Dashboard - SnipURL', body });
}

export function statsPage({ stats, base }) {
  const { link, summary, recent } = stats;
  const visits = recent
    .map(
      (v) => `<tr>
  <td class="when">${esc(v.clicked_at.replace('T', ' ').slice(0, 19))}</td>
  <td class="url">${v.referer ? esc(v.referer) : '<span class="muted">direct</span>'}</td>
  <td class="url muted">${v.user_agent ? esc(v.user_agent) : '-'}</td>
</tr>`,
    )
    .join('\n');

  const body = `
<section class="list wide">
  <p class="crumbs"><a href="/dashboard">&larr; Dashboard</a></p>
  <div class="list-head">
    <h2>/${esc(link.code)}</h2>
    <a class="more" href="/${esc(link.code)}" target="_blank" rel="noopener">Open &rarr;</a>
  </div>
  <p class="dest">${esc(link.url)}</p>
  <div class="tiles">
    <div class="tile"><span>Clicks</span><strong>${Number(summary.total).toLocaleString('en-US')}</strong></div>
    <div class="tile"><span>Distinct referrers</span><strong>${Number(summary.referrers).toLocaleString('en-US')}</strong></div>
    <div class="tile"><span>First click</span><strong>${summary.first ? esc(summary.first.replace('T', ' ').slice(0, 16)) : '-'}</strong></div>
    <div class="tile"><span>Last click</span><strong>${summary.last ? esc(summary.last.replace('T', ' ').slice(0, 16)) : '-'}</strong></div>
  </div>
  <p class="base-hint">Short link: <code>${esc(`${base}/${link.code}`)}</code></p>
  <h3>Latest hits</h3>
  ${
    recent.length
      ? `<table>
    <thead><tr><th>When</th><th>Referer</th><th>User agent</th></tr></thead>
    <tbody>
${visits}
    </tbody>
  </table>`
      : `<p class="empty">No clicks recorded yet.</p>`
  }
</section>
`;

  return layout({ title: `/${esc(link.code)} - SnipURL stats`, body });
}

export function docsPage({ base }) {
  const body = `
<section class="list wide">
  <h2>API</h2>
  <p class="dest">Everything the UI does is a plain JSON call. Base URL: <code>${esc(base)}</code></p>
  <h3>Create a link</h3>
  <pre><code>curl -X POST ${esc(base)}/api/links \\
  -H 'content-type: application/json' \\
  -d '{"url":"https://example.com","code":"demo"}'

{"ok":true,"code":"demo","shortUrl":"${esc(base)}/demo","url":"https://example.com/","createdAt":"..."}</code></pre>
  <p><code>code</code> is optional (3-32 chars of <code>A-Z a-z 0-9 _ -</code>). Without it a random code is used and an identical URL returns the existing link.</p>
  <h3>List links</h3>
  <pre><code>GET ${esc(base)}/api/links?limit=50&amp;offset=0

{"ok":true,"total":1,"items":[{"code":"demo","url":"https://example.com/","clicks":3,"createdAt":"..."}]}</code></pre>
  <h3>Stats for one link</h3>
  <pre><code>GET ${esc(base)}/api/links/demo/stats

{"ok":true,"link":{...},"summary":{"total":3,...},"recent":[{"clickedAt":"...","referer":null,"userAgent":"..."}]}</code></pre>
  <h3>Delete a link</h3>
  <pre><code>DELETE ${esc(base)}/api/links/demo
{"ok":true,"deleted":"demo"}</code></pre>
  <h3>Health</h3>
  <pre><code>GET ${esc(base)}/health
{"ok":true,"status":"ok"}</code></pre>
  <p class="base-hint">Write endpoints require the <code>Content-Type: application/json</code> header, and <code>DELETE</code> needs the <code>x-admin-token</code> header when the <code>ADMIN_TOKEN</code> secret is set.</p>
</section>
`;
  return layout({ title: 'API - SnipURL', body });
}

export function notFoundPage() {
  const body = `
<section class="hero center">
  <h1>404</h1>
  <p class="sub">That short link does not exist (or it was deleted).</p>
  <p><a class="more" href="/">&larr; Back to SnipURL</a></p>
</section>
`;
  return layout({ title: 'Not found - SnipURL', body });
}
