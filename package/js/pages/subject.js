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

    renderSubjectBreadcrumbs();
    renderSubjectMeta();
    await renderDoctorsInfo();
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

/* -------------------------------------------
   ? BREADCRUMBS
   ------------------------------------------- */
function renderSubjectBreadcrumbs() {
  const el = document.getElementById('subjectBreadcrumbs');
  if (!el || !_subject) return;
  
  const parts = [
    '<a href="index.html">Home</a>',
    '<span class="breadcrumb-sep">/</span>',
    '<a href="subjects.html">Courses</a>'
  ];
  
  if (_subject.department) {
    parts.push('<span class="breadcrumb-sep">/</span>');
    parts.push('<a href="folder.html?dept=' + encodeURIComponent(_subject.department) + '">' + escapeHtml(_subject.department) + '</a>');
  }
  
  parts.push('<span class="breadcrumb-sep">/</span>');
  parts.push('<span>' + escapeHtml(_subject.name) + '</span>');
  
  el.innerHTML = parts.join(' ');
}

/* -------------------------------------------
   ? SUBJECT META
   ------------------------------------------- */
function renderSubjectMeta() {
  const el = document.getElementById('subjectMeta');
  if (!el || !_subject) return;
  
  const parts = [];
  if (_subject.code)             parts.push('<span class="meta-item"><strong>Code:</strong> ' + escapeHtml(_subject.code) + '</span>');
  if (_subject.department)       parts.push('<span class="meta-item"><strong>Dept:</strong> ' + escapeHtml(_subject.department) + '</span>');
  if (_subject.levelNumber)      parts.push('<span class="meta-item"><strong>Level:</strong> ' + escapeHtml(String(_subject.levelNumber)) + '</span>');
  if (_subject.semesterNumber)   parts.push('<span class="meta-item"><strong>Semester:</strong> ' + escapeHtml(String(_subject.semesterNumber)) + '</span>');
  
  el.innerHTML = parts.join('');
}

/* -------------------------------------------
   ? DOCTORS INFO (?? ???? ??????)
   ------------------------------------------- */
async function renderDoctorsInfo() {
  const grid = document.getElementById('sectionsGrid');
  if (!grid || !_doctors.length) return;
  
  const doctorCards = _doctors.map(d => {
    const photoUrl = d.photo ? API.getDoctorPhotoUrl(d.name) : null;
    const defaultAvatar = "data:image/svg+xml;utf8," + encodeURIComponent(
      "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'>" +
      "<circle cx='50' cy='50' r='50' fill='#0a0f2e'/>" +
      "<circle cx='50' cy='38' r='16' fill='#00f2fe'/>" +
      "<path d='M20 90 Q50 60 80 90 Z' fill='#00f2fe'/>" +
      "</svg>"
    );
    
    return [
      '<div class="doctor-mini-card">',
      '  <img src="' + (photoUrl || defaultAvatar) + '" alt="' + escapeHtml(d.name) + '" class="doctor-mini-avatar" onerror="this.src=\'' + defaultAvatar + '\'">',
      '  <div class="doctor-mini-body">',
      '    <div class="doctor-mini-name">' + escapeHtml(d.name) + '</div>',
      d.academicDegree ? '    <div class="doctor-mini-degree">' + escapeHtml(d.academicDegree) + '</div>' : '',
      '    <a href="doctorProfile.html?name=' + encodeURIComponent(d.name) + '" class="doctor-mini-link">View Profile ?</a>',
      '  </div>',
      '</div>'
    ].join('');
  }).join('');
  
  // ????? ??? ??? grid
  const wrapper = document.createElement('div');
  wrapper.className = 'subject-doctor-info';
  wrapper.innerHTML = doctorCards;
  grid.parentElement.insertBefore(wrapper, grid);
}
