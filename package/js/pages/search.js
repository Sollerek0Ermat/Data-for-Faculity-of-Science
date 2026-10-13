/**
 * 🔍 Smart Search page
 */

let _allDoctors = [];
let _allSubjects = [];

document.addEventListener('DOMContentLoaded', async () => {
  renderTopbar('search.html');
  document.getElementById('footerPlaceholder').outerHTML = renderFooter();

  try {
    const data = await API.getDoctorWithSubjects();

    const docMap = new Map();
    const subjMap = new Map();

    data.forEach(({ doctor, subjects }) => {
      docMap.set(doctor.id, doctor);
      subjects.forEach(s => subjMap.set(s.id, s));
    });

    _allDoctors  = Array.from(docMap.values());
    _allSubjects = Array.from(subjMap.values());

    const input = document.getElementById('searchInput');
    input.addEventListener('input', () => doSearch(input.value.trim()));
  } catch (err) {
    console.error(err);
    UI.error(err.message || I18N.t('msg_error'));
  }
});

function doSearch(q) {
  const results = document.getElementById('results');

  if (!q) {
    results.innerHTML = `<div class="text-center text-muted" style="padding:60px">✨ Start typing to search</div>`;
    return;
  }

  const nq = q.toLowerCase();

  const doctors = _allDoctors.filter(d =>
    (d.name || '').toLowerCase().includes(nq) ||
    (d.description || '').toLowerCase().includes(nq)
  );

  const subjects = _allSubjects.filter(s =>
    (s.name || '').toLowerCase().includes(nq) ||
    (s.code || '').toLowerCase().includes(nq) ||
    (s.description || '').toLowerCase().includes(nq)
  );

  if (!doctors.length && !subjects.length) {
    results.innerHTML = `<div class="text-center text-muted" style="padding:60px">😕 No results for "<strong>${escapeHtml(q)}</strong>"</div>`;
    return;
  }

  let html = '';

  if (doctors.length) {
    html += `<div class="section-title"><h2>👨‍🏫 Doctors (${doctors.length})</h2></div>`;
    html += '<div class="grid">';
    html += doctors.map(d => `
      <div class="subject-card" style="cursor:default">
        <span class="subject-icon">👤</span>
        <h3>${escapeHtml(d.name)}</h3>
        <p>${escapeHtml(d.description || '')}</p>
      </div>
    `).join('');
    html += '</div>';
  }

  if (subjects.length) {
    html += `<div class="section-title"><h2>📚 Subjects (${subjects.length})</h2></div>`;
    html += '<div class="grid">';
    html += subjects.map(s => `
      <a href="subject.html?id=${s.id}" class="subject-card">
        <span class="subject-code">${escapeHtml(s.code || '')}</span>
        <span class="subject-icon">${s.icon || CONFIG.DEFAULT_SUBJECT_ICON}</span>
        <h3>${escapeHtml(s.name)}</h3>
        <p>${escapeHtml(s.description || '')}</p>
      </a>
    `).join('');
    html += '</div>';
  }

  results.innerHTML = html;
}