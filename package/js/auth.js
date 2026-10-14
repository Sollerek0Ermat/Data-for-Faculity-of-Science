/**
 * Authentication
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
    window.location.href = CONFIG.API_URL + '/' + CONFIG.ENDPOINTS.student.microsoftLogin;
  },

  async login(email, password) {
    const res = await API.adminLogin({ email, password });
    if (res && res.success) {
      this.setSession(res.session);
    }
    return res;
  },

  async logout() {
    try { await API.adminLogout(); } catch (err) {}
    this.clearSession();
    window.location.href = 'login.html';
  },

  requireAuth(allowedRoles) {
    allowedRoles = allowedRoles || [];

    // ═══ لو مش مسجّل → login.html ═══
    if (!this.isLoggedIn()) {
      console.log('Not logged in → login.html');
      window.location.href = 'login.html';
      return false;
    }

    // ═══ لو مسجّل بس role غير مسموح ═══
    if (allowedRoles.length) {
      const role = this.getRole();
      if (allowedRoles.indexOf(role) === -1) {
        console.log('Access denied. Role:', role);
        // لو الـ role = user → روح index
        UI.error('Access denied. Only admins can access this page.');
        setTimeout(function() {
          window.location.href = 'index.html';
        }, 2000);
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
  },

  async syncSession() {
    try {
      const profile = await API.getProfile();
      if (profile) {
        this.setSession({
          id:    profile.id,
          name:  profile.name,
          email: profile.email,
          role:  profile.role,
          photo: profile.photo
        });
      }
      return profile;
    } catch (err) {
      console.warn('Session sync failed:', err.message);
      return null;
    }
  }
};