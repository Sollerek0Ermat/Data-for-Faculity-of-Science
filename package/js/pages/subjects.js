/**
 * All Courses page
 */

let _allSubjects = [];

document.addEventListener('DOMContentLoaded', async function() {
  // Auth gate — sends anonymous visitors to login.html
  const profile = await Auth.bootstrap({ requireLogin: true });
  if (!profile) return;

  // ... rest of the original page code
});

function renderSubjects(list) {
  const grid = document.getElementById('subjectsGrid');
  if (!grid) return;

  if (!list || !list.length) {
    setEmpty(grid, 'No courses');
    return;
  }

  const html = list.map(function(s) {
    const name = escapeHtml(s.name || '');
    const code = escapeHtml(s.code || '');
    const desc = escapeHtml(s.description || '');
    const icon = s.icon || '📚';
    const link = 'subject.html?id=' + encodeURIComponent(s.name || '');
    const metaParts = [];
    if (s.department)     metaParts.push(escapeHtml(s.department));
    if (s.levelNumber)    metaParts.push('Level ' + escapeHtml(String(s.levelNumber)));
    if (s.semesterNumber) metaParts.push('Sem ' + escapeHtml(String(s.semesterNumber)));
    const meta = metaParts.join(' • ');

    return [
      '<a href="' + link + '" class="subject-card">',
      code ? '  <span class="subject-code">' + code + '</span>' : '',
      '  <span class="subject-icon">' + icon + '</span>',
      '  <h3>' + name + '</h3>',
      meta ? '  <p style="font-size:11px;opacity:.7">' + meta + '</p>' : '',
      desc ? '  <p>' + desc + '</p>' : '',
      '</a>'
    ].join('');
  }).join('');

  grid.innerHTML = html;
}