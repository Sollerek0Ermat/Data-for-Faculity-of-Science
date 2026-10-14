/**
 * Doctor Profile Page
 */

document.addEventListener('DOMContentLoaded', async function () {
  renderTopbar();
  var footer = document.getElementById('footerPlaceholder');
  if (footer) footer.outerHTML = renderFooter();

  var name = new URLSearchParams(location.search).get('name');
  var wrap = document.getElementById('profileWrap');

  if (!name) {
    wrap.innerHTML = '<p class="text-center text-muted" style="padding:60px">No doctor name provided</p>';
    return;
  }

  try {
    var info = await API.getFolderInfo('doctor', name);

    if (!info) {
      wrap.innerHTML = '<p class="text-center text-muted" style="padding:60px">Doctor not found</p>';
      return;
    }

    var photoUrl = info.doctorPhoto ? API.getDoctorPhotoUrl(info.doctorName) : '';
    var certs = info.doctorCertifications || [];

    var certsHtml = certs.map(function (c) {
      var key = Object.keys(c)[0];
      var url = c[key];
      return '<a href="' + url + '" target="_blank" class="cert-badge">' + escapeHtml(key.replace('doctorCertifications', 'Cert ')) + '</a>';
    }).join('');

    wrap.innerHTML = [
      '<div class="info-card">',
      photoUrl ? '  <img src="' + photoUrl + '" alt="' + escapeHtml(info.doctorName) + '" class="info-photo" onerror="this.style.display=\'none\'">' : '  <div class="info-avatar">' + escapeHtml((info.doctorName || '?')[0]) + '</div>',
      '  <div class="info-body">',
      '    <h1>' + escapeHtml(info.doctorName) + '</h1>',
      info.doctorAcademicDegree ? '    <p class="info-degree">' + escapeHtml(info.doctorAcademicDegree) + '</p>' : '',
      info.doctorDescription ? '    <h3>About</h3><p>' + escapeHtml(info.doctorDescription) + '</p>' : '',
      certs.length ? '    <h3>Certifications</h3><div class="cert-list">' + certsHtml + '</div>' : '',
      '  </div>',
      '</div>',
      '<div style="text-align:center;margin-top:24px">',
      '  <a href="doctors.html" class="btn btn-ghost">← Back to Doctors</a>',
      '</div>'
    ].join('');
  } catch (err) {
    console.error(err);
    wrap.innerHTML = '<p class="text-center text-muted" style="padding:60px">' + err.message + '</p>';
  }
});