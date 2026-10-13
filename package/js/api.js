/**
 * 🔌 API — Unified layer
 * Switches between MockApi and real backend via CONFIG.USE_MOCK
 */

const API = (() => {
  async function request(path, options = {}) {
    const { method = 'GET', body, isFormData = false } = options;

    const url = CONFIG.API_URL
      ? CONFIG.API_URL.replace(/\/$/, '') + '/' + path
      : path;

    const headers = {};
    if (!isFormData && body) headers['Content-Type'] = 'application/json';

    const fetchOptions = { method, headers, credentials: 'include' };
    if (body) fetchOptions.body = isFormData ? body : JSON.stringify(body);

    let res;
    try {
      res = await fetch(url, fetchOptions);
    } catch (netErr) {
      console.error('[API] Network error:', netErr);
      throw new Error('Cannot reach server');
    }

    if (res.status === 401) {
      Auth.clearSession();
      if (!location.pathname.includes('login.html')) {
        window.location.href = 'login.html';
      }
      throw new Error('Unauthorized');
    }

    const ctype = res.headers.get('content-type') || '';
    if (!ctype.includes('application/json')) {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.blob();
    }

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      const msg = data?.message || data?.error || `HTTP ${res.status}`;
      throw new Error(msg);
    }

    return data;
  }

  const ep = CONFIG.ENDPOINTS;

  /* ═══ Cache للـ doctorWithSubjects ═══ */
  let _dwsPromise = null;
  let _dwsCache   = null;
  let _dwsCacheAt = 0;
  const DWS_TTL   = 60 * 1000;

  async function fetchDoctorWithSubjects() {
    const now = Date.now();

    if (_dwsCache && (now - _dwsCacheAt) < DWS_TTL) {
      return _dwsCache;
    }

    if (_dwsPromise) return _dwsPromise;

    _dwsPromise = (async () => {
      try {
        const data = await MockApi.getDoctorWithSubjects();
        _dwsCache   = data;
        _dwsCacheAt = Date.now();
        return data;
      } finally {
        _dwsPromise = null;
      }
    })();

    return _dwsPromise;
  }

  async function fetchDoctorWithSubjectsReal() {
    const now = Date.now();

    if (_dwsCache && (now - _dwsCacheAt) < DWS_TTL) {
      return _dwsCache;
    }
    if (_dwsPromise) return _dwsPromise;

    _dwsPromise = (async () => {
      try {
        const raw = await request(ep.student.doctorWithSubjects);
        const data = Mappers.doctorWithSubjects(raw);
        _dwsCache   = data;
        _dwsCacheAt = Date.now();
        return data;
      } finally {
        _dwsPromise = null;
      }
    })();

    return _dwsPromise;
  }

  /* ═══════════ 🎓 Student (10) ═══════════ */
  async function microsoftLogin() {
    if (CONFIG.USE_MOCK) return MockApi.microsoftLogin();
    window.location.href = ep.student.microsoftLogin;
  }

  async function microsoftCallback() {
    if (CONFIG.USE_MOCK) return MockApi.microsoftCallback();
    return await request(ep.student.microsoftCallback);
  }

  async function getProfile() {
    if (CONFIG.USE_MOCK) return MockApi.getProfile();
    return await request(ep.student.profile);
  }

  async function getProfilePhoto(userId) {
    if (CONFIG.USE_MOCK) return MockApi.getProfilePhoto(userId);
    return await request(`${ep.student.profilePhoto}/${userId}`);
  }

  async function getFolders(query = {}) {
    if (CONFIG.USE_MOCK) return MockApi.getFolders(query);
    return await request(buildUrl(ep.student.folders, query));
  }

  async function getFolderInfo(folder, folderName) {
    if (CONFIG.USE_MOCK) return MockApi.getFolderInfo(folder, folderName);
    return await request(`${ep.student.folderInfo}/${folder}/${encodeURIComponent(folderName)}`);
  }

  async function getDoctorPhoto(doctorName) {
    if (CONFIG.USE_MOCK) return MockApi.getDoctorPhoto(doctorName);
    return await request(`${ep.student.doctorPhoto}/${encodeURIComponent(doctorName)}`);
  }

  async function getDoctorCertifications(doctorName, n) {
    if (CONFIG.USE_MOCK) return MockApi.getDoctorCertifications(doctorName, n);
    return await request(`${ep.student.doctorCertifications}/${encodeURIComponent(doctorName)}/${n}`);
  }

  async function getDoctorWithSubjects() {
    if (CONFIG.USE_MOCK) return await fetchDoctorWithSubjects();
    return await fetchDoctorWithSubjectsReal();
  }

  async function downloadFile(dataType, dataName, mode = 'view') {
    if (CONFIG.USE_MOCK) return MockApi.downloadFile(dataType, dataName, mode);
    return await request(`${ep.student.download}/${dataType}/${encodeURIComponent(dataName)}/download?mode=${mode}`);
  }

  /* ═══════════ 🛡️ Admin (6) ═══════════ */
  async function adminLogin({ email, password }) {
    if (CONFIG.USE_MOCK) return MockApi.adminLogin({ email, password });

    const res = await request(ep.admin.login, {
      method: 'POST',
      body: { password },
    });

    const token = res.token || res.access_token || res.data?.token;
    const role  = res.role  || res.user?.role  || 'user';
    const user  = res.user  || res.data?.user  || null;

    return {
      success: true,
      session: { email, name: user?.name || 'Admin', role, token },
    };
  }

  async function adminLogout() {
    if (CONFIG.USE_MOCK) return MockApi.adminLogout();
    return await request(ep.admin.logout, { method: 'POST' });
  }

  async function changePassword({ oldPassword, password, confirm_password }) {
    if (CONFIG.USE_MOCK) return MockApi.changePassword();
    return await request(ep.admin.changePassword, {
      method: 'PATCH',
      body: { old_password: oldPassword, password, confirm_password },
    });
  }

  async function forgotPassword() {
    if (CONFIG.USE_MOCK) return MockApi.forgotPassword();
    window.location.href = ep.admin.forgotPassword;
  }

  async function forgotPasswordCallback() {
    if (CONFIG.USE_MOCK) return MockApi.forgotPasswordCallback();
    return await request(ep.admin.forgotPasswordCallback);
  }

  async function resetPassword(token, { password, confirm_password }) {
    if (CONFIG.USE_MOCK) return MockApi.resetPassword();
    return await request(`${ep.admin.resetPassword}/${token}`, {
      method: 'PATCH',
      body: { password, confirm_password },
    });
  }

  /* ═══════════ 🧑‍🏫 Moderator (12) ═══════════ */
  async function addSections(formData) {
    if (CONFIG.USE_MOCK) return MockApi.addSections(formData);
    return await request(ep.moderator.addSections, { method: 'POST', body: formData, isFormData: true });
  }

  async function deleteSections(sectionTitle) {
    if (CONFIG.USE_MOCK) return MockApi.deleteSections({ sectionTitle });
    return await request(ep.moderator.deleteSections, { method: 'DELETE', body: { sectionTitle } });
  }

  async function editSection(formData) {
    if (CONFIG.USE_MOCK) return MockApi.editSection(formData);
    return await request(ep.moderator.editSection, { method: 'PATCH', body: formData, isFormData: true });
  }

  async function addVideos(payload) {
    if (CONFIG.USE_MOCK) return MockApi.addVideos(payload);
    return await request(ep.moderator.addVideos, { method: 'POST', body: payload });
  }

  async function deleteVideos(videoTitle) {
    if (CONFIG.USE_MOCK) return MockApi.deleteVideos({ videoTitle });
    return await request(ep.moderator.deleteVideos, { method: 'DELETE', body: { videoTitle } });
  }

  async function editVideo(payload) {
    if (CONFIG.USE_MOCK) return MockApi.editVideo(payload);
    return await request(ep.moderator.editVideo, { method: 'PATCH', body: payload });
  }

  async function addResources(formData) {
    if (CONFIG.USE_MOCK) return MockApi.addResources(formData);
    return await request(ep.moderator.addResources, { method: 'POST', body: formData, isFormData: true });
  }

  async function deleteResources(resourceTitle) {
    if (CONFIG.USE_MOCK) return MockApi.deleteResources({ resourceTitle });
    return await request(ep.moderator.deleteResources, { method: 'DELETE', body: { resourceTitle } });
  }

  async function editResource(formData) {
    if (CONFIG.USE_MOCK) return MockApi.editResource(formData);
    return await request(ep.moderator.editResource, { method: 'PATCH', body: formData, isFormData: true });
  }

  async function addSummaries(formData) {
    if (CONFIG.USE_MOCK) return MockApi.addSummaries(formData);
    return await request(ep.moderator.addSummaries, { method: 'POST', body: formData, isFormData: true });
  }

  async function deleteSummaries(summaryTitle) {
    if (CONFIG.USE_MOCK) return MockApi.deleteSummaries({ summaryTitle });
    return await request(ep.moderator.deleteSummaries, { method: 'DELETE', body: { summaryTitle } });
  }

  async function editSummary(formData) {
    if (CONFIG.USE_MOCK) return MockApi.editSummary(formData);
    return await request(ep.moderator.editSummary, { method: 'PATCH', body: formData, isFormData: true });
  }

  /* ═══════════ 👑 Owner (17) ═══════════ */
  async function garanteeRoles(payload) {
    if (CONFIG.USE_MOCK) return MockApi.garanteeRoles(payload);
    return await request(ep.owner.garanteeRoles, { method: 'PATCH', body: payload });
  }

  async function changeLock(payload) {
    if (CONFIG.USE_MOCK) return MockApi.changeLock(payload);
    return await request(ep.owner.changeLock, { method: 'PATCH', body: payload });
  }

  async function addDepartments(payload) {
    if (CONFIG.USE_MOCK) return MockApi.addDepartments(payload);
    return await request(ep.owner.addDepartments, { method: 'POST', body: payload });
  }

  async function deleteDepartments(departmentsName) {
    if (CONFIG.USE_MOCK) return MockApi.deleteDepartments({ departmentsName });
    return await request(ep.owner.deleteDepartments, { method: 'DELETE', body: { departmentsName } });
  }

  async function editDepartment(payload) {
    if (CONFIG.USE_MOCK) return MockApi.editDepartment(payload);
    return await request(ep.owner.editDepartment, { method: 'PATCH', body: payload });
  }

  async function addLevels(payload) {
    if (CONFIG.USE_MOCK) return MockApi.addLevels(payload);
    return await request(ep.owner.addLevels, { method: 'POST', body: payload });
  }

  async function deleteLevels(payload) {
    if (CONFIG.USE_MOCK) return MockApi.deleteLevels(payload);
    return await request(ep.owner.deleteLevels, { method: 'DELETE', body: payload });
  }

  async function addSemesters(payload) {
    if (CONFIG.USE_MOCK) return MockApi.addSemesters(payload);
    return await request(ep.owner.addSemesters, { method: 'POST', body: payload });
  }

  async function deleteSemesters(payload) {
    if (CONFIG.USE_MOCK) return MockApi.deleteSemesters(payload);
    return await request(ep.owner.deleteSemesters, { method: 'DELETE', body: payload });
  }

  async function addSubjects(payload) {
    if (CONFIG.USE_MOCK) return MockApi.addSubjects(payload);
    return await request(ep.owner.addSubjects, { method: 'POST', body: payload });
  }

  async function deleteSubjects(payload) {
    if (CONFIG.USE_MOCK) return MockApi.deleteSubjects(payload);
    return await request(ep.owner.deleteSubjects, { method: 'DELETE', body: payload });
  }

  async function editSubject(payload) {
    if (CONFIG.USE_MOCK) return MockApi.editSubject(payload);
    return await request(ep.owner.editSubject, { method: 'PATCH', body: payload });
  }

  async function addDoctors(formData) {
    if (CONFIG.USE_MOCK) return MockApi.addDoctors(formData);
    return await request(ep.owner.addDoctors, { method: 'POST', body: formData, isFormData: true });
  }

  async function deleteDoctors(doctorName) {
    if (CONFIG.USE_MOCK) return MockApi.deleteDoctors({ doctorName });
    return await request(ep.owner.deleteDoctors, { method: 'DELETE', body: { doctorName } });
  }

  async function editDoctor(formData) {
    if (CONFIG.USE_MOCK) return MockApi.editDoctor(formData);
    return await request(ep.owner.editDoctor, { method: 'PATCH', body: formData, isFormData: true });
  }

  async function linkDoctors(payload) {
    if (CONFIG.USE_MOCK) return MockApi.linkDoctors(payload);
    return await request(ep.owner.linkDoctors, { method: 'POST', body: payload });
  }

  async function unlinkDoctors(payload) {
    if (CONFIG.USE_MOCK) return MockApi.unlinkDoctors(payload);
    return await request(ep.owner.unlinkDoctors, { method: 'DELETE', body: payload });
  }

  /* ═══════════ 🎯 Aliases (for pages) ═══════════ */

  async function getSubjects() {
    if (CONFIG.USE_MOCK) return MockApi.getSubjects();
    const dws = await fetchDoctorWithSubjectsReal();
    const map = new Map();
    dws.forEach(({ subjects }) => subjects.forEach(s => map.set(s.id, s)));
    return Array.from(map.values());
  }

  async function getDoctors() {
    if (CONFIG.USE_MOCK) return MockApi.getDoctors();
    const dws = await fetchDoctorWithSubjectsReal();
    return dws.map(d => d.doctor);
  }

  async function getFolder({ subjectId, doctorId, type } = {}) {
    if (CONFIG.USE_MOCK) {
      let files = MockApi.getFiles().filter(f => f.status === 'approved');
      if (subjectId) files = files.filter(f => f.subjectId === subjectId);
      if (doctorId)  files = files.filter(f => f.doctorId === doctorId);
      if (type)      files = files.filter(f => f.type === type);
      return files;
    }
    return await request(buildUrl(ep.student.folders, { subject: subjectId, doctor: doctorId, dataType: type }));
  }

  async function getAnnouncements() {
    if (CONFIG.USE_MOCK) return MockApi.getAnnouncements();
    return [];
  }

  return {
    request,
    microsoftLogin, microsoftCallback, getProfile, getProfilePhoto,
    getFolders, getFolderInfo, getDoctorPhoto, getDoctorCertifications,
    getDoctorWithSubjects, downloadFile,
    adminLogin, adminLogout, changePassword,
    forgotPassword, forgotPasswordCallback, resetPassword,
    addSections, deleteSections, editSection,
    addVideos, deleteVideos, editVideo,
    addResources, deleteResources, editResource,
    addSummaries, deleteSummaries, editSummary,
    garanteeRoles, changeLock,
    addDepartments, deleteDepartments, editDepartment,
    addLevels, deleteLevels, addSemesters, deleteSemesters,
    addSubjects, deleteSubjects, editSubject,
    addDoctors, deleteDoctors, editDoctor,
    linkDoctors, unlinkDoctors,
    getSubjects, getDoctors, getFolder, getAnnouncements,
  };
})();