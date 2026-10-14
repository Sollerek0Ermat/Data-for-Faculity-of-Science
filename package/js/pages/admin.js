/**
 * Admin Dashboard — Full
 */

let _state = {
  userRole: 'user',
  userName: '',
  departments: [],
  levels: [],
  semesters: [],
  subjects: [],
  doctors: [],
  links: [],
  // Content browse path
  path: { department: null, levelNumber: null, semesterNumber: null, subject: null, doctor: null, dataType: null }
};

document.addEventListener('DOMContentLoaded', async () => {
  // Sync session from cookie first (avoids false rejection)
  await Auth.syncSession();

  if (!Auth.requireAuth(['owner', 'moderator', 'doctor'])) return;

  renderTopbar('admin.html');
  const footer = document.getElementById('footerPlaceholder');
  if (footer) footer.outerHTML = renderFooter();

  const user = Auth.getUser();
  _state.userRole = (user && user.role) ? user.role : 'user';
  _state.userName = (user && user.name) ? user.name : 'Admin';

  document.getElementById('welcomeTitle').textContent = '👋 Welcome ' + _state.userName;
  document.getElementById('userRole').textContent = 'Role: ' + _state.userRole.toUpperCase();

  // Tabs
  document.querySelectorAll('#adminTabs .tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('#adminTabs .tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
      tab.classList.add('active');
      const target = document.getElementById('tab-' + tab.dataset.tab);
      if (target) target.classList.remove('hidden');

      // Load data on first open
      if (tab.dataset.tab === 'structure' && !_state.departments.length) loadStructure();
      if (tab.dataset.tab === 'doctors' && !_state.doctors.length) loadDoctorsTab();
      if (tab.dataset.tab === 'content') loadContentBrowse();
    });
  });

  // Hide owner-only tabs for non-owners
  if (_state.userRole !== 'owner') {
    const ownerTabs = ['structure', 'users'];
    ownerTabs.forEach(t => {
      const btn = document.querySelector(`[data-tab="${t}"]`);
      if (btn) btn.style.display = 'none';
    });
  }

  // Load overview
  await loadOverview();
  AdminUI.init();
});

/* ═══════════════════════════════════════════
   OVERVIEW
   ═══════════════════════════════════════════ */
async function loadOverview() {
  try {
    const [depts, dws] = await Promise.all([
      API.getFolders({}).catch(() => []),
      API.getDoctorWithSubjects().catch(() => [])
    ]);

    const deptCount = depts.length;
    const docSet = new Set();
    const subjSet = new Set();
    dws.forEach(item => {
      docSet.add(item.doctor.name);
      (item.subjects || []).forEach(s => subjSet.add(s.name));
    });

    document.getElementById('statsGrid').innerHTML = [
      stat('🏛️', 'Departments', deptCount),
      stat('👨‍🏫', 'Doctors', docSet.size),
      stat('📖', 'Subjects', subjSet.size),
      stat('🔗', 'Links', dws.length)
    ].join('');

    document.getElementById('quickStats').innerHTML = `
      <p style="color:var(--muted);font-size:14px;line-height:1.8">
        <strong style="color:var(--text)">Logged in as:</strong> ${escapeHtml(_state.userName)}<br>
        <strong style="color:var(--text)">Role:</strong> ${_state.userRole}<br>
        <strong style="color:var(--text)">Server:</strong> ${CONFIG.API_URL || '(same origin)'}<br>
        <strong style="color:var(--text)">Departments:</strong> ${deptCount}<br>
        <strong style="color:var(--text)">Doctors:</strong> ${docSet.size}<br>
        <strong style="color:var(--text)">Subjects:</strong> ${subjSet.size}
      </p>
    `;
  } catch (e) {
    console.error('Overview failed:', e);
  }
}

function stat(icon, label, value) {
  return `
    <div class="stat-card">
      <div class="stat-icon">${icon}</div>
      <div class="stat-value">${value}</div>
      <div class="stat-label">${label}</div>
    </div>
  `;
}

/* ═══════════════════════════════════════════
   STRUCTURE — Load
   ═══════════════════════════════════════════ */
async function loadStructure() {
  await Promise.all([
    loadDepartments(),
    loadLevels(),
    loadSemesters(),
    loadSubjects()
  ]);
}

async function loadDepartments() {
  try {
    _state.departments = await API.getFolders({}) || [];
    renderDepartments();
  } catch (e) {
    document.getElementById('deptsList').innerHTML = errBox(e.message);
  }
}

async function loadLevels() {
  const wrap = document.getElementById('levelsList');
  try {
    let all = [];
    for (const d of _state.departments) {
      const deptName = d.depName || d.name;
      const levels = await API.getFolders({ department: deptName }).catch(() => []);
      levels.forEach(l => all.push({ department: deptName, levelNumber: l.levelNumber }));
    }
    _state.levels = all;
    renderLevels();
  } catch (e) {
    wrap.innerHTML = errBox(e.message);
  }
}

