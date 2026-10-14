/**
 * Authentication - Cookie-Only
 * Backend stores JWT in HttpOnly cookie. Frontend only caches user metadata.
 */

const Auth = {
  getSession() {
    try {
      return JSON.parse(localStorage.getItem(CONFIG.STORAGE.SESSION) || 'null');
    } catch { return null; }
  },

  setSession(session) {
    if (!session) return;
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
    const s = this.getSession();
    return s && s.role ? s.role : null;
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

  loginWithMicrosoft() {
    const base = CONFIG.API_URL || '';
    window.location.href = base + '/' + CONFIG.ENDPOINTS.student.microsoftLogin;
  },

  async logout() {
    try { await API.adminLogout(); } catch (err) {}
    this.clearSession();
    window.location.href = 'login.html';
  },

  /**
   * Fetch the profile from /v1/student/profile using cookies,
   * then cache user metadata in localStorage.
   * Returns the profile object or null on failure.
   */
  async syncSession() {
    try {
      const profile = await API.getProfile();
      if (profile) {
        this.setSession({
          id:            profile.id,
          name:          profile.name,
          email:         profile.email,
          role:          profile.role,
          photo:         profile.photo,
          adminLoggedIn: profile.adminLoggedIn || false,
          hasPassword:   profile.hasPassword !== undefined ? profile.hasPassword : null
        });
        return profile;
      }
    } catch (err) {
      console.warn('syncSession failed:', err.message);
      this.clearSession();
    }
    return null;
  },

  requireAuth(allowedRoles) {
    allowedRoles = allowedRoles || [];

    if (!this.isLoggedIn()) {
      window.location.href = 'login.html';
      return false;
    }

    if (allowedRoles.length) {
      const role = this.getRole();
      if (allowedRoles.indexOf(role) === -1) {
        if (typeof UI !== 'undefined') UI.error('Access denied.');
        setTimeout(() => { window.location.href = 'index.html'; }, 1500);
        return false;
      }
    }

    return true;
  },

  async changePassword(oldPassword, newPassword) {
    return await API.changePassword({
      oldPassword:      oldPassword,
      password:         newPassword,
      confirm_password: newPassword
    });
  }
};