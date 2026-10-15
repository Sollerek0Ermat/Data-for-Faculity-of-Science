/**
 * Doctors page — By Doctor / By Subject
 */

var _dws = [];
var _currentView = 'doctor';

document.addEventListener('DOMContentLoaded', async function () {
  renderTopbar('doctors.html');
  var footer = document.getElementById('footerPlaceholder');
  if (footer) footer.outerHTML = renderFooter();

  var grid = document.getElementById('doctorsGrid');
  setLoading(grid);

  document.querySelectorAll('#doctorsTabs .tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      document.querySelectorAll('#doctorsTabs .tab').forEach(function (t) { t.classList.remove('active'); });
      tab.classList.add('active');
      _currentView = tab.dataset.view;
      renderDoctors();
    });
  });

  try {
    _dws = await API.getDoctorWithSubjects();
    if (!_dws.length) { setEmpty(grid, 'No doctors available'); return; }
    renderDoctors();
  } catch (err) {
    console.error(err);
    setEmpty(grid, err.message || 'Failed to load doctors');
  }
});

function renderDoctors() {
  var grid = document.getElementById('doctorsGrid');
  if (!grid) return;
  if (_currentView === 'doctor') renderByDoctor(grid);
  else renderBySubject(grid);
}

function renderByDoctor(grid) {
  grid.className = 'grid';
  grid.innerHTML = _dws.map(function (item) {
    var doctor = item.doctor;
    var subjects = item.subjects || [];
    var initials = getInitials(doctor.name);
    var photoUrl = doctor.photo ? API.getDoctorPhotoUrl(doctor.name) : null;

    var subjectsHtml = subjects.map(function (s) {
      var link = 'subject.html?id=' + encodeURIComponent(s.name);
      return '<a href="' + link + '" class="badge" style="text-decoration:none">' + s.icon + ' ' + escapeHtml(s.name) + '</a>';
    }).join('');

    return [
      '<div class="doctor-card">',
      '  <a href="doctorProfile.html?name=' + encodeURIComponent(doctor.name) + '" class="doctor-avatar-link">',
      '    <div class="doctor-avatar">' + escapeHtml(initials) + '</div>',
      '  </a>',
      '  <h3>' + escapeHtml(doctor.name) + '</h3>',
      '  <p>' + escapeHtml(doctor.academicDegree || 'Faculty Member') + '</p>',
      '  <div class="doctor-subjects">' + subjectsHtml + '</div>',
      '</div>'
    ].join('');
  }).join('');
}

function renderBySubject(grid) {
  var map = new Map();

  _dws.forEach(function (item) {
    (item.subjects || []).forEach(function (s) {
      if (!map.has(s.name)) {
        map.set(s.name, { name: s.name, code: s.code || '', icon: s.icon || '📚', doctors: [] });
      }
      map.get(s.name).doctors.push(item.doctor);
    });
  });

  var subjects = Array.from(map.values()).sort(function (a, b) { return a.name.localeCompare(b.name); });

  grid.className = 'grid';
  grid.innerHTML = subjects.map(function (s) {
    var doctorsHtml = s.doctors.map(function (d) {
      return '<span class="subject-doctor-tag">' + escapeHtml(d.name) + '</span>';
    }).join('');

    return [
      '<div class="subject-card">',
      s.code ? '  <span class="subject-code">' + escapeHtml(s.code) + '</span>' : '',
      '  <span class="subject-icon">' + s.icon + '</span>',
      '  <h3>' + escapeHtml(s.name) + '</h3>',
      '  <div class="doctor-list">' + doctorsHtml + '</div>',
      '</div>'
    ].join('');
  }).join('');
}

function getInitials(name) {
  if (!name) return '??';
  var parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}