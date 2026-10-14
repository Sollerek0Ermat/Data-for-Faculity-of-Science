/**
 * All Courses page
 */

let _allSubjects = [];

document.addEventListener('DOMContentLoaded', async function() {
  renderTopbar('subjects.html');
  const footer = document.getElementById('footerPlaceholder');
  if (footer) footer.outerHTML = renderFooter();

  const grid = document.getElementById('subjectsGrid');
  setLoading(grid);

  try {
    _allSubjects = await API.getSubjects();
    renderSubjects(_allSubjects);
  } catch (err) {
    console.error(err);
    setEmpty(grid, err.message || 'Failed to load courses');
  }

  const input = document.getElementById('searchInput');
  if (input) {
    input.addEventListener('input', function() {
      const q = input.value.trim().toLowerCase();
      const filtered = !q
        ? _allSubjects
        : _allSubjects.filter(function(s) {
            return (s.name || '').toLowerCase().indexOf(q) !== -1 ||
                   (s.code || '').toLowerCase().indexOf(q) !== -1 ||
                   (s.description || '').toLowerCase().indexOf(q) !== -1;
          });
      renderSubjects(filtered);
    });
  }
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