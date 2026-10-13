/**
 * 📚 All Courses page
 */

let _allSubjects = [];

document.addEventListener('DOMContentLoaded', async () => {
  renderTopbar('subjects.html');
  document.getElementById('footerPlaceholder').outerHTML = renderFooter();

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
  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    const filtered = !q
      ? _allSubjects
      : _allSubjects.filter(s =>
          (s.name || '').toLowerCase().includes(q) ||
          (s.code || '').toLowerCase().includes(q) ||
          (s.description || '').toLowerCase().includes(q)
        );
    renderSubjects(filtered);
  });
});

function renderSubjects(list) {
  const grid = document.getElementById('subjectsGrid');
  if (!list.length) {
    setEmpty(grid, 'No courses');
    return;
  }
  grid.innerHTML = list.map(s => `
    <a href="subject.html?id=${s.id}" class="subject-card">
      <span class="subject-code">${escapeHtml(s.code || '')}</span>
      <span class="subject-icon">${s.icon || CONFIG.DEFAULT_SUBJECT_ICON}</span>
      <h3>${escapeHtml(s.name)}</h3>
      <p>${escapeHtml(s.description || '')}</p>
    </a>
  `).join('');
}