async function loadSemesters() {
  const wrap = document.getElementById('semestersList');
  try {
    let all = [];
    for (const l of _state.levels) {
      const sems = await API.getFolders({ department: l.department, levelNumber: l.levelNumber }).catch(() => []);
      sems.forEach(s => all.push({ department: l.department, levelNumber: l.levelNumber, semesterNumber: s.semesterNumber }));
    }
    _state.semesters = all;
    renderSemesters();
  } catch (e) {
    wrap.innerHTML = errBox(e.message);
  }
}

async function loadSubjects() {
  const wrap = document.getElementById('subjectsList');
  try {
    const dws = await API.getDoctorWithSubjects();
    const subjMap = new Map();
    dws.forEach(item => {
      (item.subjects || []).forEach(s => {
        if (!subjMap.has(s.name)) subjMap.set(s.name, s);
      });
    });
    _state.subjects = Array.from(subjMap.values());
    renderSubjects();
  } catch (e) {
    wrap.innerHTML = errBox(e.message);
  }
}

/* ═══════════════════════════════════════════
   RENDER LISTS
   ═══════════════════════════════════════════ */
function renderDepartments() {
  const wrap = document.getElementById('deptsList');
  if (!_state.departments.length) { wrap.innerHTML = emptyBox('No departments'); return; }

  wrap.innerHTML = _state.departments.map(d => {
    const name = d.depName || d.name;
    return row(
      '🏛️',
      name,
      d.code || '',
      [
        btn('✏️ Edit', 'btn-ghost', () => AdminUI.openEditDepartment(name)),
        btn('🗑️ Delete', 'btn-danger', () => AdminUI.deleteDepartment(name))
      ]
    );
  }).join('');
}

function renderLevels() {
  const wrap = document.getElementById('levelsList');
  if (!_state.levels.length) { wrap.innerHTML = emptyBox('No levels'); return; }

  wrap.innerHTML = _state.levels.map(l => {
    return row(
      '📊',
      `${l.department} — Level ${l.levelNumber}`,
      '',
      [
        btn('🗑️ Delete', 'btn-danger', () => AdminUI.deleteLevel(l.department, l.levelNumber))
      ]
    );
  }).join('');
}

function renderSemesters() {
  const wrap = document.getElementById('semestersList');
  if (!_state.semesters.length) { wrap.innerHTML = emptyBox('No semesters'); return; }

  wrap.innerHTML = _state.semesters.map(s => {
    return row(
      '📅',
      `${s.department} — Level ${s.levelNumber} — Sem ${s.semesterNumber}`,
      '',
      [
        btn('🗑️ Delete', 'btn-danger', () => AdminUI.deleteSemester(s.department, s.levelNumber, s.semesterNumber))
      ]
    );
  }).join('');
}

function renderSubjects() {
  const wrap = document.getElementById('subjectsList');
  if (!_state.subjects.length) { wrap.innerHTML = emptyBox('No subjects'); return; }

  wrap.innerHTML = _state.subjects.map(s => {
    return row(
      s.icon || '📖',
      s.name,
      s.code || '',
      [
        btn('✏️ Edit', 'btn-ghost', () => AdminUI.openEditSubject(s.name)),
        btn('🗑️ Delete', 'btn-danger', () => AdminUI.deleteSubject(s.name))
      ]
    );
  }).join('');
}

/* ═══════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════ */
function row(icon, title, sub, actions) {
  return `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 14px;border-bottom:1px solid rgba(0,220,255,.1);gap:12px;flex-wrap:wrap">
      <div style="flex:1;min-width:200px">
        <div style="font-size:15px;font-weight:600;color:#fff">
          <span style="margin-right:6px">${icon}</span>${escapeHtml(title)}
        </div>
        ${sub ? `<div style="color:var(--muted);font-size:12px;margin-top:2px">${escapeHtml(sub)}</div>` : ''}
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        ${actions.join('')}
      </div>
    </div>
  `;
}

function btn(label, cls, onClick) {
  const id = 'btn_' + Math.random().toString(36).slice(2);
  setTimeout(() => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', onClick);
  }, 0);
  return `<button id="${id}" class="btn ${cls} btn-sm" style="padding:6px 12px;font-size:12px">${label}</button>`;
}

function emptyBox(msg) {
  return `<p style="color:var(--muted);text-align:center;padding:24px;font-size:13px">${escapeHtml(msg)}</p>`;
}

function errBox(msg) {
  return `<p style="color:var(--danger);text-align:center;padding:24px;font-size:13px">❌ ${escapeHtml(msg)}</p>`;
}

/* ═══════════════════════════════════════════
   CONTENT BROWSE (الشجرة الهرمية)
   ═══════════════════════════════════════════ */
async function loadContentBrowse() {
  await renderContentLevel();
}

