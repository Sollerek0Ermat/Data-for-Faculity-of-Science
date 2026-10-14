/**
 * Folder Info — Doctor / Subject / Department
 */

document.addEventListener('DOMContentLoaded', async function() {
  renderTopbar();
  var footer = document.getElementById('footerPlaceholder');
  if (footer) footer.outerHTML = renderFooter();

  var params = new URLSearchParams(location.search);
  var folder = params.get('folder');
  var name = params.get('name');
  var wrap = document.getElementById('folderInfoWrap');

  if (!folder || !name) {
    wrap.innerHTML = '<p class="text-center text-muted" style="padding:60px">Missing parameters</p>';
    return;
  }

  try {
    var info = await API.getFolderInfo(folder, name);

    if (!info) {
      wrap.innerHTML = '<p class="text-center text-muted" style="padding:60px">Not found</p>';
      return;
    }

    if (folder === 'doctor')      renderDoctor(wrap, info);
    else if (folder === 'subject') renderSubject(wrap, info);
    else                           renderDepartment(wrap, info);
  } catch (err) {
    console.error(err);
    wrap.innerHTML = '<p class="text-center text-muted" style="padding:60px">' + err.message + '</p>';
  }
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