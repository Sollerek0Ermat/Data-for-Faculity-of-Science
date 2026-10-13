/**
 * 🛠️ Helpers
 */

function escapeHtml(str = '') {
  return String(str).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return '—';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + ['B', 'KB', 'MB', 'GB'][i];
}

function formatDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  } catch { return '—'; }
}

function uid(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function getQueryParam(name) {
  return new URLSearchParams(location.search).get(name);
}

function buildUrl(path, params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') qs.append(k, v);
  });
  const q = qs.toString();
  return q ? `${path}?${q}` : path;
}

function $ (sel, root = document) { return root.querySelector(sel); }
function $$ (sel, root = document) { return Array.from(root.querySelectorAll(sel)); }

function setLoading(el) {
  if (!el) return;
  el.innerHTML = `<div class="loader"></div>`;
}

function setEmpty(el, text) {
  if (!el) return;
  el.innerHTML = `<p class="text-muted text-center" style="grid-column:1/-1;padding:40px">${escapeHtml(text)}</p>`;
}

function goTo(path) {
  window.location.href = path;
}