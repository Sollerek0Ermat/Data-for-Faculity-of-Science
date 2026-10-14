/**
 * Admin Dashboard — Full
 * Gated by:
 *   1. Microsoft login (cookie)
 *   2. Staff role (owner / moderator / doctor)
 *   3. adminLoggedIn === true (set by POST /v1/admin/login)
 */

let _subjects = [];
let _doctors  = [];
let _dws      = [];
let _userRole = "user";
let _userName = "";

document.addEventListener("DOMContentLoaded", async () => {
  // ── 1. Auth bootstrap ───────────────────────────────────────
  const profile = await Auth.bootstrap({
    requireLogin: true,
    requireRole: ['owner', 'moderator', 'doctor'],
  });

  if (!profile) return; // redirected already

  // ── 2. Admin password gate ──────────────────────────────────
  if (!Auth.isAdminLoggedIn()) {
    showAdminPasswordGate();
    return; // don't render the dashboard until the gate is passed
  }

  await startDashboard();
});

/* ─────────────────────────────────────────────────────────── */
/*  Password gate                                              */
/* ─────────────────────────────────────────────────────────── */
function showAdminPasswordGate() {
  // Hide everything in the page except our overlay.
  const page = document.querySelector('.page');
  if (page) page.style.visibility = 'hidden';

  const overlay = document.createElement('div');
  overlay.id = 'adminGateOverlay';
  overlay.innerHTML = [
    '<div class="admin-gate-card">',
    '  <div class="login-icon">🔐</div>',
    '  <h1>Admin Access</h1>',
    '  <p>Enter your admin password to continue.</p>',
    '  <form id="adminGateForm">',
    '    <div class="field">',
    '      <label for="adminPassword">Password</label>',
    '      <input type="password" id="adminPassword" placeholder="••••••••" required autofocus>',
    '    </div>',
    '    <button type="submit" class="btn btn-primary btn-block" id="adminGateBtn" style="height:52px;font-size:16px">',
    '      Continue →',
    '    </button>',
    '    <p id="adminGateMsg" class="text-center" style="margin-top:12px;font-weight:700;font-size:14px;min-height:20px"></p>',
    '  </form>',
    '  <div style="text-align:center;margin-top:16px">',
    '    <a href="#" id="adminGateLogout" style="color:var(--muted);font-size:13px;font-weight:600">Logout</a>',
    '  </div>',
    '</div>',
  ].join('');
  document.body.appendChild(overlay);

  const form = document.getElementById('adminGateForm');
  const btn  = document.getElementById('adminGateBtn');
  const msg  = document.getElementById('adminGateMsg');
  const input = document.getElementById('adminPassword');

  document.getElementById('adminGateLogout').addEventListener('click', function (e) {
    e.preventDefault();
    Auth.logout();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = input.value;
    if (!password) return;

    msg.textContent = '';
    msg.style.color = 'var(--muted)';
    btn.disabled = true;
    msg.textContent = 'Checking...';

    try {
      // POST /v1/admin/login  →  backend checks, or sets on first use
      await Auth.adminLogin(password);

      // Success!  Backend returned 200 and we refreshed our session.
      overlay.remove();
      const page = document.querySelector('.page');
      if (page) page.style.visibility = 'visible';

      await startDashboard();
    } catch (err) {
      console.error(err);
      msg.textContent = '❌ ' + (err.message || 'Incorrect password');
      msg.style.color = 'var(--danger)';
      input.value = '';
      input.focus();
      btn.disabled = false;
    }
  });
}

