/**
 * Home page
 */

document.addEventListener('DOMContentLoaded', async function() {
  // 1) Verify session via cookies
  const profile = await Auth.syncSession();
  if (!profile || !profile.role) {
    window.location.href = 'login.html';
    return;
  }

  // 2) Intro redirect (first visit only)
  const introSeen = localStorage.getItem('intro_seen_v3');
  const skipIntro = new URLSearchParams(location.search).get('skip_intro');

  if (!introSeen && !skipIntro) {
    localStorage.setItem('intro_seen_v3', '1');
    window.location.replace('intro.html?next=index.html');
    return;
  }

  // 3) Render page
  renderTopbar('index.html');
  const footer = document.getElementById('footerPlaceholder');
  if (footer) footer.outerHTML = renderFooter();

  await loadHome();
});

async function loadHome() {
  const subjectsGrid = document.getElementById('subjectsGrid');
  if (!subjectsGrid) return;

  setLoading(subjectsGrid);

  try {
    const subjects = await API.getSubjects();

    if (!subjects || !subjects.length) {
      setEmpty(subjectsGrid, 'No courses available');
      return;
    }

    renderSubjects(subjects);
  } catch (err) {
    console.error(err);
    setEmpty(subjectsGrid, err.message || 'Failed to load');
  }
}

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
    const icon = s.icon || CONFIG.DEFAULT_SUBJECT_ICON;
    const link = 'subject.html?id=' + encodeURIComponent(s.name || '');
    const metaParts = [];
    if (s.department)     metaParts.push(escapeHtml(s.department));
    if (s.levelNumber)    metaParts.push('Level ' + escapeHtml(String(s.levelNumber)));
    if (s.semesterNumber) metaParts.push('Sem ' + escapeHtml(String(s.semesterNumber)));
    const meta = metaParts.join(' | ');

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