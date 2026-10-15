/**
 * Home page — نفس نظام folder.js بالظبط، بس جوه نفس الصفحة بدون إعادة تحميل
 */

var _homeParams = {};

document.addEventListener('DOMContentLoaded', async function () {
  var profile = await Auth.syncSession();
  if (!profile || !profile.role) {
    window.location.href = 'login.html';
    return;
  }

  var introSeen = localStorage.getItem('intro_seen_v3');
  var skipIntro = new URLSearchParams(location.search).get('skip_intro');
  if (!introSeen && !skipIntro) {
    localStorage.setItem('intro_seen_v3', '1');
    window.location.replace('intro.html?next=index.html');
    return;
  }

  renderTopbar('index.html');
  var footer = document.getElementById('footerPlaceholder');
  if (footer) footer.outerHTML = renderFooter();

  renderHomeBreadcrumbs();
  await loadHomeLevel();
});

function renderHomeBreadcrumbs() {
  var el = document.getElementById('homeBreadcrumbs');
  if (!el) return;

  var html = '<span data-root="1">🏠 Home</span>';
  var trail = FolderBrowser.breadcrumbTrail(_homeParams);

  trail.forEach(function (step) {
    if (!step.label || step.label.trim() === '' || step.label === 'undefined' || step.label === 'null') return;

    html += ' / ';
    if (step.isLast) {
      html += '<span style="color:#fff;cursor:default">' + escapeHtml(step.label) + '</span>';
    } else {
      html += '<span data-key="' + step.key + '">' + escapeHtml(step.label) + '</span>';
    }
  });

  el.innerHTML = html;

  var rootEl = el.querySelector('[data-root]');
  if (rootEl) rootEl.addEventListener('click', function () { goTo({}); });

  el.querySelectorAll('[data-key]').forEach(function (span) {
    span.addEventListener('click', function () {
      goTo(FolderBrowser.truncateAt(_homeParams, span.dataset.key));
    });
  });
}

async function loadHomeLevel() {
  var grid = document.getElementById('structureCardsGrid');
  var titleEl = document.getElementById('structureTitle');

  var result = await FolderBrowser.renderLevel({
    params: _homeParams,
    gridEl: grid,
    titleEl: titleEl,
    navKeyFor: function () { return '1'; },
    hrefFor: function () { return '#'; }
  });

  if (result.level !== 'file') bindHomeCardClicks(grid, result.items);
}

function bindHomeCardClicks(grid, items) {
  grid.querySelectorAll('a[data-nav]').forEach(function (a, idx) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      var item = items[idx];
      if (!item) return;
      goTo(FolderBrowser.nextParams(_homeParams, item));
    });
  });
}

function goTo(newParams) {
  _homeParams = cleanParams(newParams || {});
  renderHomeBreadcrumbs();
  loadHomeLevel();
}