async function renderContentLevel() {
  const p = _state.path;
  const grid = document.getElementById('contentGrid');
  const title = document.getElementById('contentTitle');
  const actions = document.getElementById('contentActions');

  renderBreadcrumbs();
  grid.innerHTML = '<div class="loader"></div>';
  actions.innerHTML = '';

  try {
    let items = [];
    let levelName = '';

    if (!p.department) {
      items = await API.getFolders({});
      levelName = '🏛️ Departments';
      actions.innerHTML = `<button class="btn btn-primary btn-sm" onclick="AdminUI.openAddDepartment()">➕ Add Department</button>`;
    } else if (!p.levelNumber) {
      items = await API.getFolders({ department: p.department });
      levelName = `📊 Levels in ${p.department}`;
      actions.innerHTML = `<button class="btn btn-primary btn-sm" onclick="AdminUI.openAddLevel()">➕ Add Level</button>`;
    } else if (!p.semesterNumber) {
      items = await API.getFolders({ department: p.department, levelNumber: p.levelNumber });
      levelName = `📅 Semesters in Level ${p.levelNumber}`;
      actions.innerHTML = `<button class="btn btn-primary btn-sm" onclick="AdminUI.openAddSemester()">➕ Add Semester</button>`;
    } else if (!p.subject) {
      items = await API.getFolders({ department: p.department, levelNumber: p.levelNumber, semesterNumber: p.semesterNumber });
      levelName = `📖 Subjects in Sem ${p.semesterNumber}`;
      actions.innerHTML = `<button class="btn btn-primary btn-sm" onclick="AdminUI.openAddSubject()">➕ Add Subject</button>`;
    } else if (!p.doctor) {
      items = await API.getFolders({ department: p.department, levelNumber: p.levelNumber, semesterNumber: p.semesterNumber, subject: p.subject });
      levelName = `👨‍🏫 Doctors for ${p.subject}`;
      actions.innerHTML = `<button class="btn btn-primary btn-sm" onclick="AdminUI.openLinkDoctor()">🔗 Link Doctor</button>`;
    } else if (!p.dataType) {
      items = await API.getFolders({ department: p.department, levelNumber: p.levelNumber, semesterNumber: p.semesterNumber, subject: p.subject, doctor: p.doctor });
      levelName = `📂 Content Types`;
    } else {
      items = await API.getFolders({ department: p.department, levelNumber: p.levelNumber, semesterNumber: p.semesterNumber, subject: p.subject, doctor: p.doctor, dataType: p.dataType });
      levelName = `📄 Files`;
      actions.innerHTML = `<button class="btn btn-primary btn-sm" onclick="AdminUI.openAddFile('${p.dataType}')">➕ Add ${p.dataType}</button>`;
    }

    title.textContent = levelName;
    renderContentItems(items);
  } catch (e) {
    grid.innerHTML = errBox(e.message);
  }
}

function renderContentItems(items) {
  const grid = document.getElementById('contentGrid');
  const p = _state.path;

  if (!items || !items.length) {
    grid.innerHTML = emptyBox('No items at this level');
    return;
  }

  grid.innerHTML = items.map(item => {
    // Department
    if (item.depName) {
      return contentCard('🏛️', item.depName, item.code || '', 'department',
        () => { _state.path.department = item.depName; renderContentLevel(); },
        () => AdminUI.openEditDepartment(item.depName),
        () => AdminUI.deleteDepartment(item.depName)
      );
    }
    // Level
    if (item.levelNumber !== undefined) {
      return contentCard('📊', 'Level ' + item.levelNumber, '', 'level',
        () => { _state.path.levelNumber = item.levelNumber; renderContentLevel(); },
        null,
        () => AdminUI.deleteLevel(p.department, item.levelNumber)
      );
    }
    // Semester
    if (item.semesterNumber !== undefined) {
      return contentCard('📅', 'Semester ' + item.semesterNumber, '', 'semester',
        () => { _state.path.semesterNumber = item.semesterNumber; renderContentLevel(); },
        null,
        () => AdminUI.deleteSemester(p.department, p.levelNumber, item.semesterNumber)
      );
    }
    // Subject
    if (item.subjectName) {
      const icon = (window.Mappers && Mappers._getIcon) ? Mappers._getIcon(item.subjectName) : '📖';
      return contentCard(icon, item.subjectName, '', 'subject',
        () => { _state.path.subject = item.subjectName; renderContentLevel(); },
        () => AdminUI.openEditSubject(item.subjectName),
        () => AdminUI.deleteSubject(item.subjectName)
      );
    }
    // Doctor
    if (item.doctorName) {
      return contentCard('👨‍🏫', item.doctorName, '', 'doctor',
        () => { _state.path.doctor = item.doctorName; renderContentLevel(); },
        null,
        null
      );
    }
    // DataType
    if (item.dataType) {
      const icon = { sections: '📄', videos: '🎬', summaries: '📝', recourses: '📦' }[item.dataType] || '📁';
      return contentCard(icon, item.dataType, '', 'datatype',
        () => { _state.path.dataType = item.dataType.replace(/s$/, '').replace('recourse', 'resource'); renderContentLevel(); },
        null,
        null
      );
    }
    // File
    const titleKey = p.dataType === 'section' ? 'sectionTitle'
      : p.dataType === 'video' ? 'videoTitle'
      : p.dataType === 'summary' ? 'summaryTitle'
      : 'resourceTitle';
    const fileTitle = item[titleKey] || '(no title)';
    return contentCard('📄', fileTitle, 'Published by ' + (item.sectionPublishedBy || item.videoPublishedBy || item.summaryPublishedBy || item.resourcePublishedBy || '?'), 'file',
      null,
      () => AdminUI.openEditFile(p.dataType, fileTitle),
      () => AdminUI.deleteFile(p.dataType, fileTitle)
    );
  }).join('');
}

