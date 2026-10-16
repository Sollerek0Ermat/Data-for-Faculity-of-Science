/**
 * FolderBrowser — المحرك المشترك للتصفح الهرمي
 */

const FolderBrowser = (function () {

  const LEVEL_TITLES = {
    department: 'Departments',
    level:      'Levels',
    semester:   'Semesters',
    subject:    'Subjects',
    doctor:     'Doctors',
    dataType:   'Content Types',
    file:       'Files'
  };

  const FOLDER_ICONS = { department: '\uD83C\uDFDB\uFE0F', level: '\uD83D\uDCCA', semester: '\uD83D\uDCC5', subject: '\uD83D\uDCDA', doctor: '\uD83D\uDC68\u200D\uD83C\uDFEB' };

  const DATA_TYPE_META = {
    sections:  { icon: '\uD83D\uDCC4', label: 'Sections',  desc: 'Chapters and topics' },
    videos:    { icon: '\uD83C\uDFAC', label: 'Videos',    desc: 'Recorded lectures' },
    summaries: { icon: '\uD83D\uDCDD', label: 'Summaries', desc: 'Condensed overviews' },
    recourses: { icon: '\uD83D\uDCE6', label: 'Resources', desc: 'Reference sheets' },
    resources: { icon: '\uD83D\uDCE6', label: 'Resources', desc: 'Reference sheets' }
  };

  const FILE_ICONS = { section: 'S', summary: 'M', resource: 'R', video: 'V' };

  function resolveLevel(params) {
    if (params.dataType)            return 'file';
    if (params.doctor)              return 'dataType';
    if (params.subject)             return 'doctor';
    if (params.semesterNumber)      return 'subject';
    if (params.levelNumber)         return 'semester';
    if (params.department)          return 'level';
    return 'department';
  }

  function nextParams(params, item) {
    var p = Object.assign({}, params);
    if (item.level === 'department')  p.department = item.name;
    if (item.level === 'level')       p.levelNumber = item.levelNumber;
    if (item.level === 'semester')    p.semesterNumber = item.semesterNumber;
    if (item.level === 'subject')     p.subject = item.name;
    if (item.level === 'doctor')      p.doctor = item.name;
    if (item.level === 'dataType') {
      var dt = (item.dataType || '').replace(/s$/, '');
      if (dt === 'recourse') dt = 'resource';
      p.dataType = dt;
    }
    return cleanParams(p);
  }

  function buildQuery(p) {
    p = cleanParams(p || {});
    var qs = [];
    if (p.department)     qs.push('dept=' + encodeURIComponent(p.department));
    if (p.levelNumber)    qs.push('level=' + p.levelNumber);
    if (p.semesterNumber) qs.push('sem=' + p.semesterNumber);
    if (p.subject)        qs.push('subject=' + encodeURIComponent(p.subject));
    if (p.doctor)         qs.push('doctor=' + encodeURIComponent(p.doctor));
    if (p.dataType)       qs.push('type=' + p.dataType);
    return qs.join('&');
  }

  function breadcrumbTrail(params) {
    params = cleanParams(params || {});
    var parts = [];

    if (params.department)     parts.push({ key: 'department',     label: safeText(params.department) });
    if (params.levelNumber)    parts.push({ key: 'levelNumber',    label: 'Level ' + safeText(params.levelNumber) });
    if (params.semesterNumber) parts.push({ key: 'semesterNumber', label: 'Semester ' + safeText(params.semesterNumber) });
    if (params.subject)        parts.push({ key: 'subject',        label: safeText(params.subject) });
    if (params.doctor)         parts.push({ key: 'doctor',         label: safeText(params.doctor) });
    if (params.dataType)       parts.push({ key: 'dataType',       label: safeText(params.dataType), isLast: true });

    return parts.filter(function (p) { return p.label && p.label.trim() !== ''; });
  }

  function truncateAt(params, key) {
    params = cleanParams(params || {});
    var order = ['department', 'levelNumber', 'semesterNumber', 'subject', 'doctor', 'dataType'];
    var idx = order.indexOf(key);
    var p = {};
    for (var i = 0; i <= idx; i++) {
      if (params[order[i]] !== undefined) p[order[i]] = params[order[i]];
    }
    return cleanParams(p);
  }

  
function folderCardHTML(item, href, navKey) {
  var icon = FOLDER_ICONS[item.level] || '\uD83D\uDCC1';
  var label =
    safeText(item.name) ||
    (item.levelNumber != null ? 'Level ' + safeText(item.levelNumber) : '') ||
    (item.semesterNumber != null ? 'Semester ' + safeText(item.semesterNumber) : '');
  if (!label) label = '\u2014';

  // ✨ أيقونة مخصصة للأقسام
  if (item.level === 'department' && typeof Mappers !== 'undefined' && Mappers._getDepartmentIcon) {
    icon = Mappers._getDepartmentIcon(item.name);
  }

  // ✨ بيانات إضافية حسب النوع
  var metaHtml = '';

  // كود (للأقسام والمواد)
  if (item.code) {
    metaHtml += '<span class="folder-card-code">' + escapeHtml(item.code) + '</span>';
  }

  // وصف
  if (item.description) {
    metaHtml += '<p class="folder-card-desc">' + escapeHtml(item.description) + '</p>';
  }

  // Expected Jobs (للأقسام)
  if (item.expectedJobs) {
    metaHtml += '<div class="folder-card-jobs">' +
      '<span class="folder-card-jobs-label">\uD83D\uDCBC Expected Jobs:</span>' +
      '<span class="folder-card-jobs-value">' + escapeHtml(item.expectedJobs) + '</span>' +
    '</div>';
  }

  // معلومات إضافية للمستويات/الترمات
  var badgeHtml = '';
  if (item.levelNumber != null && item.level === 'level') {
    badgeHtml = '<span class="folder-card-badge">Level ' + safeText(item.levelNumber) + '</span>';
  }
  if (item.semesterNumber != null && item.level === 'semester') {
    badgeHtml = '<span class="folder-card-badge">Sem ' + safeText(item.semesterNumber) + '</span>';
  }

  return [
    '<a href="' + href + '" class="subject-card folder-card"' + (navKey ? ' data-nav="' + navKey + '"' : '') + '>',
    '  <span class="subject-icon">' + icon + '</span>',
    badgeHtml,
    '  <h3>' + escapeHtml(String(label)) + '</h3>',
    metaHtml ? '  <div class="folder-card-meta">' + metaHtml + '</div>' : '',
    '</a>'
  ].join('');
}

  function dataTypeCardHTML(item, href, navKey) {
    var meta = DATA_TYPE_META[item.dataType] || { icon: '\uD83D\uDCC1', label: item.dataType || 'Folder', desc: '' };
    return [
      '<a href="' + href + '" class="dataType-card"' + (navKey ? ' data-nav="' + navKey + '"' : '') + '>',
      '  <div class="dataType-icon">' + meta.icon + '</div>',
      '  <div class="dataType-info">',
      '    <h3>' + meta.label + '</h3>',
      '    <p>' + meta.desc + '</p>',
      '  </div>',
      '</a>'
    ].join('');
  }

  function fileCardHTML(item, type) {
    var icon = FILE_ICONS[type] || 'F';
    return [
      '<div class="file-card">',
      '  <div class="file-card-head">',
      '    <div class="file-card-icon">' + icon + '</div>',
      '    <div class="file-card-info">',
      '      <h4>' + escapeHtml(safeText(item.title)) + '</h4>',
      '      <div class="file-card-meta">',
      '        <span>Published ' + formatDate(item.created_at) + '</span>',
      '        <span>By ' + escapeHtml(safeText(item.publisher)) + '</span>',
      item.size ? '        <span>' + escapeHtml(String(item.size)) + ' MB</span>' : '',
      '      </div>',
      '    </div>',
      '  </div>',
      '  <div class="file-card-actions">',
      '    <button class="file-action-btn" data-action="view" data-name="' + escapeHtml(safeText(item.title)) + '">View</button>',
      '    <button class="file-action-btn primary" data-action="download" data-name="' + escapeHtml(safeText(item.title)) + '">Download</button>',
      '  </div>',
      '</div>'
    ].join('');
  }

  function bindFileActions(grid, dataType) {
    grid.querySelectorAll('[data-action="view"]').forEach(function (btn) {
      btn.addEventListener('click', function () { API.downloadFile(dataType, btn.dataset.name, 'view'); });
    });
    grid.querySelectorAll('[data-action="download"]').forEach(function (btn) {
      btn.addEventListener('click', function () { API.downloadFile(dataType, btn.dataset.name, 'download'); });
    });
  }

  async function renderLevel(opts) {
    var params = cleanParams(opts.params || {});
    var grid = opts.gridEl;
    var level = resolveLevel(params);

    setLoading(grid);
    if (opts.titleEl) opts.titleEl.textContent = LEVEL_TITLES[level] || 'Browse';

    try {
      var query = {};
      if (params.department)     query.department = params.department;
      if (params.levelNumber)    query.levelNumber = params.levelNumber;
      if (params.semesterNumber) query.semesterNumber = params.semesterNumber;
      if (params.subject)        query.subject = params.subject;
      if (params.doctor)         query.doctor = params.doctor;
      if (params.dataType)       query.dataType = params.dataType;

      var raw = await API.getFolders(query);
      var items = Mappers.folderList(raw);

      if (!items.length) {
        setEmpty(grid, '⏳ Soon — Content will be added');
        return { level: level, items: [] };
      }

      if (level === 'file') {
        grid.className = '';
        grid.innerHTML = items.map(function (item) { return fileCardHTML(item, params.dataType); }).join('');
        bindFileActions(grid, params.dataType);
      } else if (level === 'dataType') {
        grid.className = 'dataType-grid';
        grid.innerHTML = items.map(function (item) {
          return dataTypeCardHTML(item, opts.hrefFor(item), opts.navKeyFor ? opts.navKeyFor(item) : null);
        }).join('');
      } else {
        grid.className = 'grid';
        grid.innerHTML = items.map(function (item) {
          return folderCardHTML(item, opts.hrefFor(item), opts.navKeyFor ? opts.navKeyFor(item) : null);
        }).join('');
      }

      return { level: level, items: items };
    } catch (err) {
      console.error(err);
      setEmpty(grid, err.message || 'Failed to load');
      return { level: level, items: [] };
    }
  }

  return {
    LEVEL_TITLES: LEVEL_TITLES,
    resolveLevel: resolveLevel,
    nextParams: nextParams,
    buildQuery: buildQuery,
    breadcrumbTrail: breadcrumbTrail,
    truncateAt: truncateAt,
    folderCardHTML: folderCardHTML,
    dataTypeCardHTML: dataTypeCardHTML,
    fileCardHTML: fileCardHTML,
    bindFileActions: bindFileActions,
    renderLevel: renderLevel
  };
})();


