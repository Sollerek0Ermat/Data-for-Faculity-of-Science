/**
 * 🔌 API — متوافق 100% مع الباك
 */

const API = (() => {

  /* ═══════════════════════════════════════════
     🔧 Core Request
     ═══════════════════════════════════════════ */
  async function request(path, options = {}) {
    const { method = 'GET', body, isFormData = false } = options;

    const url = CONFIG.API_URL
      ? CONFIG.API_URL.replace(/\/$/, '') + '/' + path.replace(/^\//, '')
      : path;

    const headers = {};
    if (!isFormData && body) headers['Content-Type'] = 'application/json';

    const fetchOptions = {
      method,
      headers,
      credentials: 'include',
    };
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
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.blob();
    }

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      const msg = (data && (data.message || data.error)) || ('HTTP ' + res.status);
      throw new Error(msg);
    }

    return data;
  }

  const ep = CONFIG.ENDPOINTS;

  /* ═══════════════════════════════════════════
     🎓 Student — Profile
     ═══════════════════════════════════════════ */
  async function getProfile() {
    const res = await request(ep.student.profile);
    return Mappers.profile(res.data);
  }

  function getProfilePhotoUrl(userId) {
    return CONFIG.API_URL + '/' + ep.student.profilePhoto + '/' + userId;
  }

  /* ═══════════════════════════════════════════
     📁 Folders
     ═══════════════════════════════════════════ */
  async function getFolders(query = {}) {
    const res = await request(buildUrl(ep.student.folders, query));
    return res.data || [];
  }

  async function getFolderInfo(folder, folderName) {
    const res = await request(
      ep.student.folderInfo + '/' + folder + '/' + encodeURIComponent(folderName)
    );
    return res.data || null;
  }

  /* ═══════════════════════════════════════════
     👨‍🏫 Doctors
     ═══════════════════════════════════════════ */
  async function getDoctorWithSubjects() {
    const res = await request(ep.student.doctorWithSubjects);
    return Mappers.doctorWithSubjects(res.data);
  }

  function getDoctorPhotoUrl(doctorName) {
    return CONFIG.API_URL + '/' + ep.student.doctorPhoto + '/' + encodeURIComponent(doctorName);
  }

  function getDoctorCertificationUrl(doctorName, n) {
    return CONFIG.API_URL + '/' + ep.student.doctorCertifications + '/' + encodeURIComponent(doctorName) + '/' + n;
  }

  /* ═══════════════════════════════════════════
     📚 Subjects & Doctors (Aliases)
     ═══════════════════════════════════════════ */
  async function getSubjects() {
    const dws = await getDoctorWithSubjects();
    const map = new Map();

    dws.forEach(item => {
      item.subjects.forEach(s => {
        if (!map.has(s.id)) map.set(s.id, s);
      });
    });

    return Array.from(map.values());
  }

  async function getDoctors() {
    const dws = await getDoctorWithSubjects();
    return dws.map(d => d.doctor);
  }

  /* ═══════════════════════════════════════════
     📂 Folder Content — بالاسم
     ═══════════════════════════════════════════ */
  async function getFolderContent({ subjectName, doctorName, dataType, semesterNumber }) {
    const query = {
      department:     CONFIG.DEFAULTS.department,
      levelNumber:    CONFIG.DEFAULTS.levelNumber,
      semesterNumber: semesterNumber || CONFIG.DEFAULTS.semesterNumber,
      subject:        subjectName,
      doctor:         doctorName,
      dataType:       dataType,
    };

    const res = await request(buildUrl(ep.student.folders, query));
    return res.data || [];
  }

  /* ═══════════════════════════════════════════
     📥 Download
     ═══════════════════════════════════════════ */
  function downloadFile(dataType, dataName, mode) {
    mode = mode || 'view';
    const url = CONFIG.API_URL + '/' +
      ep.student.download + '/' +
      dataType + '/' +
      encodeURIComponent(dataName) +
      '/download?mode=' + mode;

    if (mode === 'view') {
      window.open(url, '_blank');
    } else {
      const a = document.createElement('a');
      a.href = url;
      a.download = dataName;
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
  }

  /* ═══════════════════════════════════════════
     🛡️ Admin
     ═══════════════════════════════════════════ */
  async function adminLogin({ email, password }) {
    await request(ep.admin.login, {
      method: 'POST',
      body: { password },
    });

    // بعد الـ login نجيب البروفايل
    const profile = await getProfile();

    return {
      success: true,
      session: {
        email: profile?.email || email,
        name:  profile?.name  || 'Admin',
        role:  profile?.role  || 'user',
      },
    };
  }

  async function adminLogout() {
    return await request(ep.admin.logout, { method: 'POST' });
  }

  async function changePassword({ oldPassword, password, confirm_password }) {
    return await request(ep.admin.changePassword, {
      method: 'PATCH',
      body: {
        old_password:     oldPassword,
        password:         password,
        confirm_password: confirm_password,
      },
    });
  }

  function forgotPassword() {
    window.location.href = CONFIG.API_URL + '/' + ep.admin.forgotPassword;
  }

  async function resetPassword(token, { password, confirm_password }) {
    return await request(ep.admin.resetPassword + '/' + token, {
      method: 'PATCH',
      body: { password, confirm_password },
    });
  }

  /* ═══════════════════════════════════════════
     🧑‍🏫 Moderator — Sections
     ═══════════════════════════════════════════ */
  async function addSections(formData) {
    return await request(ep.moderator.addSections, {
      method: 'POST', body: formData, isFormData: true,
    });
  }

  async function deleteSections(sectionTitle) {
    return await request(ep.moderator.deleteSections, {
      method: 'DELETE', body: { sectionTitle },
    });
  }

  async function editSection(formData) {
    return await request(ep.moderator.editSection, {
      method: 'PATCH', body: formData, isFormData: true,
    });
  }

  /* ═══════════════════════════════════════════
     🧑‍🏫 Moderator — Videos
     ═══════════════════════════════════════════ */
  async function addVideos(payload) {
    return await request(ep.moderator.addVideos, { method: 'POST', body: payload });
  }
  async function deleteVideos(videoTitle) {
    return await request(ep.moderator.deleteVideos, { method: 'DELETE', body: { videoTitle } });
  }
  async function editVideo(payload) {
    return await request(ep.moderator.editVideo, { method: 'PATCH', body: payload });
  }

  /* ═══════════════════════════════════════════
     🧑‍🏫 Moderator — Resources
     ═══════════════════════════════════════════ */
  async function addResources(formData) {
    return await request(ep.moderator.addResources, {
      method: 'POST', body: formData, isFormData: true,
    });
  }
  async function deleteResources(resourceTitle) {
    return await request(ep.moderator.deleteResources, { method: 'DELETE', body: { resourceTitle } });
  }
  async function editResource(formData) {
    return await request(ep.moderator.editResource, {
      method: 'PATCH', body: formData, isFormData: true,
    });
  }

  /* ═══════════════════════════════════════════
     🧑‍🏫 Moderator — Summaries
     ═══════════════════════════════════════════ */
  async function addSummaries(formData) {
    return await request(ep.moderator.addSummaries, {
      method: 'POST', body: formData, isFormData: true,
    });
  }
  async function deleteSummaries(summaryTitle) {
    return await request(ep.moderator.deleteSummaries, { method: 'DELETE', body: { summaryTitle } });
  }
  async function editSummary(formData) {
    return await request(ep.moderator.editSummary, {
      method: 'PATCH', body: formData, isFormData: true,
    });
  }

  /* ═══════════════════════════════════════════
     🗑️ deleteFile
     ═══════════════════════════════════════════ */
  async function deleteFile(file) {
    if (!file) throw new Error('No file provided');

    switch (file.type) {
      case 'section':  return await deleteSections(file.title);
      case 'summary':  return await deleteSummaries(file.title);
      case 'resource': return await deleteResources(file.title);
      case 'video':    return await deleteVideos(file.title);
      default: throw new Error('Unknown file type: ' + file.type);
    }
  }

  /* ═══════════════════════════════════════════
     🔧 Helpers
     ═══════════════════════════════════════════ */
  function buildUrl(path, params) {
    params = params || {};
    const qs = new URLSearchParams();
    Object.keys(params).forEach(function (k) {
      const v = params[k];
      if (v !== undefined && v !== null && v !== '') qs.append(k, v);
    });
    const q = qs.toString();
    return q ? (path + '?' + q) : path;
  }

  /* ═══════════════════════════════════════════
     🚀 Export
     ═══════════════════════════════════════════ */
  return {
    request,

    /* Student */
    getProfile,
    getProfilePhotoUrl,
    getFolders,
    getFolderInfo,
    getDoctorWithSubjects,
    getDoctorPhotoUrl,
    getDoctorCertificationUrl,

    /* Aliases */
    getSubjects,
    getDoctors,
    getFolderContent,

    /* Download */
    downloadFile,

    /* Admin */
    adminLogin,
    adminLogout,
    changePassword,
    forgotPassword,
    resetPassword,

    /* Moderator — Sections */
    addSections, deleteSections, editSection,

    /* Moderator — Videos */
    addVideos, deleteVideos, editVideo,

    /* Moderator — Resources */
    addResources, deleteResources, editResource,

    /* Moderator — Summaries */
    addSummaries, deleteSummaries, editSummary,

    /* Misc */
    deleteFile,
  };
})();