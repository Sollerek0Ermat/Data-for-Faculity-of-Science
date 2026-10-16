/**
 * Subject Details page
 */

let _subject = null;
let _doctors = [];
let _currentTab = 'section';

document.addEventListener('DOMContentLoaded', async function() {
  renderTopbar();
  var footer = document.getElementById('footerPlaceholder');
  if (footer) footer.outerHTML = renderFooter();

  var id = getQueryParam('id');
  if (!id) { showNotFound(); return; }

  try {
    var subjects = await API.getSubjects();
    _subject = subjects.find(function(s) { return s.name === id || s.id === id; });

    if (!_subject) { showNotFound(); return; }

    document.getElementById('subjectTitle').textContent = _subject.icon + ' ' + _subject.name;
    document.getElementById('subjectInfo').textContent = _subject.description || (_subject.department ? _subject.department + ' • Level ' + _subject.levelNumber + ' • Sem ' + _subject.semesterNumber : '');

    // جيب الدكاترة المرتبطين بالمادة
    var dws = await API.getDoctorWithSubjects();
    _doctors = [];
    dws.forEach(function(d) {
      if (d.subjects.some(function(s) { return s.name === _subject.name; })) {
        _doctors.push(d.doctor);
      }
    });

    // Tabs
    document.querySelectorAll('#tabsBar .tab').forEach(function(tab) {
      tab.addEventListener('click', function() {
        document.querySelectorAll('#tabsBar .tab').forEach(function(t) { t.classList.remove('active'); });
        tab.classList.add('active');
        renderTab(tab.dataset.tab);
      });
    });

    renderTab('section');
  } catch (err) {
    console.error(err);
    UI.error(err.message || 'Failed to load');
  }
});

function showNotFound() {
  document.getElementById('subjectTitle').textContent = 'Subject not found';
  document.getElementById('subjectInfo').textContent = 'Go back to courses';
}

async function renderTab(type) {
  _currentTab = type;
  var grid = document.getElementById('sectionsGrid');
  setLoading(grid);

  if (!_doctors.length) {
    setEmpty(grid, 'No doctors linked to this subject yet');
    return;
  }

  try {
    var allFiles = [];
    for (var i = 0; i < _doctors.length; i++) {
      var doctor = _doctors[i];
      try {
        var files = await API.getFolderContent({
          subjectName: _subject.name,
          doctorName:  doctor.name,
          department:  _subject.department,
          levelNumber: _subject.levelNumber,
          semesterNumber: _subject.semesterNumber,
          dataType:    type
        });
        files.forEach(function(f) {
          f._doctorName = doctor.name;
          allFiles.push(f);
        });
      } catch (e) {
        console.warn('Failed for doctor:', doctor.name, e.message);
      }
    }

    if (!allFiles.length) {
      setEmpty(grid, 'No content of this type');
      return;
    }

    grid.innerHTML = allFiles.map(function(f) {
      return fileCardHTML(f, type);
    }).join('');

    bindFileActions(grid, type);
  } catch (err) {
    console.error(err);
    setEmpty(grid, err.message || 'Failed to load');
  }
}

function fileCardHTML(file, type) {
  var t = (type === 'recourse') ? 'resource' : type;

  var titleKey = { section: 'sectionTitle', summary: 'summaryTitle', resource: 'resourceTitle', video: 'videoTitle' }[t];
  var publisherKey = { section: 'sectionPublishedBy', summary: 'summaryPublishedBy', resource: 'resourcePublishedBy', video: 'videoPublishedBy' }[t];
  var dateKey = { section: 'sectionPublishDate', summary: 'summaryPublishDate', resource: 'resourcePublishDate', video: 'videoPublishDate' }[t];
  var editKey = { section: 'sectionLastEditDate', summary: 'summaryLastEditDate', resource: 'resourceLastEditDate', video: 'videoLastEditDate' }[t];

  var icons = { section: 'S', summary: 'M', resource: 'R', video: 'V' };

  var title     = file[titleKey] || file['recourseTitle'] || '';
  var publisher = file[publisherKey] || file['recoursePublishedBy'] || '—';
  var date      = file[dateKey] || file['recoursePublishDate'];
  var editDate  = file[editKey] || file['recourseLastEditDate'];
  var size      = file.size;
  var icon      = icons[t] || 'F';

  return [
    '<div class="file-card">',
    '  <div class="file-card-head">',
    '    <div class="file-card-icon">' + icon + '</div>',
    '    <div class="file-card-info">',
    '      <h4>' + escapeHtml(title) + '</h4>',
    '      <div class="file-card-meta">',
    '        <span>Published ' + formatDate(date) + '</span>',
    '        <span>By ' + escapeHtml(publisher) + '</span>',
    editDate ? '        <span>Last edit ' + formatDate(editDate) + '</span>' : '',
    size ? '        <span>' + escapeHtml(String(size)) + ' MB</span>' : '',
    '      </div>',
    '    </div>',
    '  </div>',
    '  <div class="file-card-actions">',
    '    <button class="file-action-btn" data-action="view" data-name="' + escapeHtml(title) + '">View</button>',
    '    <button class="file-action-btn primary" data-action="download" data-name="' + escapeHtml(title) + '">Download</button>',
    '  </div>',
    '</div>'
  ].join('');
}

function bindFileActions(grid, type) {
  grid.querySelectorAll('[data-action="view"]').forEach(function(btn) {
    btn.addEventListener('click', function() { API.downloadFile(type, btn.dataset.name, 'view'); });
  });
  grid.querySelectorAll('[data-action="download"]').forEach(function(btn) {
    btn.addEventListener('click', function() { API.downloadFile(type, btn.dataset.name, 'download'); });
  });
}