/* ─────────────────────────────────────────────────────────── */
/*  Dashboard (original code below)                            */
/* ─────────────────────────────────────────────────────────── */
async function startDashboard() {
  renderTopbar('admin.html');
  const footer = document.getElementById("footerPlaceholder");
  if (footer) footer.outerHTML = renderFooter();

  const user = Auth.getUser();
  _userRole = (user && user.role) ? user.role : "user";
  _userName = (user && user.name) ? user.name : "";

  document.getElementById("welcomeTitle").textContent = "👋 Welcome " + (_userName || "Admin");
  document.getElementById("userRole").textContent = "Role: " + _userRole.toUpperCase();

  // Tabs
  document.querySelectorAll("#adminTabs .tab").forEach(function (tab) {
    tab.addEventListener("click", function () {
      document.querySelectorAll("#adminTabs .tab").forEach(t => t.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach(c => c.classList.add("hidden"));
      tab.classList.add("active");
      const target = document.getElementById("tab-" + tab.dataset.tab);
      if (target) target.classList.remove("hidden");
    });
  });

  // Load data
  try {
    _dws      = await API.getDoctorWithSubjects();
    _subjects = await API.getSubjects();
    _doctors  = await API.getDoctors();
    await loadDoctorsDetails();
    fillSelects();
    renderDoctorsList();
    renderSubjectsList();
    renderStats();
  } catch (err) {
    console.error(err);
    UI.error(err.message || "Failed to load data");
  }

  bindUpload();
  bindAddDoctor();
  bindAddSubject();
  bindAddDept();
  bindAddLevel();
  bindAddSem();
  bindLink();
  bindUsers();

  applyRolePermissions();
}

/* Everything below this line is UNCHANGED from your original
   admin.js, starting at `async function loadDoctorsDetails()`.
   Only the DOMContentLoaded handler at the top changed. */
async function loadDoctorsDetails() {
  if (!_doctors.length) return;
  try {
    const details = await Promise.all(
      _doctors.map(d => API.getFolderInfo("doctor", d.name).catch(() => null))
    );
    _doctors = _doctors.map((d, i) => {
      const info = details[i];
      if (info) {
        d.academicDegree = info.doctorAcademicDegree || d.academicDegree || "";
        d.description    = info.doctorDescription   || d.description    || "";
        d.certifications = info.doctorCertifications || d.certifications || [];
      }
      return d;
    });
  } catch (err) {
    console.warn("Failed to load doctor details:", err.message);
  }
}

function applyRolePermissions() {
  const isModerator = _userRole === "moderator";
  const isOwner = _userRole === "owner";

  // Hide Owner-only tabs for moderators/doctors
  if (!isOwner) {
    ["departments", "levels", "semesters", "link", "users"].forEach(t => {
      const el = document.querySelector('[data-tab="' + t + '"]');
      if (el) el.style.display = "none";
    });
  }
}

function renderStats() {
  const wrap = document.getElementById("statsGrid");
  if (!wrap) return;

  const stats = [
    { icon: "👨‍🏫", label: "Doctors",  value: _doctors.length },
    { icon: "📚", label: "Subjects", value: _subjects.length },
    { icon: "🔗", label: "Links",    value: _dws.reduce((a, d) => a + (d.subjects || []).length, 0) }
  ];

  wrap.innerHTML = stats.map(s => (
    '<div class="stat-card">' +
      '<div class="stat-icon">' + s.icon + '</div>' +
      '<div class="stat-value">' + s.value + '</div>' +
      '<div class="stat-label">' + s.label + '</div>' +
    '</div>'
  )).join("");
}

/* ═══════ SELECTS ═══════ */
function fillSelects() {
  const subjSel = document.getElementById("fileSubject");
  if (!subjSel) return;

  subjSel.innerHTML = "<option value=''>Choose subject...</option>";
  _subjects.forEach(s => {
    const opt = document.createElement("option");
    opt.value = s.name;
    opt.textContent = (s.icon || "📚") + " " + s.name;
    subjSel.appendChild(opt);
  });

  updateDoctorsSelect();
  subjSel.addEventListener("change", updateDoctorsSelect);
}

function updateDoctorsSelect() {
  const subjName = document.getElementById("fileSubject").value;
  const docSel = document.getElementById("fileDoctor");
  if (!docSel) return;

  docSel.innerHTML = "";
  const list = subjName
    ? _dws.filter(d => d.subjects.some(s => s.name === subjName)).map(d => d.doctor)
    : _doctors;

  if (!list.length) {
    docSel.innerHTML = "<option value=''>No doctors for this subject</option>";
    return;
  }

  list.forEach(d => {
    const opt = document.createElement("option");
    opt.value = d.name;
    opt.textContent = d.name;
    docSel.appendChild(opt);
  });
}

/* ═══════ LISTS ═══════ */
function renderDoctorsList() {
  const wrap = document.getElementById("doctorsList");
  if (!wrap) return;

  if (!_doctors.length) { wrap.innerHTML = "<p class='text-muted text-center' style='padding:20px'>No doctors</p>"; return; }

  const canEdit = _userRole === "owner";
  wrap.innerHTML = _doctors.map(d => {
    const deleteBtn = canEdit ? "<button class='btn btn-danger btn-sm' data-del-doc='" + escapeHtml(d.name) + "'>Delete</button>" : "";
    return (
      "<div style='display:flex;justify-content:space-between;align-items:center;padding:12px;border-bottom:1px solid rgba(0,220,255,.1)'>" +
      "<div><strong>" + escapeHtml(d.name) + "</strong>" +
      "<div style='color:var(--muted);font-size:12px'>" + escapeHtml(d.academicDegree || "") + (d.description ? " - " + escapeHtml(d.description) : "") + "</div></div>" +
      deleteBtn + "</div>"
    );
  }).join("");

  if (canEdit) {
    wrap.querySelectorAll("[data-del-doc]").forEach(btn => {
      btn.addEventListener("click", () => deleteDoctor(btn.dataset.delDoc));
    });
  }
}

function renderSubjectsList() {
  const wrap = document.getElementById("subjectsList");
  if (!wrap) return;
  if (!_subjects.length) { wrap.innerHTML = "<p class='text-muted text-center' style='padding:20px'>No subjects</p>"; return; }

  const canEdit = _userRole === "owner";
  wrap.innerHTML = _subjects.map(s => {
    const deleteBtn = canEdit ? "<button class='btn btn-danger btn-sm' data-del-subj='" + escapeHtml(s.name) + "'>Delete</button>" : "";
    return (
      "<div style='display:flex;justify-content:space-between;align-items:center;padding:12px;border-bottom:1px solid rgba(0,220,255,.1)'>" +
      "<div><strong>" + (s.icon || "📚") + " " + escapeHtml(s.name) + "</strong>" +
      "<div style='color:var(--muted);font-size:12px'>" + escapeHtml(s.code || "") + "</div></div>" +
      deleteBtn + "</div>"
    );
  }).join("");

  if (canEdit) {
    wrap.querySelectorAll("[data-del-subj]").forEach(btn => {
      btn.addEventListener("click", () => deleteSubject(btn.dataset.delSubj));
    });
  }
}

/* ═══════ ACTIONS ═══════ */
async function deleteDoctor(name) {
  if (!confirm("Delete doctor: " + name + "?")) return;
  try {
    await API.deleteDoctors(name);
    UI.success("Doctor deleted");
    _doctors = _doctors.filter(d => d.name !== name);
    renderDoctorsList();
    updateDoctorsSelect();
    renderStats();
  } catch (err) { UI.error(err.message || "Delete failed"); }
}

async function deleteSubject(name) {
  if (!confirm("Delete subject: " + name + "?")) return;
  try {
    await API.deleteSubjects([{
      DepartmentName: CONFIG.DEFAULTS.department,
      levelNumber: CONFIG.DEFAULTS.levelNumber,
      semesterNumber: CONFIG.DEFAULTS.semesterNumber,
      subjectName: name
    }]);
    UI.success("Subject deleted");
    _subjects = _subjects.filter(s => s.name !== name);
    renderSubjectsList();
    fillSelects();
    renderStats();
  } catch (err) { UI.error(err.message || "Delete failed"); }
}

/* ═══════ UPLOAD ═══════ */
function bindUpload() {
  const btn = document.getElementById("uploadBtn");
  if (!btn) return;

  // Video URL toggle
  const typeSel = document.getElementById("fileType");
  if (typeSel) {
    typeSel.addEventListener("change", function() {
      const isVideo = typeSel.value === "video";
      document.getElementById("videoUrlField").style.display = isVideo ? "block" : "none";
      document.getElementById("fileInputField").style.display = isVideo ? "none" : "block";
    });
  }

  btn.addEventListener("click", async function() {
    const title     = document.getElementById("fileTitle").value.trim();
    const type      = document.getElementById("fileType").value;
    const subject   = document.getElementById("fileSubject").value;
    const doctor    = document.getElementById("fileDoctor").value;
    const videoUrl  = document.getElementById("videoUrl").value.trim();
    const file      = document.getElementById("fileInput").files[0];

    if (!title)   return UI.error("Enter file title");
    if (!subject) return UI.error("Choose subject");
    if (!doctor)  return UI.error("Choose doctor");

    const payload = {
      subjectName: subject,
      doctorName:  doctor
    };
    payload[type + "Title"] = title;

    if (type === "video") {
      if (!videoUrl) return UI.error("Enter video URL");
      payload.video = videoUrl;

      try {
        await API.addVideos([payload]);
        UI.success("Video added");
        document.getElementById("fileTitle").value = "";
        document.getElementById("videoUrl").value = "";
      } catch (err) { UI.error(err.message || "Upload failed"); }
      return;
    }

    if (!file) return UI.error("Choose file");

    const fd = new FormData();
    payload[type + "File"] = "file1";
    fd.append("data", JSON.stringify([payload]));
    fd.append("file1", file);

    try {
      if (type === "section")  await API.addSections(fd);
      if (type === "summary")  await API.addSummaries(fd);
      if (type === "resource") await API.addResources(fd);
      UI.success("File uploaded");
      document.getElementById("fileTitle").value = "";
      document.getElementById("fileInput").value = "";
    } catch (err) { UI.error(err.message || "Upload failed"); }
  });
}

/* ═══════ ADD DOCTOR ═══════ */
function bindAddDoctor() {
  const btn = document.getElementById("addDoctorBtn");
  if (!btn) return;

  btn.addEventListener("click", async function() {
    const name   = document.getElementById("doctorName").value.trim();
    const degree = document.getElementById("doctorDegree").value.trim();
    const desc   = document.getElementById("doctorDesc").value.trim();
    const photo  = document.getElementById("doctorPhoto").files[0];

    if (!name) return UI.error("Enter doctor name");
    if (!photo) return UI.error("Choose photo");

    const fd = new FormData();
    const payload = [{
      doctorName: name,
      doctorAcademicDegree: degree || "PhD",
      doctorDescription: desc || "",
      doctorPhotoFile: "photo1",
      doctorCertificationFiles: []
    }];

    fd.append("data", JSON.stringify(payload));
    fd.append("photo1", photo);

    try {
      await API.addDoctors(fd);
      UI.success("Doctor added");
      _doctors = await API.getDoctors();
      renderDoctorsList();
      renderStats();
      document.getElementById("doctorName").value = "";
      document.getElementById("doctorDegree").value = "";
      document.getElementById("doctorDesc").value = "";
      document.getElementById("doctorPhoto").value = "";
    } catch (err) { UI.error(err.message || "Add failed"); }
  });
}

/* ═══════ ADD SUBJECT ═══════ */
function bindAddSubject() {
  const btn = document.getElementById("addSubjectBtn");
  if (!btn) return;

  btn.addEventListener("click", async function() {
    const dept = document.getElementById("subjDept").value.trim() || CONFIG.DEFAULTS.department;
    const lvl  = parseInt(document.getElementById("subjLevel").value) || CONFIG.DEFAULTS.levelNumber;
    const sem  = parseInt(document.getElementById("subjSem").value) || CONFIG.DEFAULTS.semesterNumber;
    const name = document.getElementById("subjectName").value.trim();
    const desc = document.getElementById("subjectDesc").value.trim();
    const code = document.getElementById("subjectCode").value.trim();

    if (!name) return UI.error("Enter subject name");

    try {
      await API.addSubjects([{
        DepartmentName: dept,
        levelNumber: lvl,
        semesterNumber: sem,
        subjectName: name,
        subjectDescription: desc || "",
        subjectCode: code || ""
      }]);
      UI.success("Subject added");
      _subjects = await API.getSubjects();
      renderSubjectsList();
      fillSelects();
      renderStats();
    } catch (err) { UI.error(err.message || "Add failed"); }
  });
}

/* ═══════ ADD DEPARTMENT ═══════ */
function bindAddDept() {
  const btn = document.getElementById("addDeptBtn");
  if (!btn) return;

  btn.addEventListener("click", async function() {
    const name = document.getElementById("deptName").value.trim();
    const desc = document.getElementById("deptDesc").value.trim();
    const jobs = document.getElementById("deptJobs").value.trim();
    const code = document.getElementById("deptCode").value.trim();

    if (!name) return UI.error("Enter department name");

    try {
      await API.addDepartments([{
        DepartmentName: name,
        departmentDescription: desc || name + " department",
        departmentExpectedJobs: jobs || "Various",
        departmentCode: code || name.substring(0, 3).toUpperCase()
      }]);
      UI.success("Department added");
    } catch (err) { UI.error(err.message || "Add failed"); }
  });
}

/* ═══════ ADD LEVEL ═══════ */
function bindAddLevel() {
  const btn = document.getElementById("addLevelBtn");
  if (!btn) return;

  btn.addEventListener("click", async function() {
    const dept = document.getElementById("lvlDept").value.trim();
    const num  = parseInt(document.getElementById("lvlNum").value);
    if (!dept) return UI.error("Enter department name");

    try {
      await API.addLevels([{ DepartmentName: dept, levelNumber: num }]);
      UI.success("Level added");
    } catch (err) { UI.error(err.message || "Add failed"); }
  });
}

/* ═══════ ADD SEMESTER ═══════ */
function bindAddSem() {
  const btn = document.getElementById("addSemBtn");
  if (!btn) return;

  btn.addEventListener("click", async function() {
    const dept = document.getElementById("semDept").value.trim();
    const lvl  = parseInt(document.getElementById("semLvl").value);
    const num  = parseInt(document.getElementById("semNum").value);
    if (!dept) return UI.error("Enter department name");

    try {
      await API.addSemesters([{ DepartmentName: dept, levelNumber: lvl, semesterNumber: num }]);
      UI.success("Semester added");
    } catch (err) { UI.error(err.message || "Add failed"); }
  });
}

/* ═══════ LINK DOCTORS ═══════ */
function bindLink() {
  const linkBtn = document.getElementById("linkBtn");
  const unlinkBtn = document.getElementById("unlinkBtn");

  async function getPayload() {
    const dept = document.getElementById("lnkDept").value.trim();
    const lvl  = parseInt(document.getElementById("lnkLvl").value);
    const sem  = parseInt(document.getElementById("lnkSem").value);
    const subj = document.getElementById("lnkSubject").value.trim();
    const doc  = document.getElementById("lnkDoctor").value.trim();

    if (!dept || !subj || !doc) { UI.error("Fill all fields"); return null; }
    return [{ DepartmentName: dept, levelNumber: lvl, semesterNumber: sem, subjectName: subj, doctorName: doc }];
  }

  if (linkBtn) {
    linkBtn.addEventListener("click", async function() {
      const p = await getPayload();
      if (!p) return;
      try {
        await API.linkDoctors(p);
        UI.success("Doctor linked");
      } catch (err) { UI.error(err.message || "Link failed"); }
    });
  }

  if (unlinkBtn) {
    unlinkBtn.addEventListener("click", async function() {
      const p = await getPayload();
      if (!p) return;
      try {
        await API.unlinkDoctors(p);
        UI.success("Doctor unlinked");
      } catch (err) { UI.error(err.message || "Unlink failed"); }
    });
  }
}

/* ═══════ USERS ═══════ */
function bindUsers() {
  const changeBtn = document.getElementById("changeRoleBtn");
  const lockBtn   = document.getElementById("lockBtn");
  const unlockBtn = document.getElementById("unlockBtn");

  function getEmails() {
    const raw = document.getElementById("userEmails").value.trim();
    if (!raw) { UI.error("Enter emails"); return null; }
    return raw.split(/\n+/).map(e => e.trim()).filter(Boolean);
  }

  if (changeBtn) {
    changeBtn.addEventListener("click", async function() {
      const students = getEmails();
      if (!students) return;
      const role = document.getElementById("userRole").value;
      const dept = document.getElementById("userDept").value.trim();
      const lvl  = parseInt(document.getElementById("userLevel").value) || 1;

      try {
        await API.garanteeRoles({ students, role, department: dept, level: lvl });
        UI.success("Roles updated");
      } catch (err) { UI.error(err.message || "Failed"); }
    });
  }

  if (lockBtn) {
    lockBtn.addEventListener("click", async function() {
      const students = getEmails();
      if (!students) return;
      try {
        await API.changeLock({ students, lockStatus: true });
        UI.success("Users locked");
      } catch (err) { UI.error(err.message || "Failed"); }
    });
  }

  if (unlockBtn) {
    unlockBtn.addEventListener("click", async function() {
      const students = getEmails();
      if (!students) return;
      try {
        await API.changeLock({ students, lockStatus: false });
        UI.success("Users unlocked");
      } catch (err) { UI.error(err.message || "Failed"); }
    });
  }
}