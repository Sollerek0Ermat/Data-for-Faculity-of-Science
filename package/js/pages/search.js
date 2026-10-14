/**
 * 🔍 Smart Search page
 */

let _allDoctors  = [];
let _allSubjects = [];

document.addEventListener('DOMContentLoaded', async () => {
  renderTopbar('search.html');
  const f = document.getElementById('footerPlaceholder');
  if (f) f.outerHTML = renderFooter();

  const input = document.getElementById('searchInput');

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

    const params = new URLSearchParams(location.search);
    const initialQ = params.get('q') || params.get('query') || '';

    if (initialQ) { input.value = initialQ; doSearch(initialQ); }
    input.addEventListener('input', () => doSearch(input.value.trim()));
  } catch (err) {
    console.error(err);
    UI.error(err.message || 'Failed to load');
  }
});

function doSearch(q) {
  const results = document.getElementById('results');
  if (!q) { results.innerHTML = '<div class="text-center text-muted" style="padding:60px">✨ Start typing to search</div>'; return; }

  const nq = q.toLowerCase();
  const doctors = _allDoctors.filter(d => (d.name || '').toLowerCase().includes(nq) || (d.academicDegree || '').toLowerCase().includes(nq));
  const subjects = _allSubjects.filter(s => (s.name || '').toLowerCase().includes(nq) || (s.code || '').toLowerCase().includes(nq) || (s.description || '').toLowerCase().includes(nq));

  if (!doctors.length && !subjects.length) {
    results.innerHTML = '<div class="text-center text-muted" style="padding:60px">😕 No results for "' + escapeHtml(q) + '"</div>';
    return;
  }

  let html = '';

  if (doctors.length) {
    html += '<div class="section-title"><h2>👨‍🏫 Doctors (' + doctors.length + ')</h2></div><div class="grid">';
    html += doctors.map(d => '<div class="doctor-card"><div class="doctor-avatar">' + escapeHtml(getInitials(d.name)) + '</div><h3>' + escapeHtml(d.name) + '</h3><p>' + escapeHtml(d.academicDegree || '') + '</p></div>').join('');
    html += '</div>';
  }

  if (subjects.length) {
    html += '<div class="section-title"><h2>📚 Subjects (' + subjects.length + ')</h2></div><div class="grid">';
    html += subjects.map(s => '<a href="subject.html?id=' + encodeURIComponent(s.name) + '" class="subject-card"><span class="subject-code">' + escapeHtml(s.code || '') + '</span><span class="subject-icon">' + (s.icon || '📚') + '</span><h3>' + escapeHtml(s.name) + '</h3></a>').join('');
    html += '</div>';
  }

  results.innerHTML = html;
}

function getInitials(name) {
  if (!name) return '??';
  var parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}