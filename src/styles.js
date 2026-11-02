// All presentation CSS + client JS lives here, injected inline (no external assets).

export const style = `
:root {
  --bg: #0d1117;
  --panel: #161b22;
  --border: #30363d;
  --text: #e6edf3;
  --muted: #8b949e;
  --accent: #4f8ff7;
  --accent-2: #2ea043;
  --danger: #f85149;
}
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
  background: var(--bg);
  color: var(--text);
  font: 16px/1.55 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
a { color: var(--accent); text-decoration: none; }
a:hover { text-decoration: underline; }
.top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 24px;
  border-bottom: 1px solid var(--border);
  background: rgba(22, 27, 34, 0.9);
  position: sticky;
  top: 0;
  backdrop-filter: blur(6px);
}
.brand { font-weight: 800; font-size: 20px; color: var(--text); }
.brand span { color: var(--accent); }
.brand:hover { text-decoration: none; }
.top nav { display: flex; gap: 18px; }
.top nav a { color: var(--muted); }
.top nav a:hover { color: var(--text); text-decoration: none; }
main { flex: 1; width: 100%; max-width: 960px; margin: 0 auto; padding: 40px 24px 24px; }
.hero { text-align: center; margin-bottom: 48px; }
.hero h1 { font-size: clamp(26px, 5vw, 40px); margin: 0 0 8px; }
.sub { color: var(--muted); margin: 0 0 28px; }
.card {
  display: grid;
  gap: 14px;
  max-width: 560px;
  margin: 0 auto;
  padding: 22px;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 12px;
  text-align: left;
}
.field { display: grid; gap: 6px; }
.field span { font-size: 13px; color: var(--muted); }
.field em { font-style: normal; opacity: 0.7; }
.field input {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 10px 12px;
  color: var(--text);
  font-size: 15px;
  width: 100%;
}
.field input:focus { outline: 2px solid var(--accent); outline-offset: 1px; border-color: transparent; }
button {
  background: var(--accent);
  border: none;
  border-radius: 8px;
  padding: 10px 16px;
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: filter 0.15s;
}
button:hover { filter: brightness(1.1); }
button.ghost { background: transparent; border: 1px solid var(--border); color: var(--muted); font-weight: 500; padding: 5px 10px; font-size: 13px; }
button.ghost:hover { color: var(--text); border-color: var(--muted); }
button.ghost.danger:hover { color: var(--danger); border-color: var(--danger); }
.msg { margin: 0; font-size: 14px; min-height: 20px; }
.msg.error { color: var(--danger); }
.msg.success { color: var(--accent-2); }
.result {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 18px;
  font-size: 17px;
}
.result-label { color: var(--muted); font-size: 13px; text-transform: uppercase; letter-spacing: 0.06em; }
#result-url { font-weight: 700; font-size: 18px; word-break: break-all; }
.list, .list.wide { max-width: 960px; margin: 0 auto; }
.list-head { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 12px; gap: 12px; flex-wrap: wrap; }
.list h2, .list h3 { margin: 18px 0 10px; font-size: 20px; }
.more { font-size: 14px; }
table { width: 100%; border-collapse: collapse; font-size: 14px; }
th, td { text-align: left; padding: 9px 10px; border-bottom: 1px solid var(--border); vertical-align: middle; }
th { color: var(--muted); font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; }
td.url, th.url { max-width: 340px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
td.num, th.num { text-align: right; }
td.when, th.when { color: var(--muted); white-space: nowrap; }
.short { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-weight: 600; }
.empty { color: var(--muted); text-align: center; padding: 28px 0; }
.pager { display: flex; justify-content: space-between; margin-top: 16px; }
.crumbs { margin: 0 0 14px; font-size: 14px; }
.dest { color: var(--muted); word-break: break-all; margin: 0 0 18px; }
.tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin-bottom: 18px; }
.tile { background: var(--panel); border: 1px solid var(--border); border-radius: 10px; padding: 14px; display: grid; gap: 4px; }
.tile span { color: var(--muted); font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; }
.tile strong { font-size: 20px; }
.base-hint { color: var(--muted); font-size: 13px; text-align: center; margin-top: 26px; }
.base-hint code, pre code { background: var(--panel); border: 1px solid var(--border); border-radius: 4px; padding: 1px 6px; }
pre { background: var(--panel); border: 1px solid var(--border); border-radius: 10px; padding: 14px; overflow-x: auto; }
pre code { background: none; border: none; padding: 0; font-size: 13px; }
.muted { color: var(--muted); }
.center { text-align: center; }
.actions { display: flex; gap: 6px; justify-content: flex-end; align-items: center; }
.foot {
  display: flex;
  justify-content: space-between;
  padding: 18px 24px;
  border-top: 1px solid var(--border);
  color: var(--muted);
  font-size: 13px;
}
@media (max-width: 600px) {
  main { padding: 24px 14px; }
  td.url, th.url { max-width: 120px; }
  .top nav { gap: 12px; }
}
`;

export const script = `
(function () {
  'use strict';

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  var form = $('#shorten-form');
  if (form) {
    var msg = $('#form-msg');
    var result = $('#result');
    var resultUrl = $('#result-url');

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      msg.className = 'msg';
      msg.textContent = 'Shortening…';
      var payload = {
        url: ($('#url').value || '').trim(),
        code: ($('#code').value || '').trim() || undefined
      };
      fetch('/api/links', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(function (r) { return r.json().then(function (data) { return { status: r.status, data: data }; }); })
        .then(function (out) {
          if (out.status >= 400 || !out.data.ok) {
            msg.className = 'msg error';
            msg.textContent = (out.data && out.data.error) || 'Something went wrong.';
            result.hidden = true;
            return;
          }
          msg.className = 'msg success';
          msg.textContent = out.data.existing ? 'Already had this one — here it is again.' : 'Short link created.';
          result.hidden = false;
          resultUrl.textContent = out.data.shortUrl;
          resultUrl.href = out.data.shortUrl;
          var copyBtn = $('#copy');
          copyBtn.dataset.link = out.data.shortUrl;
          setTimeout(function () { window.location.reload(); }, 900);
        })
        .catch(function () {
          msg.className = 'msg error';
          msg.textContent = 'Network error — try again.';
        });
    });

    $('#copy').addEventListener('click', function () {
      var link = this.dataset.link || $('#result-url').textContent;
      copy(link, this);
    });
  }

  $all('button[data-copy]').forEach(function (btn) {
    btn.addEventListener('click', function () { copy(btn.dataset.copy, btn); });
  });

  $all('button[data-delete]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (!window.confirm('Delete this link and its stats?')) return;
      fetch('/api/links' + btn.dataset.delete, {
        method: 'DELETE'
      })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (data.ok) { window.location.reload(); }
          else { window.alert(data.error || 'Delete failed.'); }
        })
        .catch(function () { window.alert('Network error.'); });
    });
  });

  function copy(text, btn) {
    var done = function () {
      var old = btn.textContent;
      btn.textContent = 'Copied!';
      setTimeout(function () { btn.textContent = old; }, 1200);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { fallback(); });
    } else {
      fallback();
    }
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); done(); } catch (e) {}
      document.body.removeChild(ta);
    }
  }
})();
`;
