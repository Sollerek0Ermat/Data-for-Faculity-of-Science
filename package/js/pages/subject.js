/**
 * 📖 Subject Details page
 */

let _subject = null;
let _currentTab = 'section';

document.addEventListener('DOMContentLoaded', async () => {
  renderTopbar();
  document.getElementById('footerPlaceholder').outerHTML = renderFooter();

  const id = getQueryParam('id');
  if (!id) {
    showNotFound();
    return;
  }

  try {
    const subjects = await API.getSubjects();
    _subject = subjects.find(s => s.id === id);
    if (!_subject) {
      showNotFound();
      return;
    }

    document.getElementById('subjectTitle').textContent = `${_subject.icon || CONFIG.DEFAULT_SUBJECT_ICON} ${_subject.name}`;
    document.getElementById('subjectInfo').textContent = _subject.description || '';

    document.querySelectorAll('#tabsBar .tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('#tabsBar .tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        renderTab(tab.dataset.tab);
      });
    });

    renderTab('section');
  } catch (err) {
    console.error(err);
    UI.error(err.message || I18N.t('msg_error'));
  }
});

function showNotFound() {
  document.getElementById('subjectTitle').textContent = 'Subject not found';
  document.getElementById('subjectInfo').textContent = 'Go back to courses';
}

async function renderTab(type) {
  _currentTab = type;
  const grid = document.getElementById('sectionsGrid');
  setLoading(grid);

  try {
    const files = await API.getFolder({ subjectId: _subject.id, type });
    if (!files.length) {
      setEmpty(grid, I18N.t('subj_no_content'));
      return;
    }
    grid.innerHTML = files.map(f => sectionCardHTML(f)).join('');

    grid.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const action = btn.dataset.action;
        if (action === 'view') viewSection(id);
        if (action === 'download') downloadSection(id);
      });
    });
  } catch (err) {
    console.error(err);
    setEmpty(grid, err.message || 'Failed to load');
  }
}

function sectionCardHTML(file) {
  const icons = { section: '📄', summary: '📝', resource: '📦', video: '🎬' };
  const icon = icons[file.type] || '📄';

  return `
    <div class="section-card" data-id="${file.id}">
      <div class="section-head">
        <div class="section-icon">${icon}</div>
        <div class="section-info">
          <h4>${escapeHtml(file.title)}</h4>
          <div class="section-meta">
            <span>👤 ${escapeHtml(file.publisher || '—')}</span>
            <span>📅 ${formatDate(file.created_at)}</span>
            <span>💾 ${formatBytes(file.size)}</span>
          </div>
        </div>
      </div>
      <div class="section-actions">
        <button class="action-btn" data-action="view" data-id="${file.id}">
          <span>👁️</span> View
        </button>
        <button class="action-btn primary" data-action="download" data-id="${file.id}">
          <span>⬇️</span> Download
        </button>
      </div>
    </div>
  `;
}

async function viewSection(id) {
  const files = await API.getFolder({ subjectId: _subject.id, type: _currentTab });
  const file = files.find(f => f.id === id);
  if (!file) return;
  UI.info(`👁️ View: ${file.title}`);
}

async function downloadSection(id) {
  const files = await API.getFolder({ subjectId: _subject.id, type: _currentTab });
  const file = files.find(f => f.id === id);
  if (!file) return;
  UI.success(`⬇️ Download: ${file.title}`);
  try {
    await API.downloadFile(file.title, 'download');
  } catch (err) {
    console.error(err);
  }
}