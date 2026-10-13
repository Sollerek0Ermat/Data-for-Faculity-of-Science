/**
 * 🛡️ Admin Dashboard
 */

let _subjects = [];
let _doctors  = [];
let _files    = [];

document.addEventListener('DOMContentLoaded', async () => {
  if (!Auth.requireAuth(['owner', 'moderator', 'doctor'])) return;

  renderTopbar();
  document.getElementById('footerPlaceholder').outerHTML = renderFooter();

  const user = Auth.getUser();
  document.getElementById('welcomeTitle').textContent =
    `👋 Welcome ${user?.name || user?.email || ''}`;

  document.querySelectorAll('#adminTabs .tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('#adminTabs .tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
      tab.classList.add('active');
      document.getElementById('tab-' + tab.dataset.tab).classList.remove('hidden');
    });
  });

  try {
    _subjects = await API.getSubjects();
    _doctors  = await API.getDoctors();
    _files    = await API.getFolder({});

    fillSelects();
    renderPublished();
    renderDoctorsList();
    renderSubjectsList();
  } catch (err) {
    console.error(err);
    UI.error(err.message || 'Failed to load data');
  }

  bindUpload();
  bindAddDoctor();
  bindAddSubject();
});

function fillSelects() {
  const subjSel = document.getElementById('fileSubject');
  const prevSubj = subjSel.value;
  subjSel.innerHTML = '<option value="">Choose subject...</option>';
  _subjects.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = `${s.icon || '📚'} ${s.name}`;
    subjSel.appendChild(opt);
  });
  if (prevSubj) subjSel.value = prevSubj;

  updateDoctorsSelect();
  subjSel.addEventListener('change', updateDoctorsSelect);
}

function updateDoctorsSelect() {
  const subjId = document.getElementById('fileSubject').value;
  const docSel = document.getElementById('fileDoctor');
  docSel.innerHTML = '';

  const list = subjId
    ? _doctors.filter(d => (d.subjectIds || []).includes(subjId))
    : _doctors;

  if (!list.length) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = 'No doctors for this subject';
    docSel.appendChild(opt);
    return;
  }

  list.forEach(d => {
    const opt = document.createElement('option');
    opt.value = d.id;
    opt.textContent = d.name;
    docSel.appendChild(opt);
  });
}

function renderPublished() {
  const tbody = document.getElementById('filesBody');
  const approved = _files.filter(f => f.status !== 'pending');

  if (!approved.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty">No files</td></tr>`;
    return;
  }

  const typeLabels = {
    section:  '📄 Section',
    summary:  '📝 Summary',
    resource: '📦 Resource',
    video:    '🎬 Video',
  };

  tbody.innerHTML = approved.map(f => {
    const subj = _subjects.find(s => s.id === f.subjectId);
    return `
      <tr>
        <td><strong>${escapeHtml(f.title)}</strong></td>
        <td>${typeLabels[f.type] || '📄'}</td>
        <td>${subj ? (subj.icon || '📚') + ' ' + escapeHtml(subj.name) : '—'}</td>
        <td>${formatDate(f.created_at)}</td>
        <td>
          <button class="btn btn-danger btn-sm" data-del-file="${f.id}">🗑️ Delete</button>
        </td>
      </tr>
    `;
  }).join('');

  tbody.querySelectorAll('[data-del-file]').forEach(btn => {
    btn.addEventListener('click', () => deleteFile(btn.dataset.delFile));
  });
}

function renderDoctorsList() {
  const wrap = document.getElementById('doctorsList');
  if (!_doctors.length) {
    wrap.innerHTML = `<p class="text-muted text-center" style="padding:20px">No doctors</p>`;
    return;
  }

  wrap.innerHTML = `<h3 style="font-size:15px;font-weight:800;margin-bottom:12px;color:var(--text)">Current List:</h3>` +
    _doctors.map(d => `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:12px;border-bottom:1px solid rgba(0,220,255,.1)">
        <div>
          <strong>${escapeHtml(d.name)}</strong>
          <div style="color:var(--muted);font-size:12px">
            ${escapeHtml(d.academicDegree || '')} — ${escapeHtml(d.description || '')}
          </div>
        </div>
        <button class="btn btn-danger btn-sm" data-del-doc="${d.id}">🗑️</button>
      </div>
    `).join('');

  wrap.querySelectorAll('[data-del-doc]').forEach(btn => {
    btn.addEventListener('click', () => deleteDoctor(btn.dataset.delDoc));
  });
}

function renderSubjectsList() {
  const wrap = document.getElementById('subjectsList');
  if (!_subjects.length) {
    wrap.innerHTML = `<p class="text-muted text-center" style="padding:20px">No subjects</p>`;
    return;
  }

  wrap.innerHTML = `<h3 style="font-size:15px;font-weight:800;margin-bottom:12px;color:var(--text)">Current List:</h3>` +
    _subjects.map(s => `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:12px;border-bottom:1px solid rgba(0,220,255,.1)">
        <div>
          <strong>${s.icon || '📚'} ${escapeHtml(s.name)}</strong>
          <div style="color:var(--muted);font-size:12px">${escapeHtml(s.code || '')}</div>
        </div>
        <button class="btn btn-danger btn-sm" data-del-subj="${s.id}">🗑️</button>
      </div>
    `).join('');

  wrap.querySelectorAll('[data-del-subj]').forEach(btn => {
    btn.addEventListener('click', () => deleteSubject(btn.dataset.delSubj));
  });
}