function contentCard(icon, title, sub, type, onClick, onEdit, onDelete) {
  const id = 'card_' + Math.random().toString(36).slice(2);
  const mainId = 'main_' + Math.random().toString(36).slice(2);
  setTimeout(() => {
    if (onClick) {
      const el = document.getElementById(mainId);
      if (el) el.addEventListener('click', onClick);
    }
  }, 0);
  return `
    <div style="background:rgba(0,229,255,.04);border:1px solid var(--line-glass);border-radius:10px;padding:14px 16px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
      <div id="${mainId}" ${onClick ? 'style="cursor:pointer;flex:1"' : 'style="flex:1"'}>
        <div style="font-size:15px;font-weight:600;color:#fff">
          <span style="margin-right:8px">${icon}</span>${escapeHtml(title)}
        </div>
        ${sub ? `<div style="color:var(--muted);font-size:12px;margin-top:2px">${escapeHtml(sub)}</div>` : ''}
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        ${onEdit ? btn('✏️ Edit', 'btn-ghost', onEdit) : ''}
        ${onDelete ? btn('🗑️ Delete', 'btn-danger', onDelete) : ''}
      </div>
    </div>
  `;
}

function renderBreadcrumbs() {
  const el = document.getElementById('contentBreadcrumbs');
  const p = _state.path;
  const parts = [`<a href="#" data-action="resetPath" id="crumb_home">🏠 Home</a>`];

  if (p.department) parts.push(`<span>${escapeHtml(p.department)}</span>`);
  if (p.levelNumber) parts.push(`<span>Level ${p.levelNumber}</span>`);
  if (p.semesterNumber) parts.push(`<span>Sem ${p.semesterNumber}</span>`);
  if (p.subject) parts.push(`<span>${escapeHtml(p.subject)}</span>`);
  if (p.doctor) parts.push(`<span>${escapeHtml(p.doctor)}</span>`);
  if (p.dataType) parts.push(`<span>${escapeHtml(p.dataType)}</span>`);

  el.innerHTML = parts.join(' <span class="breadcrumb-sep">/</span> ');
}

/* ═══════════════════════════════════════════
   DOCTORS TAB
   ═══════════════════════════════════════════ */
async function loadDoctorsTab() {
  try {
    const dws = await API.getDoctorWithSubjects();
    const docMap = new Map();
    dws.forEach(item => {
      const doc = item.doctor;
      if (!docMap.has(doc.name)) docMap.set(doc.name, { doctor: doc, subjects: [] });
      docMap.get(doc.name).subjects.push(...(item.subjects || []));
    });
    _state.doctors = Array.from(docMap.values());
    _state.links = dws;
    renderDoctorsTab();
    renderLinks();
  } catch (e) {
    document.getElementById('doctorsList2').innerHTML = errBox(e.message);
  }
}

function renderDoctorsTab() {
  const wrap = document.getElementById('doctorsList2');
  if (!_state.doctors.length) { wrap.innerHTML = emptyBox('No doctors'); return; }

  wrap.innerHTML = _state.doctors.map(item => {
    const d = item.doctor;
    const subjects = item.subjects.map(s => s.name).join(', ');
    return row(
      '👨‍🏫',
      d.name,
      `${d.academicDegree || ''} ${subjects ? '• ' + subjects : ''}`,
      [
        btn('✏️ Edit', 'btn-ghost', () => AdminUI.openEditDoctor(d.name)),
        btn('🗑️ Delete', 'btn-danger', () => AdminUI.deleteDoctor(d.name))
      ]
    );
  }).join('');
}

function renderLinks() {
  const wrap = document.getElementById('linksList');
  if (!_state.links.length) { wrap.innerHTML = emptyBox('No links'); return; }

  wrap.innerHTML = _state.links.map(link => {
    return row(
      '🔗',
      `${link.subjectName} ↔ ${link.doctorName}`,
      '',
      [
        btn('🔓 Unlink', 'btn-danger', () => AdminUI.unlinkDoctor(link))
      ]
    );
  }).join('');
}

/* ═══════════════════════════════════════════
   AdminUI — Global Actions
   ═══════════════════════════════════════════ */
