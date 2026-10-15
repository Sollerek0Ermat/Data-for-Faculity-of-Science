/**
 *  Helpers
 */

function escapeHtml(str = '') {
  return String(str).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return '';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + ['B', 'KB', 'MB', 'GB'][i];
}

function formatDate(iso) {
  if (!iso) return '';
  try {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return String(iso);
    var y = d.getUTCFullYear();
    var m = String(d.getUTCMonth() + 1).padStart(2, '0');
    var day = String(d.getUTCDate()).padStart(2, '0');
    var h = String(d.getUTCHours()).padStart(2, '0');
    var min = String(d.getUTCMinutes()).padStart(2, '0');
    return y + '-' + m + '-' + day + 'T' + h + ':' + min;
  } catch (e) {
    return String(iso);
  }
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

/* 🧹 تنظيف الـ params من أي قيمة undefined/null/empty/"undefined"/"null" */
function cleanParams(p) {
  var out = {};
  Object.keys(p || {}).forEach(function(k) {
    var v = p[k];
    if (
      v !== undefined &&
      v !== null &&
      v !== '' &&
      v !== 'undefined' &&
      v !== 'null' &&
      v !== 'NaN' &&
      !(typeof v === 'number' && isNaN(v))
    ) {
      out[k] = v;
    }
  });
  return out;
}

/* 🧹 تنظيف أي نص من undefined/null */
function safeText(v) {
  if (v === undefined || v === null) return '';
  var s = String(v);
  if (s === 'undefined' || s === 'null' || s === 'NaN') return '';
  return s;
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