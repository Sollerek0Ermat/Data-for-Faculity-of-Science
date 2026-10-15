/**
 * API - Cookie-Only Authentication
 * JWT is stored ONLY in HttpOnly cookies (backend manages it).
 * Frontend NEVER reads/stores/sends the token.
 */

const API = (function() {

  async function request(path, options) {
    options = options || {};
    const method = options.method || "GET";
    const body = options.body;
    const isFormData = options.isFormData || false;

    const url = CONFIG.API_URL
      ? CONFIG.API_URL.replace(/\/$/, "") + "/" + path.replace(/^\//, "")
      : "/" + path.replace(/^\//, "");

    const headers = {};
    if (!isFormData && body) headers["Content-Type"] = "application/json";

    // Cookie-only: never send Authorization header
    const fetchOptions = {
      method: method,
      headers: headers,
      credentials: "include"
    };
    if (body) fetchOptions.body = isFormData ? body : JSON.stringify(body);

    let res;
    try {
      res = await fetch(url, fetchOptions);
    } catch (netErr) {
      console.error("[API] Network error:", netErr);
      throw new Error("Cannot reach server");
    }

    // On 401 -> clear session + redirect (avoid loop)
    if (res.status === 401) {
      if (typeof Auth !== 'undefined') Auth.clearSession();
      const onLogin = location.pathname.indexOf("login.html") !== -1;
      const onAdminLogin = location.pathname.indexOf("admin-login.html") !== -1;
      if (!onLogin && !onAdminLogin) {
        window.location.href = "login.html";
      }
      throw new Error("Unauthorized");
    }

    const ctype = res.headers.get("content-type") || "";
    if (ctype.indexOf("application/json") === -1) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return await res.blob();
    }

    const data = await res.json().catch(function() { return null; });

    if (!res.ok) {
      const msg = (data && (data.message || data.error)) || ("HTTP " + res.status);
      throw new Error(msg);
    }

    return data;
  }

  const ep = CONFIG.ENDPOINTS;

  async function getProfile() {
    const res = await request(ep.student.profile);
    return Mappers.profile(res.data);
  }

  function getProfilePhotoUrl(userId) {
    return (CONFIG.API_URL || "") + "/" + ep.student.profilePhoto + "/" + userId;
  }

  async function getFolders(query) {
    const res = await request(buildUrl(ep.student.folders, query || {}));
    return res.data || [];
  }

  async function getFolderInfo(folder, folderName) {
    const res = await request(ep.student.folderInfo + "/" + folder + "/" + encodeURIComponent(folderName));
    return res.data || null;
  }

  async function getDoctorWithSubjects() {
    const res = await request(ep.student.doctorWithSubjects);
    return Mappers.doctorWithSubjects(res.data);
  }

  function getDoctorPhotoUrl(doctorName) {
    return (CONFIG.API_URL || "") + "/" + ep.student.doctorPhoto + "/" + encodeURIComponent(doctorName);
  }

  function getDoctorCertificationUrl(doctorName, n) {
    return (CONFIG.API_URL || "") + "/" + ep.student.doctorCertifications + "/" + encodeURIComponent(doctorName) + "/" + n;
  }

  async function getSubjects() {
    const dws = await getDoctorWithSubjects();
    const map = new Map();
    dws.forEach(function(item) {
      (item.subjects || []).forEach(function(s) {
        var name = s.name || s.id;
        if (!name) return;
        if (!map.has(name)) {
          map.set(name, {
            id: name, name: name,
            code: s.code || '',
            description: s.description || '',
            icon: s.icon || CONFIG.DEFAULT_SUBJECT_ICON,
            department: s.department || null,
            levelNumber: s.levelNumber || null,
            semesterNumber: s.semesterNumber || null,
            link: s.link || null
          });
        }
      });
    });
    return Array.from(map.values()).sort(function(a, b) { return a.name.localeCompare(b.name); });
  }

  async function getDoctors() {
    const dws = await getDoctorWithSubjects();
    return dws.map(function(d) { return d.doctor; });
  }

  async function getFolderContent(opts) {
    let dt = opts.dataType;
    if (dt === 'recourse') dt = 'resource';
    const query = {
      department:     opts.department     || CONFIG.DEFAULTS.department,
      levelNumber:    opts.levelNumber    || CONFIG.DEFAULTS.levelNumber,
      semesterNumber: opts.semesterNumber || CONFIG.DEFAULTS.semesterNumber,
      subject:        opts.subjectName,
      doctor:         opts.doctorName,
      dataType:       dt
    };
    const res = await request(buildUrl(ep.student.folders, query));
    return res.data || [];
  }

  function downloadFile(dataType, dataName, mode) {
    mode = mode || "view";
    let dt = dataType === 'recourse' ? 'resource' : dataType;
    const base = CONFIG.API_URL || "";
    const url = base + "/" + ep.student.download + "/" + dt + "/" + encodeURIComponent(dataName) + "/download?mode=" + mode;
    if (mode === "view") window.open(url, "_blank");
    else {
      const a = document.createElement("a");
      a.href = url;
      a.download = dataName;
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
  }

  /* Admin */
  async function adminLogin(opts) {
    const body = { password: opts.password };
    if (opts.confirm_password !== undefined) {
      body.confirm_password = opts.confirm_password;
    }
    return await request(ep.admin.login, { method: "POST", body: body });
  }

  async function adminLoginDirect(opts) {
    return await request(ep.admin.loginDirect, {
      method: "POST",
      body: { email: opts.email, password: opts.password }
    });
  }

  async function adminLogout() {
    return await request(ep.admin.logout, { method: "POST" });
  }

  async function changePassword(opts) {
    return await request(ep.admin.changePassword, {
      method: "PATCH",
      body: {
        old_password: opts.oldPassword,
        password: opts.password,
        confirm_password: opts.confirm_password
      }
    });
  }

  function forgotPasswordWithMicrosoft() {
    const base = CONFIG.API_URL ? CONFIG.API_URL.replace(/\/$/, "") : "";
    window.location.href = base + "/" + ep.admin.forgotPassword.replace(/^\//, "");
  }

  async function resetPassword(opts) {
    const body = {
      password: opts.password,
      confirm_password: opts.confirm_password || opts.password
    };
    try {
      return await request(ep.admin.resetPassword, { method: "PATCH", body: body });
    } catch (err) {
      if (err.message && (err.message.indexOf("404") !== -1 || err.message.indexOf("405") !== -1 || err.message.toLowerCase().indexOf("cannot patch") !== -1)) {
        return await request(ep.admin.resetPassword, { method: "POST", body: body });
      }
      throw err;
    }
  }

  /* Moderator */
  async function addSections(fd) { return await request(ep.moderator.addSections, { method: "POST", body: fd, isFormData: true }); }
  async function deleteSections(t) { return await request(ep.moderator.deleteSections, { method: "DELETE", body: { sectionTitle: t } }); }
  async function editSection(fd) { return await request(ep.moderator.editSection, { method: "PATCH", body: fd, isFormData: true }); }
  async function addVideos(p) { return await request(ep.moderator.addVideos, { method: "POST", body: p }); }
  async function deleteVideos(t) { return await request(ep.moderator.deleteVideos, { method: "DELETE", body: { videoTitle: t } }); }
  async function editVideo(p) { return await request(ep.moderator.editVideo, { method: "PATCH", body: p }); }
  async function addResources(fd) { return await request(ep.moderator.addResources, { method: "POST", body: fd, isFormData: true }); }
  async function deleteResources(t) { return await request(ep.moderator.deleteResources, { method: "DELETE", body: { resourceTitle: t } }); }
  async function editResource(fd) { return await request(ep.moderator.editResource, { method: "PATCH", body: fd, isFormData: true }); }
  async function addSummaries(fd) { return await request(ep.moderator.addSummaries, { method: "POST", body: fd, isFormData: true }); }
  async function deleteSummaries(t) { return await request(ep.moderator.deleteSummaries, { method: "DELETE", body: { summaryTitle: t } }); }
  async function editSummary(fd) { return await request(ep.moderator.editSummary, { method: "PATCH", body: fd, isFormData: true }); }

  /* Owner */
  async function addDoctors(fd) { return await request(ep.owner.addDoctors, { method: "POST", body: fd, isFormData: true }); }
  async function deleteDoctors(n) { return await request(ep.owner.deleteDoctors, { method: "DELETE", body: { doctorName: Array.isArray(n) ? n : [n] } }); }
  async function editDoctor(fd) { return await request(ep.owner.editDoctor, { method: "PATCH", body: fd, isFormData: true }); }
  async function addSubjects(p) { return await request(ep.owner.addSubjects, { method: "POST", body: p }); }
  async function deleteSubjects(p) { return await request(ep.owner.deleteSubjects, { method: "DELETE", body: p }); }
  async function editSubject(p) { return await request(ep.owner.editSubject, { method: "PATCH", body: p }); }
  async function addDepartments(p) { return await request(ep.owner.addDepartments, { method: "POST", body: p }); }
  async function deleteDepartments(n) { return await request(ep.owner.deleteDepartments, { method: "DELETE", body: { departmentsName: Array.isArray(n) ? n : [n] } }); }
  async function editDepartment(p) { return await request(ep.owner.editDepartment, { method: "PATCH", body: p }); }
  async function addLevels(p) { return await request(ep.owner.addLevels, { method: "POST", body: p }); }
  async function deleteLevels(p) { return await request(ep.owner.deleteLevels, { method: "DELETE", body: p }); }
  async function addSemesters(p) { return await request(ep.owner.addSemesters, { method: "POST", body: p }); }
  async function deleteSemesters(p) { return await request(ep.owner.deleteSemesters, { method: "DELETE", body: p }); }
  async function linkDoctors(p) { return await request(ep.owner.linkDoctors, { method: "POST", body: p }); }
  async function unlinkDoctors(p) { return await request(ep.owner.unlinkDoctors, { method: "DELETE", body: p }); }
  async function garanteeRoles(p) { return await request(ep.owner.garanteeRoles, { method: "PATCH", body: p }); }
  async function changeLock(p) { return await request(ep.owner.changeLock, { method: "PATCH", body: p }); }

  function buildUrl(path, params) {
    params = params || {};
    const qs = new URLSearchParams();
    Object.keys(params).forEach(function(k) {
      const v = params[k];
      if (v !== undefined && v !== null && v !== "") qs.append(k, v);
    });
    const q = qs.toString();
    return q ? (path + "?" + q) : path;
  }

  return {
    request: request,
    getProfile: getProfile,
    getProfilePhotoUrl: getProfilePhotoUrl,
    getFolders: getFolders,
    getFolderInfo: getFolderInfo,
    getDoctorWithSubjects: getDoctorWithSubjects,
    getDoctorPhotoUrl: getDoctorPhotoUrl,
    getDoctorCertificationUrl: getDoctorCertificationUrl,
    getSubjects: getSubjects,
    getDoctors: getDoctors,
    getFolderContent: getFolderContent,
    downloadFile: downloadFile,
    adminLogin: adminLogin,
    adminLoginDirect: adminLoginDirect,
    adminLogout: adminLogout,
    changePassword: changePassword,
    forgotPasswordWithMicrosoft: forgotPasswordWithMicrosoft,
    resetPassword: resetPassword,
    addSections: addSections, deleteSections: deleteSections, editSection: editSection,
    addVideos: addVideos, deleteVideos: deleteVideos, editVideo: editVideo,
    addResources: addResources, deleteResources: deleteResources, editResource: editResource,
    addSummaries: addSummaries, deleteSummaries: deleteSummaries, editSummary: editSummary,
    addDoctors: addDoctors, deleteDoctors: deleteDoctors, editDoctor: editDoctor,
    addSubjects: addSubjects, deleteSubjects: deleteSubjects, editSubject: editSubject,
    addDepartments: addDepartments, deleteDepartments: deleteDepartments, editDepartment: editDepartment,
    addLevels: addLevels, deleteLevels: deleteLevels,
    addSemesters: addSemesters, deleteSemesters: deleteSemesters,
    linkDoctors: linkDoctors, unlinkDoctors: unlinkDoctors,
    garanteeRoles: garanteeRoles, changeLock: changeLock
  };
})();
