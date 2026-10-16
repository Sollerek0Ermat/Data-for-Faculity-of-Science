/**
 * Folder Browser — التصفح الهرمي (URL-based)
 */

var _params = {};

document.addEventListener('DOMContentLoaded', async function () {
  renderTopbar();
  var footer = document.getElementById('footerPlaceholder');
  if (footer) footer.outerHTML = renderFooter();

  var urlParams = new URLSearchParams(location.search);
  _params = cleanParams({
    department:     urlParams.get('dept'),
    levelNumber:    urlParams.get('level'),
    semesterNumber: urlParams.get('sem'),
    subject:        urlParams.get('subject'),
    doctor:         urlParams.get('doctor'),
    dataType:       urlParams.get('type')
  });

  renderBreadcrumbs();
  await loadFolder();
});

function renderBreadcrumbs() {
  var el = document.getElementById('breadcrumbs');
  if (!el) return;

  var items = ['<a href="folder.html">Browse</a>'];
  var trail = FolderBrowser.breadcrumbTrail(_params);

  trail.forEach(function (step) {
    if (!step.label || step.label.trim() === '' || step.label === 'undefined' || step.label === 'null') return;

    if (step.isLast) {
      items.push('<span>' + escapeHtml(step.label) + '</span>');
      return;
    }
    var p = FolderBrowser.truncateAt(_params, step.key);
    var href = 'folder.html?' + FolderBrowser.buildQuery(p);
    items.push('<a href="' + href + '">' + escapeHtml(step.label) + '</a>');
  });

  el.innerHTML = items.join(' <span class="breadcrumb-sep">/</span> ');
}

async function loadFolder() {
  var grid = document.getElementById('folderGrid');
  var titleEl = document.getElementById('folderTitle');

  await FolderBrowser.renderLevel({
    params: _params,
    gridEl: grid,
    titleEl: titleEl,
    hrefFor: function (item) {
      var p = FolderBrowser.nextParams(_params, item);
      return 'folder.html?' + FolderBrowser.buildQuery(p);
    }
  });
}