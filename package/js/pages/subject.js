/**
 * 📖 Subject Details page
 */

let _subject = null;
let _doctors = [];
let _currentTab = 'section';

document.addEventListener('DOMContentLoaded', async () => {
  renderTopbar();
  document.getElementById('footerPlaceholder').outerHTML = renderFooter();

  const id = getQueryParam('id');   // ← id = subjectName
  if (!id) {
    showNotFound();
    return;
  }

  try {
    // 1. Get all subjects
    const subjects = await API.getSubjects();
    _subject = subjects.find(s => s.name === id || s.id === id);
    if (!_subject) {
      showNotFound();
      return;
    }

    document.getElementById('subjectTitle').textContent = '📚 ' + _subject.name;
    document.getElementById('subjectInfo').textContent = _subject.description || '';

    // 2. Get doctors for this subject
    const dws = await API.getDoctorWithSubjects();
    const entry = dws.find(d => d.subjects.some(s => s.name === _subject.name));
    _doctors = entry ? [entry.doctor] : [];

    // 3. Tabs
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
    UI.error(err.message || 'Failed to load');
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

  if (!_doctors.length) {
    setEmpty(grid, 'No content');
    return;
  }

  try {
    // نجيب الملفات لكل دكتور
    const allFiles = [];
    for (const doctor of _doctors) {
      const files = await API.getFolderContent({
        subjectName: _subject.name,
        doctorName:  doctor.name,
        dataType:    type,
      });
      files.forEach(f => allFiles.push(f));
    }

    if (!allFiles.length) {
      setEmpty(grid, 'No content of this type');
      return;
    }

    grid.innerHTML = allFiles.map(f => sectionCardHTML(f, type)).join('');

    grid.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const name = btn.dataset.name;
        const action = btn.dataset.action;
        if (action === 'view') viewSection(name, type);
        if (action === 'download') downloadSection(name, type);
      });
    });
  } catch (err) {
    console.error(err);
    setEmpty(grid, err.message || 'Failed to load');
  }
}

function sectionCardHTML(file, type) {
  const icons = { section: '📄', summary: '📝', resource: '📦', video: '🎬' };
  const icon = icons[type] || '📄';

  const titleKey = {
    section:  'sectionTitle',
    summary:  'summaryTitle',
    resource: 'resourceTitle',
    video:    'videoTitle',
  }[type];

  const publisherKey = {
    section:  'sectionPublishedBy',
    summary:  'summaryPublishedBy',
    resource: 'resourcePublishedBy',
    video:    'videoPublishedBy',
  }[type];

  const dateKey = {
    section:  'sectionPublishDate',
    summary:  'summaryPublishDate',
    resource: 'resourcePublishDate',
    video:    'videoPublishDate',
  }[type];

  const title     = file[titleKey] || '';
  const publisher = file[publisherKey] || '—';
  const date      = file[dateKey];
  const size      = file.size || null;

  return `
    <div class="section-card" data-id="${escapeHtml(title)}">
      <div class="section-head">
        <div class="section-icon">${icon}</div>
        <div class="section-info">
          <h4>${escapeHtml(title)}</h4>
          <div class="section-meta">
            <span>👤 ${escapeHtml(publisher)}</span>
            <span>📅 ${formatDate(date)}</span>
            ${size ? `<span>💾 ${size} MB</span>` : ''}
          </div>
        </div>
      </div>
      <div class="section-actions">
        <button class="action-btn" data-action="view" data-name="${escapeHtml(title)}">
          <span>👁️</span> View
        </button>
        <button class="action-btn primary" data-action="download" data-name="${escapeHtml(title)}">
          <span>⬇️</span> Download
        </button>
      </div>
    </div>
  `;
}

function viewSection(name, type) {
  UI.info(`👁️ View: ${name}`);
  API.downloadFile(type, name, 'view');
}

function downloadSection(name, type) {
  UI.success(`⬇️ Download: ${name}`);
  API.downloadFile(type, name, 'download');
}