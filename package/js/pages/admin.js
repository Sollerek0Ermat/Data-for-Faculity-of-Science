/**
 * Admin Dashboard — Full (Fixed & Optimized)
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
  path: { department: null, levelNumber: null, semesterNumber: null, subject: null, doctor: null, dataType: null }
};

document.addEventListener('DOMContentLoaded', async () => {
  await Auth.syncSession();

  if (!Auth.requireAuth(['owner', 'moderator', 'doctor'])) return;

  renderTopbar('admin.html');
  const footer = document.getElementById('footerPlaceholder');
  if (footer) footer.outerHTML = renderFooter();

  const user = Auth.getUser();
  _state.userRole = (user && user.role) ? user.role : 'user';
  _state.userName = (user && user.name) ? user.name : 'Admin';

  document.getElementById('welcomeTitle').textContent = '👋 Welcome ' + _state.userName;
  const roleDisplay = document.querySelector('.hero-content #userRole');
  if (roleDisplay) roleDisplay.textContent = 'Role: ' + _state.userRole.toUpperCase();

  if (_state.userRole !== 'owner') {
    const ownerTabs = ['structure', 'users'];
    ownerTabs.forEach(t => {
      const btn = document.querySelector(`[data-tab="${t}"]`);
      if (btn) btn.style.display = 'none';
    });
  }

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
      if (item.doctor && item.doctor.name) docSet.add(item.doctor.name);
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
   STRUCTURE
   ═══════════════════════════════════════════ */
async function loadStructure() {
  await loadDepartments();
  await loadLevels();
  await loadSemesters();
  await loadSubjects();
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
    if (!_state.departments.length) {
      _state.departments = await API.getFolders({}) || [];
    }
    let all = [];
    for (const d of _state.departments) {
      const deptName = d.depName || d.name;
      if (!deptName) continue;
      const levels = await API.getFolders({ department: deptName }).catch(() => []);
      levels.forEach(l => {
        if (l.levelNumber !== undefined) {
          all.push({ department: deptName, levelNumber: l.levelNumber });
        }
      });
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
      sems.forEach(s => {
        if (s.semesterNumber !== undefined) {
          all.push({ department: l.department, levelNumber: l.levelNumber, semesterNumber: s.semesterNumber });
        }
      });
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
    const subjMap = new Map();

    const dws = await API.getDoctorWithSubjects().catch(() => []);
    dws.forEach(item => {
      (item.subjects || []).forEach(s => {
        if (s && s.name && !subjMap.has(s.name)) subjMap.set(s.name, s);
      });
    });

    for (const s of _state.semesters) {
      const subs = await API.getFolders({
        department: s.department,
        levelNumber: s.levelNumber,
        semesterNumber: s.semesterNumber
      }).catch(() => []);
      subs.forEach(sub => {
        const name = sub.subjectName || sub.name;
        if (name && !subjMap.has(name)) {
          subjMap.set(name, {
            name,
            code: sub.code || '',
            department: s.department,
            levelNumber: s.levelNumber,
            semesterNumber: s.semesterNumber
          });
        }
      });
    }

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
        btn('✏️ Edit', 'btn-ghost', () => AdminUI.openEditSubject(s.name, s.department, s.levelNumber, s.semesterNumber)),
        btn('🗑️ Delete', 'btn-danger', () => AdminUI.deleteSubject(s.name, s.department, s.levelNumber, s.semesterNumber))
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
    if (el) el.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      onClick();
    });
  }, 0);
  return `<button type="button" id="${id}" class="btn ${cls} btn-sm" style="padding:6px 12px;font-size:12px">${label}</button>`;
}

function emptyBox(msg) {
  return `<p style="color:var(--muted);text-align:center;padding:24px;font-size:13px">${escapeHtml(msg)}</p>`;
}

function errBox(msg) {
  return `<p style="color:var(--danger);text-align:center;padding:24px;font-size:13px">❌ ${escapeHtml(msg)}</p>`;
}

