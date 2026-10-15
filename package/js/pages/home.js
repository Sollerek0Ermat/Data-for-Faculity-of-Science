/**
 * Home page — نفس نظام folder.js بالظبط، بس جوه نفس الصفحة بدون إعادة تحميل
 * المستوى الكامل: department → level → semester → subject → doctor → dataType → file
 */

var _homeParams = {};

document.addEventListener('DOMContentLoaded', async function () {
  // 1) Verify session (زي index.js الأصلي)
  var profile = await Auth.syncSession();
  if (!profile || !profile.role) {
    window.location.href = 'login.html';
    return;
  }

  // 2) Intro redirect (أول زيارة بس)
  var introSeen = localStorage.getItem('intro_seen_v3');
  var skipIntro = new URLSearchParams(location.search).get('skip_intro');
  if (!introSeen && !skipIntro) {
    localStorage.setItem('intro_seen_v3', '1');
    window.location.replace('intro.html?next=index.html');
    return;
  }

  // 3) Render page
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
    navKeyFor: function () { return '1'; }, // مجرد علامة إننا هنمسك الكليك بنفسنا
    hrefFor: function () { return '#'; }     // مفيش reload — هنفتح نفس الصفحة
  });

  if (result.level !== 'file') bindHomeCardClicks(grid, result.items);
}

function bindHomeCardClicks(grid, items) {
  // الكروت العادية (subject-card / dataType-card) — نلتقط الكليك ونمنع الانتقال الافتراضي
  grid.querySelectorAll('a[data-nav]').forEach(function (a, idx) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      var item = items[idx];
      if (!item) return;

      // ملحوظة: item.link هو رابط API خام (/v1/student/folder?...) راجع من السيرفر
      // لو تفتحه في المتصفح هيعرض JSON خام — مش صفحة. نتجاهله خالص ونكمل التنقل
      // بنفس آلية nextParams زي باقي المستويات.
      goTo(FolderBrowser.nextParams(_homeParams, item));
    });
  });
}

function goTo(newParams) {
  _homeParams = newParams;
  renderHomeBreadcrumbs();
  loadHomeLevel();
}