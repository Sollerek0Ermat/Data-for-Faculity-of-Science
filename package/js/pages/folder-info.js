/**
 * Folder Info — Doctor / Subject / Department
 */

document.addEventListener('DOMContentLoaded', async function() {
  // Auth gate — sends anonymous visitors to login.html
  const profile = await Auth.bootstrap({ requireLogin: true });
  if (!profile) return;

  // ... rest of the original page code
});

function renderDoctor(wrap, info) {
  var photoUrl = info.doctorPhoto ? API.getDoctorPhotoUrl(info.doctorName) : '';
  var certs = info.doctorCertifications || [];

  var certsHtml = certs.map(function(c) {
    var key = Object.keys(c)[0];
    var url = c[key];
    return '<a href="' + url + '" target="_blank" class="cert-badge">' + escapeHtml(key.replace('doctorCertifications', 'Cert ')) + '</a>';
  }).join('');

  wrap.innerHTML = [
    '<div class="info-card">',
    photoUrl ? '  <img src="' + photoUrl + '" alt="' + escapeHtml(info.doctorName) + '" class="info-photo" onerror="this.style.display=\'none\'">' : '  <div class="info-avatar">' + (info.doctorName || '?')[0].toUpperCase() + '</div>',
    '  <div class="info-body">',
    '    <h1>' + escapeHtml(info.doctorName) + '</h1>',
    info.doctorAcademicDegree ? '    <p class="info-degree">' + escapeHtml(info.doctorAcademicDegree) + '</p>' : '',
    info.doctorDescription ? '    <h3>ABOUT</h3><p>' + escapeHtml(info.doctorDescription) + '</p>' : '',
    certs.length ? '    <h3>CERTIFICATIONS</h3><div class="cert-list">' + certsHtml + '</div>' : '',
    '  </div>',
    '</div>'
  ].join('');
}

function renderSubject(wrap, info) {
  wrap.innerHTML = [
    '<div class="info-card">',
    '  <div class="info-avatar">📚</div>',
    '  <div class="info-body">',
    '    <h1>' + escapeHtml(info.subjectName) + '</h1>',
    info.code ? '    <p class="info-degree">' + escapeHtml(info.code) + '</p>' : '',
    info.subjectDescription ? '    <h3>ABOUT</h3><p>' + escapeHtml(info.subjectDescription) + '</p>' : '',
    '  </div>',
    '</div>'
  ].join('');
}

function renderDepartment(wrap, info) {
  wrap.innerHTML = [
    '<div class="info-card">',
    '  <div class="info-avatar">🏛️</div>',
    '  <div class="info-body">',
    '    <h1>' + escapeHtml(info.depName) + '</h1>',
    info.code ? '    <p class="info-degree">' + escapeHtml(info.code) + '</p>' : '',
    info.departmentDescription ? '    <h3>ABOUT</h3><p>' + escapeHtml(info.departmentDescription) + '</p>' : '',
    info.departmentExpectedJobs ? '    <h3>EXPECTED JOBS</h3><p>' + escapeHtml(info.departmentExpectedJobs) + '</p>' : '',
    '  </div>',
    '</div>'
  ].join('');
}