/* ═══════════════════════════════════════════
   CONTENT BROWSE
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

  const actionBtns = [];

  if (p.department) {
    actionBtns.push(btn('⬅️ Back', 'btn-ghost', () => AdminUI.stepBack()));
  }

  try {
    let items = [];
    let levelName = '';

    if (!p.department) {
      items = await API.getFolders({});
      levelName = '🏛️ Departments';
      actionBtns.push(btn('➕ Add Department', 'btn-primary', () => AdminUI.openAddDepartment()));
    } else if (!p.levelNumber) {
      items = await API.getFolders({ department: p.department });
      levelName = `📊 Levels in ${p.department}`;
      actionBtns.push(btn('➕ Add Level', 'btn-primary', () => AdminUI.openAddLevel()));
    } else if (!p.semesterNumber) {
      items = await API.getFolders({ department: p.department, levelNumber: p.levelNumber });
      levelName = `📅 Semesters in Level ${p.levelNumber}`;
      actionBtns.push(btn('➕ Add Semester', 'btn-primary', () => AdminUI.openAddSemester()));
    } else if (!p.subject) {
      items = await API.getFolders({ department: p.department, levelNumber: p.levelNumber, semesterNumber: p.semesterNumber });
      levelName = `📖 Subjects in Sem ${p.semesterNumber}`;
      actionBtns.push(btn('➕ Add Subject', 'btn-primary', () => AdminUI.openAddSubject()));
    } else if (!p.doctor) {
      items = await API.getFolders({ department: p.department, levelNumber: p.levelNumber, semesterNumber: p.semesterNumber, subject: p.subject });
      levelName = `👨‍🏫 Doctors for ${p.subject}`;
      actionBtns.push(btn('➕ Add Doctor', 'btn-primary', () => AdminUI.openAddDoctor()));
      actionBtns.push(btn('🔗 Link Doctor', 'btn-ghost', () => AdminUI.openLinkDoctor()));
    } else if (!p.dataType) {
      levelName = `📂 Content Types (${p.doctor})`;
      items = [
        { dataType: 'sections', label: 'Sections' },
        { dataType: 'videos', label: 'Videos' },
        { dataType: 'summaries', label: 'Summaries' },
        { dataType: 'resources', label: 'Resources' }
      ];
      actionBtns.push(btn('➕ Quick Upload Content', 'btn-primary', () => AdminUI.openAddFileChoice()));
    } else {
      items = await API.getFolders({
        department: p.department,
        levelNumber: p.levelNumber,
        semesterNumber: p.semesterNumber,
        subject: p.subject,
        doctor: p.doctor,
        dataType: p.dataType
      }).catch(() => []);
      levelName = `📄 ${p.dataType.toUpperCase()}S`;
      actionBtns.push(btn(`➕ Add ${p.dataType}`, 'btn-primary', () => AdminUI.openAddFile(p.dataType)));
    }

    title.textContent = levelName;
    actions.innerHTML = actionBtns.join(' ');
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

  const validItems = items.filter(item => {
    if (!item) return false;
    if (!p.dataType) return true;
    const titleKey = p.dataType === 'section' ? 'sectionTitle'
      : p.dataType === 'video' ? 'videoTitle'
      : p.dataType === 'summary' ? 'summaryTitle'
      : 'resourceTitle';
    const t = item[titleKey];
    return Boolean(t && String(t).trim() !== '' && t !== 'undefined' && t !== 'null');
  });

  if (!validItems.length) {
    grid.innerHTML = emptyBox('No uploaded files yet. Click "+ Add" above to upload.');
    return;
  }

  grid.innerHTML = validItems.map(item => {
    if (item.depName) {
      return contentCard('🏛️', item.depName, item.code || '', 'department',
        () => { _state.path.department = item.depName; renderContentLevel(); },
        null, null
      );
    }
    if (item.levelNumber !== undefined && item.levelNumber !== null && !p.levelNumber) {
      return contentCard('📊', 'Level ' + item.levelNumber, '', 'level',
        () => { _state.path.levelNumber = item.levelNumber; renderContentLevel(); },
        null, null
      );
    }
    if (item.semesterNumber !== undefined && item.semesterNumber !== null && !p.semesterNumber) {
      return contentCard('📅', 'Semester ' + item.semesterNumber, '', 'semester',
        () => { _state.path.semesterNumber = item.semesterNumber; renderContentLevel(); },
        null, null
      );
    }
    if (item.subjectName && !p.subject) {
      const icon = (window.Mappers && Mappers._getIcon) ? Mappers._getIcon(item.subjectName) : '📖';
      return contentCard(icon, item.subjectName, '', 'subject',
        () => { _state.path.subject = item.subjectName; renderContentLevel(); },
        null, null
      );
    }
    if (item.doctorName && !p.doctor) {
      return contentCard('👨‍🏫', item.doctorName, '', 'doctor',
        () => { _state.path.doctor = item.doctorName; renderContentLevel(); },
        null, null
      );
    }
    if (item.dataType && !p.dataType) {
      const normalized = String(item.dataType).replace(/s$/, '').replace('recourse', 'resource');
      const icon = { section: '📄', video: '🎬', summary: '📝', resource: '📦' }[normalized] || '📁';
      const displayTitle = item.label || (normalized.charAt(0).toUpperCase() + normalized.slice(1) + 's');
      return contentCard(icon, displayTitle, 'Click to view or upload ' + normalized + 's', 'datatype',
        () => { _state.path.dataType = normalized; renderContentLevel(); },
        null, null
      );
    }
    if (p.dataType) {
      const titleKey = p.dataType === 'section' ? 'sectionTitle'
        : p.dataType === 'video' ? 'videoTitle'
        : p.dataType === 'summary' ? 'summaryTitle'
        : 'resourceTitle';
      const fileTitle = item[titleKey];
      const pubBy = item.sectionPublishedBy || item.videoPublishedBy || item.summaryPublishedBy || item.resourcePublishedBy || _state.userName || 'Admin';
      return contentCard('📄', fileTitle, 'Published by ' + pubBy, 'file',
        null,
        () => AdminUI.openEditFile(p.dataType, fileTitle),
        () => AdminUI.deleteFile(p.dataType, fileTitle)
      );
    }
    return '';
  }).join('');
}

function contentCard(icon, title, sub, type, onClick, onEdit, onDelete) {
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
          <span style="margin-right:8px">${icon}</span>${escapeHtml(title || '')}
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

/* ═══ BREADCRUMBS ═══ */
function renderBreadcrumbs() {
  const el = document.getElementById('contentBreadcrumbs');
  const p = _state.path;

  const crumbs = [{ label: '🏠 Home', step: 0 }];

  if (p.department && p.department !== 'undefined')     crumbs.push({ label: p.department, step: 1 });
  if (p.levelNumber != null)                            crumbs.push({ label: 'Level ' + p.levelNumber, step: 2 });
  if (p.semesterNumber != null)                         crumbs.push({ label: 'Sem ' + p.semesterNumber, step: 3 });
  if (p.subject && p.subject !== 'undefined')           crumbs.push({ label: p.subject, step: 4 });
  if (p.doctor && p.doctor !== 'undefined')             crumbs.push({ label: p.doctor, step: 5 });
  if (p.dataType && p.dataType !== 'undefined')         crumbs.push({ label: p.dataType + 's', step: 6 });

  el.innerHTML = crumbs.map((c, idx) => {
    const isLast = idx === crumbs.length - 1;
    return `<a href="#" data-crumb-step="${c.step}" style="color:${isLast ? '#fff' : 'var(--cyan)'};text-decoration:none;font-weight:${isLast ? '700' : '500'};cursor:pointer">${escapeHtml(c.label)}</a>`;
  }).join(' <span class="breadcrumb-sep" style="margin:0 6px;color:var(--muted)">/</span> ');

  el.querySelectorAll('[data-crumb-step]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const step = parseInt(link.dataset.crumbStep, 10);
      AdminUI.navigateToStep(step);
    });
  });
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
      if (!doc || !doc.name) return;
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
    document.querySelectorAll('#adminTabs .tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('#adminTabs .tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
        tab.classList.add('active');
        const target = document.getElementById('tab-' + tab.dataset.tab);
        if (target) target.classList.remove('hidden');

        const t = tab.dataset.tab;
        if (t === 'structure') loadStructure();
        if (t === 'doctors') loadDoctorsTab();
        if (t === 'content') loadContentBrowse();
      });
    });

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
        el.addEventListener('click', (e) => {
          e.preventDefault();
          actions[action]();
        });
      }
    });

    document.addEventListener('click', (e) => {
      if (e.target.matches('#modalCancelBtn, [data-modal-close="true"]') || e.target.id === 'modalOverlay') {
        e.preventDefault();
        AdminUI.closeModal();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') AdminUI.closeModal();
    });
  },

  navigateToStep(step) {
    const keys = ['department', 'levelNumber', 'semesterNumber', 'subject', 'doctor', 'dataType'];
    for (let i = step; i < keys.length; i++) {
      _state.path[keys[i]] = null;
    }
    renderContentLevel();
  },

  stepBack() {
    const keys = ['department', 'levelNumber', 'semesterNumber', 'subject', 'doctor', 'dataType'];
    for (let i = keys.length - 1; i >= 0; i--) {
      const v = _state.path[keys[i]];
      if (v !== null && v !== undefined && v !== '') {
        _state.path[keys[i]] = null;
        break;
      }
    }
    renderContentLevel();
  },

  resetPath() {
    this.navigateToStep(0);
  },

  /* ═══ MODAL ═══ */
  modal(title, bodyHtml, onSave, allowMultiple = false) {
    const root = document.getElementById('modalRoot');
    root.innerHTML = `
      <div id="modalOverlay" style="position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px)">
        <div style="background:var(--panel);border:1px solid var(--cyan);border-radius:14px;max-width:520px;width:100%;max-height:90vh;overflow-y:auto;padding:24px;box-shadow:0 0 40px rgba(0,229,255,.3)">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px">
            <h3 style="color:var(--cyan);font-size:18px;margin:0">${title}</h3>
            <button type="button" data-modal-close="true" style="background:none;border:none;color:var(--muted);font-size:20px;cursor:pointer">✕</button>
          </div>
          <div id="modalBody">${bodyHtml}</div>
          <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:20px;flex-wrap:wrap">
            <button type="button" class="btn btn-ghost btn-sm" id="modalCancelBtn" data-modal-close="true">Cancel</button>
            ${allowMultiple ? `<button type="button" class="btn btn-success btn-sm" id="modalSaveAnotherBtn">➕ Save & Add Another</button>` : ''}
            <button type="button" class="btn btn-primary btn-sm" id="modalSaveBtn">💾 Save</button>
          </div>
        </div>
      </div>
    `;

    const cancelBtn = document.getElementById('modalCancelBtn');
    if (cancelBtn) cancelBtn.addEventListener('click', () => AdminUI.closeModal());

    const saveBtn = document.getElementById('modalSaveBtn');
    if (saveBtn) {
      saveBtn.addEventListener('click', async () => {
        saveBtn.disabled = true;
        saveBtn.textContent = '⏳ Saving...';
        try {
          await onSave(false);
        } catch (e) {
          console.error('Save failed:', e);
        } finally {
          const btn = document.getElementById('modalSaveBtn');
          if (btn) { btn.disabled = false; btn.textContent = '💾 Save'; }
        }
      });
    }

    const saveAnotherBtn = document.getElementById('modalSaveAnotherBtn');
    if (saveAnotherBtn) {
      saveAnotherBtn.addEventListener('click', async () => {
        saveAnotherBtn.disabled = true;
        saveAnotherBtn.textContent = '⏳ Saving...';
        try {
          await onSave(true);
        } catch (e) {
          console.error('Save & Add Another failed:', e);
        } finally {
          const btn = document.getElementById('modalSaveAnotherBtn');
          if (btn) { btn.disabled = false; btn.textContent = '➕ Save & Add Another'; }
        }
      });
    }
  },

  closeModal() {
    const root = document.getElementById('modalRoot');
    if (root) root.innerHTML = '';
  },

  /* ═══ DROPDOWN HELPERS ═══ */
  deptOptions() {
    return (_state.departments || []).map(d => {
      const name = d.depName || d.name;
      return `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`;
    }).join('');
  },

  subjectsOptions() {
    return (_state.subjects || []).map(s =>
      `<option value="${escapeHtml(s.name)}">${escapeHtml(s.name)}</option>`
    ).join('');
  },

  doctorsOptions() {
    return (_state.doctors || []).map(item => {
      const n = item.doctor ? item.doctor.name : item.name;
      return `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`;
    }).join('');
  },

  /* ═══ DEPARTMENT ═══ */
  openAddDepartment() {
    this.modal('➕ Add Department', `
      <div class="field"><label>Name</label><input type="text" id="mDeptName" placeholder="computer science"></div>
      <div class="field"><label>Description</label><input type="text" id="mDeptDesc" placeholder="..."></div>
      <div class="field"><label>Expected Jobs</label><input type="text" id="mDeptJobs" placeholder="..."></div>
      <div class="field"><label>Code</label><input type="text" id="mDeptCode" placeholder="CS"></div>
    `, async (keepOpen) => {
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
        await loadDepartments();
        if (keepOpen) {
          document.getElementById('mDeptName').value = '';
          document.getElementById('mDeptDesc').value = '';
          document.getElementById('mDeptJobs').value = '';
          document.getElementById('mDeptCode').value = '';
          document.getElementById('mDeptName').focus();
        } else {
          AdminUI.closeModal();
        }
      } catch (e) { UI.error(e.message); }
    }, true);
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
        await loadStructure();
      } catch (e) { UI.error(e.message); }
    });
  },

  async deleteDepartment(name) {
    if (!confirm(`Delete department "${name}"?`)) return;
    try {
      await API.deleteDepartments([name]);
      UI.success('Deleted');
      await loadStructure();
    } catch (e) { UI.error(e.message); }
  },

  /* ═══ LEVEL ═══ */
  openAddLevel() {
    const deptOpts = AdminUI.deptOptions();
    this.modal('➕ Add Level', `
      <div class="field">
        <label>Department</label>
        <select id="mLvlDept">
          ${deptOpts || '<option value="">No departments — add one first</option>'}
        </select>
      </div>
      <div class="field"><label>Level Number</label><input type="number" id="mLvlNum" value="1" min="1" max="6"></div>
    `, async (keepOpen) => {
      const p = {
        DepartmentName: document.getElementById('mLvlDept').value.trim(),
        levelNumber: parseInt(document.getElementById('mLvlNum').value, 10)
      };
      if (!p.DepartmentName) return UI.error('Department required');
      try {
        await API.addLevels([p]);
        UI.success('Level added');
        await loadLevels();
        await loadSemesters();
        if (keepOpen) {
          document.getElementById('mLvlNum').value = p.levelNumber + 1;
          document.getElementById('mLvlNum').focus();
        } else {
          AdminUI.closeModal();
        }
      } catch (e) { UI.error(e.message); }
    }, true);
  },

  async deleteLevel(dept, num) {
    if (!confirm(`Delete Level ${num} in ${dept}?`)) return;
    try {
      await API.deleteLevels([{ DepartmentName: dept, levelNumber: num }]);
      UI.success('Deleted');
      await loadLevels();
      await loadSemesters();
    } catch (e) { UI.error(e.message); }
  },

  /* ═══ SEMESTER ═══ */
  openAddSemester() {
    const deptOpts = AdminUI.deptOptions();
    this.modal('➕ Add Semester', `
      <div class="field">
        <label>Department</label>
        <select id="mSemDept">
          ${deptOpts || '<option value="">No departments</option>'}
        </select>
      </div>
      <div class="field"><label>Level Number</label><input type="number" id="mSemLvl" value="1"></div>
      <div class="field"><label>Semester Number</label><input type="number" id="mSemNum" value="1"></div>
    `, async (keepOpen) => {
      const p = {
        DepartmentName: document.getElementById('mSemDept').value.trim(),
        levelNumber: parseInt(document.getElementById('mSemLvl').value, 10),
        semesterNumber: parseInt(document.getElementById('mSemNum').value, 10)
      };
      if (!p.DepartmentName) return UI.error('Department required');
      try {
        await API.addSemesters([p]);
        UI.success('Semester added');
        await loadSemesters();
        if (keepOpen) {
          document.getElementById('mSemNum').value = p.semesterNumber === 1 ? 2 : 1;
        } else {
          AdminUI.closeModal();
        }
      } catch (e) { UI.error(e.message); }
    }, true);
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
    const deptOpts = AdminUI.deptOptions();
    this.modal('➕ Add Subject', `
      <div class="field">
        <label>Department</label>
        <select id="mSubDept">
          ${deptOpts || '<option value="">No departments</option>'}
        </select>
      </div>
      <div class="field"><label>Level</label><input type="number" id="mSubLvl" value="1"></div>
      <div class="field"><label>Semester</label><input type="number" id="mSubSem" value="1"></div>
      <div class="field"><label>Subject Name</label><input type="text" id="mSubName" placeholder="algorithm"></div>
      <div class="field"><label>Description</label><input type="text" id="mSubDesc"></div>
      <div class="field"><label>Code</label><input type="text" id="mSubCode"></div>
    `, async (keepOpen) => {
      const p = {
        DepartmentName: document.getElementById('mSubDept').value.trim(),
        levelNumber: parseInt(document.getElementById('mSubLvl').value, 10),
        semesterNumber: parseInt(document.getElementById('mSubSem').value, 10),
        subjectName: document.getElementById('mSubName').value.trim(),
        subjectDescription: document.getElementById('mSubDesc').value.trim(),
        subjectCode: document.getElementById('mSubCode').value.trim()
      };
      if (!p.DepartmentName || !p.subjectName) return UI.error('Dept + Name required');
      try {
        await API.addSubjects([p]);
        UI.success('Subject added');
        await loadSubjects();
        if (keepOpen) {
          document.getElementById('mSubName').value = '';
          document.getElementById('mSubDesc').value = '';
          document.getElementById('mSubCode').value = '';
          document.getElementById('mSubName').focus();
        } else {
          AdminUI.closeModal();
        }
      } catch (e) { UI.error(e.message); }
    }, true);
  },

  openEditSubject(oldName, dept, lvl, sem) {
    const defaultDept = dept || _state.path.department || (_state.departments[0] && (_state.departments[0].depName || _state.departments[0].name)) || '';
    const defaultLvl = lvl || _state.path.levelNumber || 1;
    const defaultSem = sem || _state.path.semesterNumber || 1;
    this.modal('✏️ Edit Subject', `
      <div class="field"><label>Department</label><input type="text" id="mSubDept" value="${escapeHtml(defaultDept)}" readonly style="opacity:.6"></div>
      <div class="field"><label>Level</label><input type="number" id="mSubLvl" value="${defaultLvl}"></div>
      <div class="field"><label>Semester</label><input type="number" id="mSubSem" value="${defaultSem}"></div>
      <div class="field"><label>Old Name</label><input type="text" value="${escapeHtml(oldName)}" readonly style="opacity:.6"></div>
      <div class="field"><label>New Name</label><input type="text" id="mSubNew"></div>
      <div class="field"><label>New Description</label><input type="text" id="mSubDesc"></div>
      <div class="field"><label>New Code</label><input type="text" id="mSubCode"></div>
    `, async () => {
      const p = {
        departmentName: document.getElementById('mSubDept').value.trim(),
        levelNumber: parseInt(document.getElementById('mSubLvl').value, 10),
        semesterNumber: parseInt(document.getElementById('mSubSem').value, 10),
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

  async deleteSubject(name, dept, lvl, sem) {
    if (!confirm(`Delete subject "${name}"?`)) return;
    try {
      const payload = [{
        DepartmentName: dept || _state.path.department || CONFIG.DEFAULTS.department,
        levelNumber: lvl || _state.path.levelNumber || CONFIG.DEFAULTS.levelNumber,
        semesterNumber: sem || _state.path.semesterNumber || CONFIG.DEFAULTS.semesterNumber,
        subjectName: name
      }];
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
    `, async (keepOpen) => {
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
        await loadDoctorsTab();
        if (keepOpen) {
          document.getElementById('mDocName').value = '';
          document.getElementById('mDocDesc').value = '';
          document.getElementById('mDocPhoto').value = '';
          document.getElementById('mDocName').focus();
        } else {
          AdminUI.closeModal();
        }
      } catch (e) { UI.error(e.message); }
    }, true);
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
    const p = _state.path;
    const deptOpts = AdminUI.deptOptions();
    const subjOpts = AdminUI.subjectsOptions();
    const docOpts = AdminUI.doctorsOptions();

    this.modal('🔗 Link Doctor to Subject', `
      <div class="field">
        <label>Department</label>
        <select id="mLnkDept">${deptOpts}</select>
      </div>
      <div class="field"><label>Level</label><input type="number" id="mLnkLvl" value="${p.levelNumber || 1}"></div>
      <div class="field"><label>Semester</label><input type="number" id="mLnkSem" value="${p.semesterNumber || 1}"></div>
      <div class="field">
        <label>Subject</label>
        <select id="mLnkSub">
          <option value="">Select subject...</option>
          ${subjOpts}
        </select>
      </div>
      <div class="field">
        <label>Doctor</label>
        <select id="mLnkDoc">
          <option value="">Select doctor...</option>
          ${docOpts}
        </select>
      </div>
    `, async (keepOpen) => {
      const payload = [{
        DepartmentName: document.getElementById('mLnkDept').value.trim(),
        levelNumber: parseInt(document.getElementById('mLnkLvl').value, 10),
        semesterNumber: parseInt(document.getElementById('mLnkSem').value, 10),
        subjectName: document.getElementById('mLnkSub').value.trim(),
        doctorName: document.getElementById('mLnkDoc').value.trim()
      }];
      if (!payload[0].DepartmentName || !payload[0].subjectName || !payload[0].doctorName) return UI.error('Fill all fields');
      try {
        await API.linkDoctors(payload);
        UI.success('Linked');
        await loadDoctorsTab();
        if (p.subject) await renderContentLevel();
        if (keepOpen) {
          document.getElementById('mLnkDoc').value = '';
          document.getElementById('mLnkDoc').focus();
        } else {
          AdminUI.closeModal();
        }
      } catch (e) { UI.error(e.message); }
    }, true);
  },

  async unlinkDoctor(link) {
    if (!confirm(`Unlink ${link.subjectName} ↔ ${link.doctorName}?`)) return;
    try {
      const url = new URL(link.link, 'http://x');
      const p = [{
        DepartmentName: url.searchParams.get('department'),
        levelNumber: parseInt(url.searchParams.get('levelNumber'), 10),
        semesterNumber: parseInt(url.searchParams.get('semesterNumber'), 10),
        subjectName: url.searchParams.get('subject'),
        doctorName: url.searchParams.get('doctor')
      }];
      await API.unlinkDoctors(p);
      UI.success('Unlinked');
      await loadDoctorsTab();
    } catch (e) { UI.error(e.message); }
  },

  /* ═══ FILE UPLOAD ═══ */
  openAddFileChoice() {
    this.modal('➕ Upload Content', `
      <div class="field">
        <label>Content Type</label>
        <select id="mChoiceType">
          <option value="section">📄 Section</option>
          <option value="video">🎬 Video</option>
          <option value="summary">📝 Summary</option>
          <option value="resource">📦 Resource</option>
        </select>
      </div>
      <div class="field"><label>Title</label><input type="text" id="mFileTitle" placeholder="Lecture 1 / Section 1"></div>
      <div class="field" id="mFileWrap"><label>File</label><input type="file" id="mFileInput"></div>
      <div class="field" id="mVideoWrap" style="display:none"><label>Video URL</label><input type="text" id="mFileVideo" placeholder="https://youtube.com/..."></div>
    `, async (keepOpen) => {
      const dataType = document.getElementById('mChoiceType').value;
      await this._submitFileUpload(dataType, keepOpen);
    }, true);

    const selectEl = document.getElementById('mChoiceType');
    if (selectEl) {
      selectEl.addEventListener('change', () => {
        const isVid = selectEl.value === 'video';
        document.getElementById('mFileWrap').style.display = isVid ? 'none' : 'block';
        document.getElementById('mVideoWrap').style.display = isVid ? 'block' : 'none';
      });
    }
  },

  openAddFile(dataType) {
    const isVideo = dataType === 'video';
    this.modal(`➕ Add ${dataType}`, `
      <div class="field"><label>Title</label><input type="text" id="mFileTitle" placeholder="Enter title..."></div>
      ${isVideo
        ? '<div class="field"><label>Video URL</label><input type="text" id="mFileVideo" placeholder="https://..."></div>'
        : '<div class="field"><label>File</label><input type="file" id="mFileInput"></div>'}
    `, async (keepOpen) => {
      await this._submitFileUpload(dataType, keepOpen);
    }, true);
  },

  async _submitFileUpload(dataType, keepOpen) {
    const titleField = dataType + 'Title';
    const isVideo = dataType === 'video';
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
        const fileInput = document.getElementById('mFileInput');
        const file = fileInput && fileInput.files[0];
        if (!file) return UI.error('File required');
        const fd = new FormData();
        payload[dataType + 'File'] = 'file1';
        fd.append('data', JSON.stringify([payload]));
        fd.append('file1', file);
        if (dataType === 'section') await API.addSections(fd);
        if (dataType === 'summary') await API.addSummaries(fd);
        if (dataType === 'resource') await API.addResources(fd);
      }
      UI.success('Added successfully');
      await renderContentLevel();
      if (keepOpen) {
        document.getElementById('mFileTitle').value = '';
        if (document.getElementById('mFileVideo')) document.getElementById('mFileVideo').value = '';
        if (document.getElementById('mFileInput')) document.getElementById('mFileInput').value = '';
        document.getElementById('mFileTitle').focus();
      } else {
        AdminUI.closeModal();
      }
    } catch (e) { UI.error(e.message); }
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
    const roleSelect = document.querySelector('#tab-users select#userRole');
    const role = roleSelect ? roleSelect.value : 'user';
    const department = document.getElementById('userDept').value.trim();
    const level = parseInt(document.getElementById('userLevel').value, 10) || 1;
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