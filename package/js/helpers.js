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



function goTo(path) {
  window.location.href = path;
}


function setEmpty(el, text, options) {
  if (!el) return;
  options = options || {};

  var variant = options.variant || 'soon';
  var customTitle = options.title || null;
  var customText  = options.text  || text || null;

  el.innerHTML = buildEmptyState({
    variant: variant,
    title: customTitle,
    message: customText,
    showAddBtn: options.showAddBtn === true
  });
  el.style.display = 'block';
}

function buildEmptyState(opts) {
  var icons = {
    soon: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6h24"/><path d="M20 58h24"/><path d="M22 6v10c0 4 4 7 7 9l3 2v10l-3 2c-3 2-7 5-7 9v10"/><path d="M42 6v10c0 4-4 7-7 9l-3 2v10l3 2c3 2 7 5 7 9v10"/><circle cx="32" cy="48" r="1.5" fill="currentColor" stroke="none"/><circle cx="32" cy="52" r="1.2" fill="currentColor" stroke="none"/><circle cx="32" cy="55" r="1" fill="currentColor" stroke="none"/></svg>',
    search: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="28" cy="28" r="18"/><line x1="41" y1="41" x2="54" y2="54"/></svg>',
    error: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M32 6L4 56h56L32 6z"/><line x1="32" y1="24" x2="32" y2="38"/><line x1="32" y1="46" x2="32.01" y2="46"/></svg>'
  };

  var titles = {
    soon:   opts.title || 'Content coming soon',
    search: opts.title || 'No results found',
    error:  opts.title || 'Could not load'
  };

  var arabic = {
    soon:   '<bdi lang="ar" dir="rtl" class="empty-arabic">\u0627\u0644\u0645\u062D\u062A\u0648\u0649 \u0642\u0631\u064A\u0628\u0627\u064B</bdi>',
    search: '<bdi lang="ar" dir="rtl" class="empty-arabic">\u0644\u0627 \u062A\u0648\u062C\u062F \u0646\u062A\u0627\u0626\u062C</bdi>',
    error:  '<bdi lang="ar" dir="rtl" class="empty-arabic">\u062D\u062F\u062B \u062E\u0637\u0623</bdi>'
  };

  var messages = {
    soon:   'Courses, summaries, and exams for this subject will appear here. Doctors are adding them soon.',
    search: 'Try another keyword or browse the courses list.',
    error:  'We could not load this section. Please try again.'
  };

  var actions = '';

  if (opts.variant === 'error') {
    actions = '<button type="button" class="btn btn-primary empty-btn" data-empty-action="retry">' +
                '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10"/><path d="M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>' +
                ' Try again' +
              '</button>';
  } else {
    actions =
      '<a href="folder.html" class="btn btn-ghost empty-btn">' +
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>' +
        ' Back to departments' +
      '</a>' +
      '<a href="index.html" class="btn btn-primary empty-btn">' +
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>' +
        ' Go to home' +
      '</a>';

    if (opts.showAddBtn) {
      actions +=
        '<button type="button" class="btn btn-primary empty-btn" data-empty-action="add">' +
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>' +
          ' Add content' +
        '</button>';
    }
  }

  return [
    '<div class="empty empty--' + opts.variant + '">',
    '  <div class="empty-icon">' + icons[opts.variant] + '</div>',
    '  <h3 class="empty-title">' + titles[opts.variant] + '</h3>',
    '  ' + arabic[opts.variant],
    '  <p class="empty-message">' + (opts.message || messages[opts.variant]) + '</p>',
    '  <div class="empty-actions">' + actions + '</div>',
    '</div>'
  ].join('');
}

/* ✨ ربط أزرار empty state */
document.addEventListener('click', function(e) {
  var btn = e.target.closest('[data-empty-action]');
  if (!btn) return;

  var action = btn.dataset.emptyAction;

  if (action === 'retry') {
    e.preventDefault();
    location.reload();
  }

  if (action === 'add') {
    e.preventDefault();
    if (window.AdminUI && typeof AdminUI.openAddFileChoice === 'function') {
      AdminUI.openAddFileChoice();
    } else {
      window.location.href = 'admin.html';
    }
  }
});
