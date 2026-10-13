/**
 * 🏠 Home page
 */

document.addEventListener('DOMContentLoaded', async () => {
  // ═══════════════════════════════════════════
  // 🔐 تحقق من الجلسة
  // ═══════════════════════════════════════════
  try {
    const profile = await API.getProfile();
    if (profile) {
      Auth.setSession({
        id:    profile.id,
        name:  profile.name,
        email: profile.email,
        role:  profile.role,
      });

      // لو admin → admin.html
      if (profile.role === 'owner' || 
          profile.role === 'moderator' || 
          profile.role === 'doctor') {
        window.location.href = 'admin.html';
        return;
      }
    }
  } catch (err) {
    // مش مسجّل — عادي
    console.log('Not logged in:', err.message);
  }

  // ═══════════════════════════════════════════
  // 🏠 عرض الرئيسية
  // ═══════════════════════════════════════════
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
    UI.error(err.message || I18N.t('msg_error'));
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

  grid.innerHTML = list.map(s => `
    <a href="subject.html?id=${encodeURIComponent(s.name)}" class="subject-card">
      <span class="subject-code">${escapeHtml(s.code || '')}</span>
      <span class="subject-icon">📚</span>
      <h3>${escapeHtml(s.name)}</h3>
      <p>${escapeHtml(s.description || '')}</p>
    </a>
  `).join('');
}