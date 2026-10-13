/**
 * 🔐 Authentication
 */

const Auth = {
  getSession() {
    try {
      return JSON.parse(localStorage.getItem(CONFIG.STORAGE.SESSION) || 'null');
    } catch { return null; }
  },

  setSession(session) {
    localStorage.setItem(CONFIG.STORAGE.SESSION, JSON.stringify(session));
  },

  clearSession() {
    localStorage.removeItem(CONFIG.STORAGE.SESSION);
  },

  isLoggedIn() {
    return !!this.getSession();
  },

  getUser() {
    return this.getSession();
  },

  getRole() {
    return this.getSession()?.role || null;
  },

  isOwner()     { return this.getRole() === CONFIG.ROLES.OWNER; },
  isModerator() { return this.getRole() === CONFIG.ROLES.MODERATOR; },
  isDoctor()    { return this.getRole() === CONFIG.ROLES.DOCTOR; },
  isUser()      { return this.getRole() === CONFIG.ROLES.USER; },

  isStaff() {
    const r = this.getRole();
    return r === CONFIG.ROLES.OWNER
        || r === CONFIG.ROLES.MODERATOR
        || r === CONFIG.ROLES.DOCTOR;
  },

  /* ═══════════════════════════════════════════
     🔑 Login (Microsoft OAuth)
     ═══════════════════════════════════════════ */
  loginWithMicrosoft() {
    window.location.href = CONFIG.API_URL + '/' + CONFIG.ENDPOINTS.student.microsoftLogin;
  },

  /* ═══════════════════════════════════════════
     🎓 Login (Admin - password only)
     ═══════════════════════════════════════════ */
  async login(email, password) {
    const res = await API.adminLogin({ email, password });
    if (res?.success) {
      this.setSession(res.session);
    }
    return res;
  },

  async logout() {
    try { await API.adminLogout(); } catch {}
    this.clearSession();
    window.location.href = 'login.html';
  },

  /* ═══════════════════════════════════════════
     🛡️ Role Check
     ═══════════════════════════════════════════ */
  requireAuth(allowedRoles = []) {
    if (!this.isLoggedIn()) {
      window.location.href = 'login.html';
      return false;
    }

    if (allowedRoles.length) {
      const role = this.getRole();
      if (!allowedRoles.includes(role)) {
        UI.error('Access denied');
        setTimeout(() => window.location.href = 'index.html', 1200);
        return false;
      }
    }

    return true;
  },

  async changePassword(oldPassword, newPassword) {
    return await API.changePassword({
      oldPassword:      oldPassword,
      password:         newPassword,
      confirm_password: newPassword,
    });
  },

  /* ═══════════════════════════════════════════
     📥 Sync Session from Server
     ═══════════════════════════════════════════ */
  async syncSession() {
    try {
      const profile = await API.getProfile();
      if (profile) {
        this.setSession({
          id:    profile.id,
          name:  profile.name,
          email: profile.email,
          role:  profile.role,
          photo: profile.photo,
        });
      }
      return profile;
    } catch (err) {
      console.warn('Session sync failed:', err.message);
      return null;
    }
  },
};