async function deleteFile(id) {
  UI.confirm(I18N.t('msg_confirm_delete'), async () => {
    try {
      const file = _files.find(f => f.id === id);
      if (!file) return;
      await API.deleteFile(file);
      _files = _files.filter(f => f.id !== id);
      renderPublished();
      UI.success(I18N.t('msg_deleted'));
    } catch (err) {
      console.error(err);
      UI.error(err.message || I18N.t('msg_error'));
    }
  });
}

async function deleteDoctor(id) {
  UI.confirm(I18N.t('msg_confirm_delete'), async () => {
    try {
      _doctors = _doctors.filter(d => d.id !== id);
      if (CONFIG.USE_MOCK) MockApi.saveDoctors(_doctors);
      renderDoctorsList();
      updateDoctorsSelect();
      UI.success(I18N.t('msg_doctor_deleted'));
    } catch (err) {
      console.error(err);
      UI.error(err.message || I18N.t('msg_error'));
    }
  });
}

async function deleteSubject(id) {
  UI.confirm(I18N.t('msg_confirm_delete'), async () => {
    try {
      _subjects = _subjects.filter(s => s.id !== id);
      if (CONFIG.USE_MOCK) MockApi.saveSubjects(_subjects);
      renderSubjectsList();
      fillSelects();
      UI.success(I18N.t('msg_subject_deleted'));
    } catch (err) {
      console.error(err);
      UI.error(err.message || I18N.t('msg_error'));
    }
  });
}

function bindUpload() {
  document.getElementById('uploadBtn').addEventListener('click', async () => {
    const title     = document.getElementById('fileTitle').value.trim();
    const type      = document.getElementById('fileType').value;
    const subjectId = document.getElementById('fileSubject').value;
    const doctorId  = document.getElementById('fileDoctor').value;
    const fileInput = document.getElementById('fileInput');
    const file      = fileInput.files[0];

    if (!title)     return UI.error(I18N.t('msg_enter_title'));
    if (!subjectId) return UI.error(I18N.t('msg_choose_subject'));
    if (!doctorId)  return UI.error(I18N.t('msg_choose_doctor'));
    if (!file)      return UI.error(I18N.t('msg_choose_file'));

    const doctor = _doctors.find(d => d.id === doctorId);

    if (CONFIG.USE_MOCK) {
      const newFile = {
        id: uid('file'),
        title, type,
        subjectId, doctorId,
        publisher: doctor?.name || 'Admin',
        size: file.size,
        created_at: new Date().toISOString(),
        status: 'approved',
      };
      _files.push(newFile);
      MockApi.saveFiles(_files);

      UI.success(I18N.t('msg_file_uploaded'));
      document.getElementById('fileTitle').value = '';
      fileInput.value = '';
      renderPublished();
      return;
    }

    try {
      const fd = new FormData();
      fd.append('data', JSON.stringify([{
        subjectName: _subjects.find(s => s.id === subjectId)?.name,
        doctorName: doctor?.name,
        sectionTitle: title,
        sectionFile: 'file1',
      }]));
      fd.append('file1', file);

      await API.uploadFile(fd);
      UI.success(I18N.t('msg_file_uploaded'));
      document.getElementById('fileTitle').value = '';
      fileInput.value = '';
      _files = await API.getFolder({});
      renderPublished();
    } catch (err) {
      console.error(err);
      UI.error(err.message || I18N.t('msg_error'));
    }
  });
}

function bindAddDoctor() {
  document.getElementById('addDoctorBtn').addEventListener('click', () => {
    const name   = document.getElementById('doctorName').value.trim();
    const degree = document.getElementById('doctorDegree').value.trim();
    const desc   = document.getElementById('doctorDesc').value.trim();

    if (!name) return UI.error(I18N.t('msg_enter_doctor'));

    if (_doctors.some(d => d.name.toLowerCase() === name.toLowerCase())) {
      return UI.error(I18N.t('msg_doctor_exists'));
    }

    const newDoc = {
      id: uid('doc'),
      name,
      academicDegree: degree || 'PhD',
      description: desc || '',
      subjectIds: [],
    };

    _doctors.push(newDoc);
    if (CONFIG.USE_MOCK) MockApi.saveDoctors(_doctors);

    UI.success(I18N.t('msg_doctor_added'));
    document.getElementById('doctorName').value = '';
    document.getElementById('doctorDegree').value = '';
    document.getElementById('doctorDesc').value = '';
    renderDoctorsList();
    updateDoctorsSelect();
  });
}

function bindAddSubject() {
  document.getElementById('addSubjectBtn').addEventListener('click', () => {
    const name = document.getElementById('subjectName').value.trim();
    const icon = document.getElementById('subjectIcon').value.trim() || CONFIG.DEFAULT_SUBJECT_ICON;

    if (!name) return UI.error(I18N.t('msg_enter_subject'));

    if (_subjects.some(s => s.name.toLowerCase() === name.toLowerCase())) {
      return UI.error(I18N.t('msg_subject_exists'));
    }

    const newSubj = {
      id: uid('s'),
      name,
      icon,
      code: '',
      description: '',
    };

    _subjects.push(newSubj);
    if (CONFIG.USE_MOCK) MockApi.saveSubjects(_subjects);

    UI.success(I18N.t('msg_subject_added'));
    document.getElementById('subjectName').value = '';
    document.getElementById('subjectIcon').value = '';
    renderSubjectsList();
    fillSelects();
  });
}