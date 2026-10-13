/**
 * 🏠 Home page
 */

/* ═══ 1) ارسم البيانات فوراً من localStorage (بدون انتظار) ═══ */
(function renderInstant() {
  // نشتغل لما الـ DOM يكون جاهز
  document.addEventListener('DOMContentLoaded', () => {
    // ← نعرض القيم الأولية فوراً
    const subjectsGrid = document.getElementById('subjectsGrid');
    const announceList = document.getElementById('announceList');

    // إذا البيانات موجودة في localStorage، اعرضها فوراً
    try {
      const cachedSubjects = JSON.parse(localStorage.getItem('mock_subjects') || 'null');
      const cachedAnns = JSON.parse(localStorage.getItem('mock_announcements') || 'null');

      if (cachedSubjects && subjectsGrid) {
        renderSubjects(cachedSubjects);
      }
      if (cachedAnns && announceList) {
        renderAnnouncements(cachedAnns);
      }
    } catch (e) { /* ignore */ }
  }, { once: true });
})();

/* ═══ 2) تحميل عادي (بعد ما الصفحة تجهز) ═══ */
document.addEventListener('DOMContentLoaded', async () => {
  renderTopbar('index.html');
  document.getElementById('footerPlaceholder').outerHTML = renderFooter();

  await loadHome();
});

async function loadHome() {
  const announceList = document.getElementById('announceList');
  const subjectsGrid = document.getElementById('subjectsGrid');

  // ما نعرضش الـ loader لو البيانات ظاهرة
  if (!announceList.innerHTML.trim()) setLoading(announceList);
  if (!subjectsGrid.innerHTML.trim()) setLoading(subjectsGrid);

  try {
    const [announcements, subjects] = await Promise.all([
      API.getAnnouncements(),
      API.getSubjects(),
    ]);

    renderAnnouncements(announcements);
    renderSubjects(subjects);
  } catch (err) {
    console.error(err);
    UI.error(err.message || I18N.t('msg_error'));
  }
}

function renderAnnouncements(list) {
  const el = document.getElementById('announceList');
  if (!el) return;

  if (!list || !list.length) {
    el.innerHTML = `<div class="announce-card"><p class="text-muted">No announcements</p></div>`;
    return;
  }

  el.innerHTML = list.map(a => `
    <div class="announce-card">
      <h4>${escapeHtml(a.title)}</h4>
      <p>${escapeHtml(a.body)}</p>
      <small>📅 ${formatDate(a.date)}</small>
    </div>
  `).join('');
}

function renderSubjects(list) {
  const grid = document.getElementById('subjectsGrid');
  if (!grid) return;

  if (!list || !list.length) {
    grid.innerHTML = `<p class="text-muted text-center" style="grid-column:1/-1;padding:40px">No courses</p>`;
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