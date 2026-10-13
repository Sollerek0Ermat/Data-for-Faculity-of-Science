/**
 * 🎭 Mock API — Local data for 45 endpoints
 */

const MockApi = {
  _seedSubjects: [
    { id: 's1', code: 'Com201', name: 'Computer Programming',              description: 'Obligatory • 3 Cr.', icon: '💻' },
    { id: 's2', code: 'Com203', name: 'Design and Analysis of Algorithms', description: 'Obligatory • 3 Cr.', icon: '🧮' },
    { id: 's3', code: 'Mat211', name: 'Linear Algebra',                    description: 'Obligatory • 3 Cr.', icon: '📐' },
    { id: 's4', code: 'Mat213', name: 'Discrete Mathematics',              description: 'Obligatory • 2 Cr.', icon: '🔢' },
    { id: 's5', code: 'Com205', name: 'Files Systems',                     description: 'Option • 2 Cr.',     icon: '🗄️' },
    { id: 's6', code: 'Com209', name: 'System Analysis and Design',        description: 'Option • 2 Cr.',     icon: '📊' },
    { id: 's7', code: 'Mat215', name: 'Mathematical Methods',              description: 'Option • 2 Cr.',     icon: '📈' },
    { id: 's8', code: 'Mat217', name: 'Mathematics (1)',                   description: 'Option • 2 Cr.',     icon: '➗' },
    { id: 's9', code: 'Phy203', name: 'Vibrations and Waves',              description: 'Free • 2 Cr.',       icon: '🌊' },
    { id: 's10', code: 'Geo251', name: 'Geographic Information System',    description: 'Free • 2 Cr.',       icon: '🗺️' },
  ],

  _seedDoctors: [
    { id: 'doc1', name: 'Amgad Salama',  academicDegree: 'PhD', description: 'Professor of Algorithms',   subjectIds: ['s2', 's1'] },
    { id: 'doc2', name: 'Ahmed Ali',     academicDegree: 'PhD', description: 'Files Systems Professor',   subjectIds: ['s5'] },
    { id: 'doc3', name: 'Sara Mohamed',  academicDegree: 'MSc', description: 'Mathematics Lecturer',      subjectIds: ['s3', 's4'] },
    { id: 'doc4', name: 'Khaled Hassan', academicDegree: 'PhD', description: 'Systems Professor',         subjectIds: ['s6'] },
  ],

  _seedFiles: [
    { id: 'f1', subjectId: 's2', doctorId: 'doc1', title: 'Section 1 - Introduction', type: 'section',  publisher: 'Amgad Salama', size: 1250000, created_at: '2026-01-15T10:00:00Z', status: 'approved' },
    { id: 'f2', subjectId: 's2', doctorId: 'doc1', title: 'Section 2 - Exercises',    type: 'section',  publisher: 'Amgad Salama', size: 890000,  created_at: '2026-01-20T14:30:00Z', status: 'approved' },
    { id: 'f3', subjectId: 's2', doctorId: 'doc1', title: 'Section 3 - Review',       type: 'section',  publisher: 'Amgad Salama', size: 1100000, created_at: '2026-01-25T09:00:00Z', status: 'approved' },
    { id: 'f4', subjectId: 's2', doctorId: 'doc1', title: 'Algorithms Summary',       type: 'summary',  publisher: 'Amgad Salama', size: 2100000, created_at: '2026-02-01T09:15:00Z', status: 'approved' },
    { id: 'f5', subjectId: 's1', doctorId: 'doc1', title: 'Programming Basics',       type: 'resource', publisher: 'Amgad Salama', size: 3400000, created_at: '2026-02-05T11:20:00Z', status: 'approved' },
    { id: 'f6', subjectId: 's3', doctorId: 'doc3', title: 'Linear Algebra Notes',     type: 'summary',  publisher: 'Sara Mohamed', size: 720000,  created_at: '2026-02-10T13:00:00Z', status: 'approved' },
    { id: 'f7', subjectId: 's5', doctorId: 'doc2', title: 'Files Systems Overview',   type: 'section',  publisher: 'Ahmed Ali',    size: 1600000, created_at: '2026-02-12T16:45:00Z', status: 'approved' },
    { id: 'f8', subjectId: 's4', doctorId: 'doc3', title: 'Discrete Math Intro',      type: 'section',  publisher: 'Sara Mohamed', size: 950000,  created_at: '2026-02-14T10:00:00Z', status: 'approved' },
  ],

  _seedAnnouncements: [
    { id: 'a1', title: 'Registration for Semester 2 is open', body: 'Registration is open until the end of this month.', date: '2026-02-01' },
    { id: 'a2', title: 'Scheduled Platform Maintenance',      body: 'The platform will be down Friday 2-4 AM.',           date: '2026-02-10' },
  ],

  _seedDepartments: [
    { id: 'd1', name: 'Computer Science', description: 'CS & Programming', expectedJobs: 'Developer' },
    { id: 'd2', name: 'Mathematics',      description: 'Pure & Applied',   expectedJobs: 'Researcher' },
  ],

  _get(key, seed) {
    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, JSON.stringify(seed));
    }
    return JSON.parse(localStorage.getItem(key));
  },
  _set(key, val) { localStorage.setItem(key, JSON.stringify(val)); },
  _del(key)      { localStorage.removeItem(key); },

  getSubjects:      () => MockApi._get('mock_subjects',      MockApi._seedSubjects),
  getDoctors:       () => MockApi._get('mock_doctors',       MockApi._seedDoctors),
  getFiles:         () => MockApi._get('mock_files',         MockApi._seedFiles),
  getAnnouncements: () => MockApi._get('mock_announcements', MockApi._seedAnnouncements),
  getDepartments:   () => MockApi._get('mock_departments',   MockApi._seedDepartments),

  saveSubjects:     (v) => MockApi._set('mock_subjects', v),
  saveDoctors:      (v) => MockApi._set('mock_doctors', v),
  saveFiles:        (v) => MockApi._set('mock_files', v),
  saveDepartments:  (v) => MockApi._set('mock_departments', v),

  reset() {
    ['mock_subjects','mock_doctors','mock_files','mock_announcements','mock_departments','cs_session']
      .forEach(k => MockApi._del(k));
  },

  /* ═══════════ 🎓 Student (10) ═══════════ */
  async microsoftLogin()        { await delay(30); return { status: 'success', redirectTo: '/auth/microsoft/callback' }; },
  async microsoftCallback()     { await delay(30); return { success: true, session: { email: 'student@science.tanta.edu.eg', name: 'Mock Student', role: 'user', token: 'mock_' + Date.now() } }; },
  async getProfile()            { await delay(30); const s = Auth.getSession() || {}; return { name: s.name || 'Guest', colleageEmail: s.email || '', role: s.role || 'user', photo: null }; },
  async getProfilePhoto()       { await delay(30); return null; },
  async getFolders()            { await delay(30); return MockApi.getSubjects(); },

  async getFolderInfo(folder, folderName) {
    await delay(30);
    if (folder === 'doctor')     return MockApi.getDoctors().find(d => d.name === folderName) || null;
    if (folder === 'subject')    return MockApi.getSubjects().find(s => s.name === folderName) || null;
    if (folder === 'department') return MockApi.getDepartments().find(d => d.name === folderName) || null;
    return null;
  },

  async getDoctorPhoto()        { await delay(30); return null; },
  async getDoctorCertifications() { await delay(30); return null; },

  async getDoctorWithSubjects() {
    await delay(30);
    const doctors  = MockApi.getDoctors();
    const subjects = MockApi.getSubjects();
    return doctors.map(d => ({
      doctor: d,
      subjects: (d.subjectIds || []).map(id => subjects.find(s => s.id === id)).filter(Boolean),
    }));
  },

  async downloadFile(dataType, dataName, mode = 'view') {
    await delay(30);
    toast(`📥 ${mode === 'view' ? 'Viewing' : 'Downloading'}: ${dataName}`, 'success');
    return null;
  },

  /* ═══════════ 🛡️ Admin (6) ═══════════ */
  async adminLogin({ email, password }) {
    await delay(30);
    if (email === 'admin@data.com' && password === 'admin123') {
      return { success: true, session: { email, name: 'Admin', role: 'owner', token: 'mock_' + Date.now() } };
    }
    return { success: false, message: 'Invalid email or password' };
  },

  async adminLogout()             { await delay(30); return { status: 'success' }; },
  async changePassword()          { await delay(30); return { status: 'success', message: 'password changed successfully' }; },
  async forgotPassword()          { await delay(30); return { status: 'success', message: 'check your email' }; },
  async forgotPasswordCallback()  { await delay(30); return { status: 'success', resetToken: 'mock-token-' + Date.now() }; },
  async resetPassword()           { await delay(30); return { status: 'success', message: 'password reset successfully' }; },

  /* ═══════════ 🧑‍🏫 Moderator (12) ═══════════ */
  async addSections()    { await delay(30); return { status: 'success', "number of added sections": 1 }; },
  async deleteSections(payload)  { await delay(30); return { status: 'success', "number of deleted sections": payload.sectionTitle?.length || 0 }; },
  async editSection()    { await delay(30); return { status: 'success', message: 'section updated' }; },
  async addVideos(payload)       { await delay(30); return { status: 'success', "number of added videos": payload.length || 1 }; },
  async deleteVideos(payload)    { await delay(30); return { status: 'success', "number of deleted videos": payload.videoTitle?.length || 0 }; },
  async editVideo()      { await delay(30); return { status: 'success', message: 'video updated' }; },
  async addResources()   { await delay(30); return { status: 'success', "number of added resources": 1 }; },
  async deleteResources(payload) { await delay(30); return { status: 'success', "number of deleted resources": payload.resourceTitle?.length || 0 }; },
  async editResource()   { await delay(30); return { status: 'success', message: 'resource updated' }; },
  async addSummaries()   { await delay(30); return { status: 'success', "number of added summaries": 1 }; },
  async deleteSummaries(payload) { await delay(30); return { status: 'success', "number of deleted summaries": payload.summaryTitle?.length || 0 }; },
  async editSummary()    { await delay(30); return { status: 'success', message: 'summary updated' }; },

  /* ═══════════ 👑 Owner (17) ═══════════ */
  async garanteeRoles(payload) { await delay(30); return { status: 'success', "number of updated users": payload.students?.length || 0 }; },
  async changeLock(payload)    { await delay(30); return { status: 'success', "number of updated users": payload.students?.length || 0 }; },

  async addDepartments(payload) {
    await delay(30);
    const departments = MockApi.getDepartments();
    const added = [];
    payload.forEach(d => {
      if (!departments.some(x => x.name === d.DepartmentName)) {
        const newDep = { id: uid('d'), name: d.DepartmentName, description: d.departmentDescription, expectedJobs: d.departmentExpectedJobs };
        departments.push(newDep);
        added.push(newDep);
      }
    });
    MockApi.saveDepartments(departments);
    return { status: 'success', "number of departments created": added.length };
  },

  async deleteDepartments(payload) {
    await delay(30);
    const departments = MockApi.getDepartments();
    const names = payload.departmentsName || [];
    const filtered = departments.filter(d => !names.includes(d.name));
    MockApi.saveDepartments(filtered);
    return { status: 'success', "number of departments deleted": departments.length - filtered.length };
  },

  async editDepartment(payload) {
    await delay(30);
    const departments = MockApi.getDepartments();
    const dep = departments.find(d => d.name === payload.departmentName);
    if (dep) {
      if (payload.newDepartmentName) dep.name = payload.newDepartmentName;
      if (payload.departmentDescription) dep.description = payload.departmentDescription;
      if (payload.departmentExpectedJobs) dep.expectedJobs = payload.departmentExpectedJobs;
      MockApi.saveDepartments(departments);
    }
    return { status: 'success', message: 'department updated' };
  },

  async addLevels(payload)      { await delay(30); return { status: 'success', "number of levels created": payload.length || 1 }; },
  async deleteLevels(payload)   { await delay(30); return { status: 'success', "number of levels deleted": payload.length || 1 }; },
  async addSemesters(payload)   { await delay(30); return { status: 'success', "number of semesters created": payload.length || 1 }; },
  async deleteSemesters(payload){ await delay(30); return { status: 'success', "number of semesters deleted": payload.length || 1 }; },

  async addSubjects(payload) {
    await delay(30);
    const subjects = MockApi.getSubjects();
    const added = [];
    payload.forEach(s => {
      if (!subjects.some(x => x.name === s.subjectName)) {
        const newSub = { id: uid('s'), name: s.subjectName, description: s.subjectDescription, icon: CONFIG.DEFAULT_SUBJECT_ICON, code: '' };
        subjects.push(newSub);
        added.push(newSub);
      }
    });
    MockApi.saveSubjects(subjects);
    return { status: 'success', "number of subjects created": added.length };
  },

  async deleteSubjects(payload) {
    await delay(30);
    const subjects = MockApi.getSubjects();
    const names = payload.map(s => s.subjectName);
    const filtered = subjects.filter(s => !names.includes(s.name));
    MockApi.saveSubjects(filtered);
    return { status: 'success', "number of subjects deleted": subjects.length - filtered.length };
  },

  async editSubject(payload) {
    await delay(30);
    const subjects = MockApi.getSubjects();
    const sub = subjects.find(s => s.name === payload.subjectName);
    if (sub) {
      if (payload.newSubjectName) sub.name = payload.newSubjectName;
      if (payload.subjectDescription) sub.description = payload.subjectDescription;
      MockApi.saveSubjects(subjects);
    }
    return { status: 'success', message: 'subject updated' };
  },

  async addDoctors(formData) {
    await delay(30);
    let payload = [];
    try {
      const data = formData.get('data');
      payload = JSON.parse(data);
    } catch { /* ignore */ }

    const doctors = MockApi.getDoctors();
    const added = [];
    payload.forEach(d => {
      if (!doctors.some(x => x.name === d.doctorName)) {
        const newDoc = {
          id: uid('doc'),
          name: d.doctorName,
          academicDegree: d.doctorAcademicDegree || 'PhD',
          description: d.doctorDescription || '',
          subjectIds: [],
        };
        doctors.push(newDoc);
        added.push(newDoc);
      }
    });
    MockApi.saveDoctors(doctors);
    return { status: 'success', "number of doctors created": added.length };
  },

  async deleteDoctors(payload) {
    await delay(30);
    const doctors = MockApi.getDoctors();
    const names = payload.doctorName || [];
    const filtered = doctors.filter(d => !names.includes(d.name));
    MockApi.saveDoctors(filtered);
    return { status: 'success', "number of doctors deleted": doctors.length - filtered.length };
  },

  async editDoctor()    { await delay(30); return { status: 'success', message: 'doctor updated' }; },
  async linkDoctors(payload)    { await delay(30); return { status: 'success', "number of doctors linked with subjects": payload.length || 1 }; },
  async unlinkDoctors(payload)  { await delay(30); return { status: 'success', "number of doctors unlinked from subjects": payload.length || 0 }; },
};

/* delay مصغّر جداً — 30ms للحفاظ على async */
function delay(_ms) {
  return new Promise(r => setTimeout(r, 30));
}