const AdminUI = {
  init() {
    // Override default tab loading
    document.querySelectorAll('#adminTabs .tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const t = tab.dataset.tab;
        if (t === 'structure') loadStructure();
        if (t === 'doctors') loadDoctorsTab();
        if (t === 'content') loadContentBrowse();
      });
    });

    // ⚡ ربط الأزرار (بدل onclick)
    const actions = {
      openAddDepartment: () => AdminUI.openAddDepartment(),
      openAddLevel:      () => AdminUI.openAddLevel(),
      openAddSemester:   () => AdminUI.openAddSemester(),
      openAddSubject:    () => AdminUI.openAddSubject(),
      openAddDoctor:     () => AdminUI.openAddDoctor(),
      openLinkDoctor:    () => AdminUI.openLinkDoctor(),
      changeRole:        () => AdminUI.changeRole(),
      changeLockTrue:    () => AdminUI.changeLock(true),
      changeLockFalse:   () => AdminUI.changeLock(false),
      resetPath:         () => AdminUI.resetPath()
    };

    document.querySelectorAll('[data-action]').forEach(el => {
      const action = el.dataset.action;
      if (actions[action]) {
        el.addEventListener('click', actions[action]);
      }
    });
  },

  resetPath() {
    _state.path = { department: null, levelNumber: null, semesterNumber: null, subject: null, doctor: null, dataType: null };
    renderContentLevel();
  },

  /* ═══ MODAL ═══ */
  modal(title, bodyHtml, onSave) {
    const root = document.getElementById('modalRoot');
    root.innerHTML = `
      <div id="modalOverlay" style="position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px)">
        <div style="background:var(--panel);border:1px solid var(--cyan);border-radius:14px;max-width:520px;width:100%;max-height:90vh;overflow-y:auto;padding:24px;box-shadow:0 0 40px rgba(0,229,255,.3)">
          <h3 style="color:var(--cyan);font-size:18px;margin-bottom:18px">${title}</h3>
          <div id="modalBody">${bodyHtml}</div>
          <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:20px">
            <button class="btn btn-ghost btn-sm" onclick="AdminUI.closeModal()">Cancel</button>
            <button class="btn btn-primary btn-sm" id="modalSaveBtn">💾 Save</button>
          </div>
        </div>
      </div>
    `;
    document.getElementById('modalSaveBtn').addEventListener('click', onSave);
  },

  closeModal() {
    document.getElementById('modalRoot').innerHTML = '';
  },

  /* ═══ DEPARTMENT ═══ */
  openAddDepartment() {
    this.modal('➕ Add Department', `
      <div class="field"><label>Name</label><input type="text" id="mDeptName" placeholder="computer science"></div>
      <div class="field"><label>Description</label><input type="text" id="mDeptDesc" placeholder="..."></div>
      <div class="field"><label>Expected Jobs</label><input type="text" id="mDeptJobs" placeholder="..."></div>
      <div class="field"><label>Code</label><input type="text" id="mDeptCode" placeholder="CS"></div>
    `, async () => {
      const d = {
        DepartmentName: document.getElementById('mDeptName').value.trim(),
        departmentDescription: document.getElementById('mDeptDesc').value.trim(),
        departmentExpectedJobs: document.getElementById('mDeptJobs').value.trim(),
        departmentCode: document.getElementById('mDeptCode').value.trim()
      };
      if (!d.DepartmentName) return UI.error('Name required');
      try {
        await API.addDepartments([d]);
        UI.success('Department added');
        AdminUI.closeModal();
        await loadDepartments();
        await loadLevels();
      } catch (e) { UI.error(e.message); }
    });
  },

  openEditDepartment(oldName) {
    this.modal('✏️ Edit Department', `
      <div class="field"><label>Name</label><input type="text" id="mDeptName" value="${escapeHtml(oldName)}" readonly style="opacity:.6"></div>
      <div class="field"><label>New Name</label><input type="text" id="mDeptNew" placeholder="new name"></div>
      <div class="field"><label>Description</label><input type="text" id="mDeptDesc"></div>
      <div class="field"><label>Expected Jobs</label><input type="text" id="mDeptJobs"></div>
      <div class="field"><label>Code</label><input type="text" id="mDeptCode"></div>
    `, async () => {
      const p = {
        departmentName: oldName,
        newDepartmentName: document.getElementById('mDeptNew').value.trim() || undefined,
        departmentDescription: document.getElementById('mDeptDesc').value.trim() || undefined,
        departmentExpectedJobs: document.getElementById('mDeptJobs').value.trim() || undefined,
        newDepartmentCode: document.getElementById('mDeptCode').value.trim() || undefined
      };
      try {
        await API.editDepartment(p);
        UI.success('Department updated');
        AdminUI.closeModal();
        await loadDepartments();
      } catch (e) { UI.error(e.message); }
    });
  },

  async deleteDepartment(name) {
    if (!confirm(`Delete department "${name}"?`)) return;
    try {
      await API.deleteDepartments([name]);
      UI.success('Deleted');
      await loadDepartments();
    } catch (e) { UI.error(e.message); }
  },

  /* ═══ LEVEL ═══ */
  openAddLevel() {
    this.modal('➕ Add Level', `
      <div class="field"><label>Department</label><input type="text" id="mLvlDept" placeholder="computer science"></div>
      <div class="field"><label>Level Number</label><input type="number" id="mLvlNum" value="1"></div>
    `, async () => {
      const p = {
        DepartmentName: document.getElementById('mLvlDept').value.trim(),
        levelNumber: parseInt(document.getElementById('mLvlNum').value)
      };
      if (!p.DepartmentName) return UI.error('Department required');
      try {
        await API.addLevels([p]);
        UI.success('Level added');
        AdminUI.closeModal();
        await loadLevels();
      } catch (e) { UI.error(e.message); }
    });
  },

  async deleteLevel(dept, num) {
    if (!confirm(`Delete Level ${num} in ${dept}?`)) return;
    try {
      await API.deleteLevels([{ DepartmentName: dept, levelNumber: num }]);
      UI.success('Deleted');
      await loadLevels();
    } catch (e) { UI.error(e.message); }
  },

  /* ═══ SEMESTER ═══ */
  openAddSemester() {
    this.modal('➕ Add Semester', `
      <div class="field"><label>Department</label><input type="text" id="mSemDept" placeholder="computer science"></div>
      <div class="field"><label>Level Number</label><input type="number" id="mSemLvl" value="1"></div>
      <div class="field"><label>Semester Number</label><input type="number" id="mSemNum" value="1"></div>
    `, async () => {
      const p = {
        DepartmentName: document.getElementById('mSemDept').value.trim(),
        levelNumber: parseInt(document.getElementById('mSemLvl').value),
        semesterNumber: parseInt(document.getElementById('mSemNum').value)
      };
      if (!p.DepartmentName) return UI.error('Department required');
      try {
        await API.addSemesters([p]);
        UI.success('Semester added');
        AdminUI.closeModal();
        await loadSemesters();
      } catch (e) { UI.error(e.message); }
    });
  },

  async deleteSemester(dept, lvl, sem) {
    if (!confirm(`Delete Semester ${sem} in Level ${lvl}?`)) return;
    try {
      await API.deleteSemesters([{ DepartmentName: dept, levelNumber: lvl, semesterNumber: sem }]);
      UI.success('Deleted');
      await loadSemesters();
    } catch (e) { UI.error(e.message); }
  },

  /* ═══ SUBJECT ═══ */
  openAddSubject() {
    this.modal('➕ Add Subject', `
      <div class="field"><label>Department</label><input type="text" id="mSubDept" placeholder="computer science"></div>
      <div class="field"><label>Level</label><input type="number" id="mSubLvl" value="2"></div>
      <div class="field"><label>Semester</label><input type="number" id="mSubSem" value="1"></div>
      <div class="field"><label>Subject Name</label><input type="text" id="mSubName" placeholder="algorithm"></div>
      <div class="field"><label>Description</label><input type="text" id="mSubDesc"></div>
      <div class="field"><label>Code</label><input type="text" id="mSubCode"></div>
    `, async () => {
      const p = {
        DepartmentName: document.getElementById('mSubDept').value.trim(),
        levelNumber: parseInt(document.getElementById('mSubLvl').value),
        semesterNumber: parseInt(document.getElementById('mSubSem').value),
        subjectName: document.getElementById('mSubName').value.trim(),
        subjectDescription: document.getElementById('mSubDesc').value.trim(),
        subjectCode: document.getElementById('mSubCode').value.trim()
      };
      if (!p.DepartmentName || !p.subjectName) return UI.error('Dept + Name required');
      try {
        await API.addSubjects([p]);
        UI.success('Subject added');
        AdminUI.closeModal();
        await loadSubjects();
      } catch (e) { UI.error(e.message); }
    });
  },

  openEditSubject(oldName) {
    this.modal('✏️ Edit Subject', `
      <div class="field"><label>Department</label><input type="text" id="mSubDept" placeholder="computer science"></div>
      <div class="field"><label>Level</label><input type="number" id="mSubLvl" value="2"></div>
      <div class="field"><label>Semester</label><input type="number" id="mSubSem" value="1"></div>
      <div class="field"><label>Old Name</label><input type="text" value="${escapeHtml(oldName)}" readonly style="opacity:.6"></div>
      <div class="field"><label>New Name</label><input type="text" id="mSubNew"></div>
      <div class="field"><label>New Description</label><input type="text" id="mSubDesc"></div>
      <div class="field"><label>New Code</label><input type="text" id="mSubCode"></div>
    `, async () => {
      const p = {
        departmentName: document.getElementById('mSubDept').value.trim(),
        levelNumber: parseInt(document.getElementById('mSubLvl').value),
        semesterNumber: parseInt(document.getElementById('mSubSem').value),
        subjectName: oldName,
        newSubjectName: document.getElementById('mSubNew').value.trim() || undefined,
        subjectDescription: document.getElementById('mSubDesc').value.trim() || undefined,
        newSubjectCode: document.getElementById('mSubCode').value.trim() || undefined
      };
      if (!p.departmentName) return UI.error('Department required');
      try {
        await API.editSubject(p);
        UI.success('Subject updated');
        AdminUI.closeModal();
        await loadSubjects();
      } catch (e) { UI.error(e.message); }
    });
  },

  async deleteSubject(name) {
    if (!confirm(`Delete subject "${name}"?`)) return;
    try {
      const payload = [{ DepartmentName: CONFIG.DEFAULTS.department, levelNumber: CONFIG.DEFAULTS.levelNumber, semesterNumber: CONFIG.DEFAULTS.semesterNumber, subjectName: name }];
      await API.deleteSubjects(payload);
      UI.success('Deleted');
      await loadSubjects();
    } catch (e) { UI.error(e.message); }
  },

  /* ═══ DOCTOR ═══ */
  openAddDoctor() {
    this.modal('➕ Add Doctor', `
      <div class="field"><label>Name</label><input type="text" id="mDocName" placeholder="Amgad Salama"></div>
      <div class="field"><label>Academic Degree</label><input type="text" id="mDocDeg" placeholder="PhD"></div>
      <div class="field"><label>Description</label><input type="text" id="mDocDesc"></div>
      <div class="field"><label>Photo (required)</label><input type="file" id="mDocPhoto" accept="image/*"></div>
    `, async () => {
      const name = document.getElementById('mDocName').value.trim();
      const photo = document.getElementById('mDocPhoto').files[0];
      if (!name || !photo) return UI.error('Name + Photo required');

      const fd = new FormData();
      fd.append('data', JSON.stringify([{
        doctorName: name,
        doctorAcademicDegree: document.getElementById('mDocDeg').value.trim() || 'PhD',
        doctorDescription: document.getElementById('mDocDesc').value.trim() || '',
        doctorPhotoFile: 'photo1',
        doctorCertificationFiles: []
      }]));
      fd.append('photo1', photo);

      try {
        await API.addDoctors(fd);
        UI.success('Doctor added');
        AdminUI.closeModal();
        await loadDoctorsTab();
      } catch (e) { UI.error(e.message); }
    });
  },

  openEditDoctor(name) {
    this.modal('✏️ Edit Doctor', `
      <div class="field"><label>Name</label><input type="text" value="${escapeHtml(name)}" readonly style="opacity:.6"></div>
      <div class="field"><label>New Degree</label><input type="text" id="mDocDeg"></div>
      <div class="field"><label>New Description</label><input type="text" id="mDocDesc"></div>
      <div class="field"><label>New Photo (optional)</label><input type="file" id="mDocPhoto" accept="image/*"></div>
    `, async () => {
      const fd = new FormData();
      fd.append('doctorName', name);
      const deg = document.getElementById('mDocDeg').value.trim();
      const desc = document.getElementById('mDocDesc').value.trim();
      const photo = document.getElementById('mDocPhoto').files[0];
      if (deg) fd.append('doctorAcademicDegree', deg);
      if (desc) fd.append('doctorDescription', desc);
      if (photo) { fd.append('doctorPhotoFile', 'photo1'); fd.append('photo1', photo); }

      try {
        await API.editDoctor(fd);
        UI.success('Doctor updated');
        AdminUI.closeModal();
        await loadDoctorsTab();
      } catch (e) { UI.error(e.message); }
    });
  },

  async deleteDoctor(name) {
    if (!confirm(`Delete doctor "${name}"?`)) return;
    try {
      await API.deleteDoctors(name);
      UI.success('Deleted');
      await loadDoctorsTab();
    } catch (e) { UI.error(e.message); }
  },

  /* ═══ LINK DOCTOR ═══ */
  openLinkDoctor() {
    this.modal('🔗 Link Doctor to Subject', `
      <div class="field"><label>Department</label><input type="text" id="mLnkDept" placeholder="computer science"></div>
      <div class="field"><label>Level</label><input type="number" id="mLnkLvl" value="2"></div>
      <div class="field"><label>Semester</label><input type="number" id="mLnkSem" value="1"></div>
      <div class="field"><label>Subject</label><input type="text" id="mLnkSub" placeholder="algorithm"></div>
      <div class="field"><label>Doctor</label><input type="text" id="mLnkDoc" placeholder="Amgad Salama"></div>
    `, async () => {
      const p = [{
        DepartmentName: document.getElementById('mLnkDept').value.trim(),
        levelNumber: parseInt(document.getElementById('mLnkLvl').value),
        semesterNumber: parseInt(document.getElementById('mLnkSem').value),
        subjectName: document.getElementById('mLnkSub').value.trim(),
        doctorName: document.getElementById('mLnkDoc').value.trim()
      }];
      if (!p[0].DepartmentName || !p[0].subjectName || !p[0].doctorName) return UI.error('Fill all fields');
      try {
        await API.linkDoctors(p);
        UI.success('Linked');
        AdminUI.closeModal();
        await loadDoctorsTab();
      } catch (e) { UI.error(e.message); }
    });
  },

  async unlinkDoctor(link) {
    if (!confirm(`Unlink ${link.subjectName} ↔ ${link.doctorName}?`)) return;
    try {
      // Extract data from link
      const url = new URL(link.link, 'http://x');
      const p = [{
        DepartmentName: url.searchParams.get('department'),
        levelNumber: parseInt(url.searchParams.get('levelNumber')),
        semesterNumber: parseInt(url.searchParams.get('semesterNumber')),
        subjectName: url.searchParams.get('subject'),
        doctorName: url.searchParams.get('doctor')
      }];
      await API.unlinkDoctors(p);
      UI.success('Unlinked');
      await loadDoctorsTab();
    } catch (e) { UI.error(e.message); }
  },

  /* ═══ FILE (Content) ═══ */
  openAddFile(dataType) {
    const titleField = dataType + 'Title';
    const isVideo = dataType === 'video';
    this.modal(`➕ Add ${dataType}`, `
      <div class="field"><label>Title</label><input type="text" id="mFileTitle"></div>
      ${isVideo
        ? '<div class="field"><label>Video URL</label><input type="text" id="mFileVideo" placeholder="https://..."></div>'
        : '<div class="field"><label>File</label><input type="file" id="mFileInput"></div>'}
    `, async () => {
      const title = document.getElementById('mFileTitle').value.trim();
      if (!title) return UI.error('Title required');

      const p = _state.path;
      const payload = {
        subjectName: p.subject,
        doctorName: p.doctor
      };
      payload[titleField] = title;

      try {
        if (isVideo) {
          const url = document.getElementById('mFileVideo').value.trim();
          if (!url) return UI.error('URL required');
          payload.video = url;
          await API.addVideos([payload]);
        } else {
          const file = document.getElementById('mFileInput').files[0];
          if (!file) return UI.error('File required');
          const fd = new FormData();
          payload[dataType + 'File'] = 'file1';
          fd.append('data', JSON.stringify([payload]));
          fd.append('file1', file);
          if (dataType === 'section') await API.addSections(fd);
          if (dataType === 'summary') await API.addSummaries(fd);
          if (dataType === 'resource') await API.addResources(fd);
        }
        UI.success('Added');
        AdminUI.closeModal();
        await renderContentLevel();
      } catch (e) { UI.error(e.message); }
    });
  },

  openEditFile(dataType, oldTitle) {
    const isVideo = dataType === 'video';
    this.modal(`✏️ Edit ${dataType}`, `
      <div class="field"><label>Old Title</label><input type="text" value="${escapeHtml(oldTitle)}" readonly style="opacity:.6"></div>
      <div class="field"><label>New Title</label><input type="text" id="mEditNew"></div>
      ${isVideo
        ? '<div class="field"><label>New Video URL</label><input type="text" id="mEditVideo"></div>'
        : '<div class="field"><label>New File (optional)</label><input type="file" id="mEditFile"></div>'}
    `, async () => {
      try {
        if (isVideo) {
          await API.editVideo({
            videoTitle: oldTitle,
            newVideoTitle: document.getElementById('mEditNew').value.trim() || undefined,
            video: document.getElementById('mEditVideo').value.trim() || undefined
          });
        } else {
          const fd = new FormData();
          const titleKey = dataType + 'Title';
          fd.append(titleKey, oldTitle);
          const newTitle = document.getElementById('mEditNew').value.trim();
          if (newTitle) fd.append('new' + dataType.charAt(0).toUpperCase() + dataType.slice(1) + 'Title', newTitle);
          const file = document.getElementById('mEditFile').files[0];
          if (file) fd.append(dataType, file);

          if (dataType === 'section') await API.editSection(fd);
          if (dataType === 'summary') await API.editSummary(fd);
          if (dataType === 'resource') await API.editResource(fd);
        }
        UI.success('Updated');
        AdminUI.closeModal();
        await renderContentLevel();
      } catch (e) { UI.error(e.message); }
    });
  },

  async deleteFile(dataType, title) {
    if (!confirm(`Delete "${title}"?`)) return;
    try {
      const titleKey = dataType + 'Title';
      const payload = {}; payload[titleKey] = title;
      if (dataType === 'section') await API.deleteSections(title);
      if (dataType === 'summary') await API.deleteSummaries(title);
      if (dataType === 'resource') await API.deleteResources(title);
      if (dataType === 'video') await API.deleteVideos(title);
      UI.success('Deleted');
      await renderContentLevel();
    } catch (e) { UI.error(e.message); }
  },

  /* ═══ USERS ═══ */
  async changeRole() {
    const emails = document.getElementById('userEmails').value.trim().split(/\n+/).filter(Boolean);
    if (!emails.length) return UI.error('Enter emails');
    const role = document.getElementById('userRole').value;
    const department = document.getElementById('userDept').value.trim();
    const level = parseInt(document.getElementById('userLevel').value) || 1;
    try {
      await API.garanteeRoles({ students: emails, role, department, level });
      UI.success('Roles updated');
    } catch (e) { UI.error(e.message); }
  },

  async changeLock(lock) {
    const emails = document.getElementById('userEmails').value.trim().split(/\n+/).filter(Boolean);
    if (!emails.length) return UI.error('Enter emails');
    try {
      await API.changeLock({ students: emails, lockStatus: lock });
      UI.success(lock ? 'Locked' : 'Unlocked');
    } catch (e) { UI.error(e.message); }
  }
};

window.AdminUI = AdminUI;