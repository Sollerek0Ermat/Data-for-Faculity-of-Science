/**
 * Authentication + session bootstrap.
 * Single source of truth for "am I logged in?" on the frontend.
 */

const Auth = {
  getSession() {
    try {
      return JSON.parse(localStorage.getItem(CONFIG.STORAGE.SESSION) || 'null');
    } catch (e) {
      return null;
    }
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

  isOwner() { return this.getRole() === CONFIG.ROLES.OWNER; },
  isModerator() { return this.getRole() === CONFIG.ROLES.MODERATOR; },
  isDoctor() { return this.getRole() === CONFIG.ROLES.DOCTOR; },
  isUser() { return this.getRole() === CONFIG.ROLES.USER; },

  isStaff() {
    const r = this.getRole();
    return r === CONFIG.ROLES.OWNER
      || r === CONFIG.ROLES.MODERATOR
      || r === CONFIG.ROLES.DOCTOR;
  },

  isAdminLoggedIn() {
    const s = this.getSession();
    return !!(s && s.adminLoggedIn);
  },

  /* ─────────────────────────────────────────────────────────── */
  /*  Bootstrap: call this at the top of every protected page.    */
  /*                                                              */
  /*  - Try GET /v1/student/profile                              */
  /*  - On success → write the session to localStorage            */
  /*  - On failure → clear + (optionally) redirect to login.html  */
  /*                                                              */
  /*  Returns the profile on success, null on failure.            */
  /* ─────────────────────────────────────────────────────────── */
  async syncSession() {
    try {
      const profile = await API.getProfile();
      if (!profile) throw new Error('no profile');
      this.setSession({
        id: profile.id,
        name: profile.name,
        email: profile.email,
        role: profile.role,
        photo: profile.photo,
        adminLoggedIn: !!profile.adminLoggedIn,
      });
      return profile;
    } catch (err) {
      const msg = String((err && err.message) || '');

      // ONLY clear if the server explicitly said "not authorized"
      const isRealAuthFailure =
        msg.indexOf('Unauthorized') !== -1 ||
        msg.indexOf('not logged in') !== -1 ||
        msg.indexOf('login expired') !== -1 ||
        msg.indexOf('no user with this email') !== -1;

      if (isRealAuthFailure) {
        console.warn('[Auth] Unauthorized → clearing session');
        this.clearSession();
        return null;
      }

      // Any other error: keep the existing session, let the page decide
      console.warn('[Auth] syncSession soft-failed:', msg);
      return this.getSession();
    }
  },

  /* ─────────────────────────────────────────────────────────── */
  /*  bootstrap(): the one function every page calls first.       */
  /*                                                              */
  /*  opts.requireLogin  → redirect to login.html if not authed   */
  /*  opts.requireRole   → array of roles allowed                 */
  /*  opts.requireAdminLogin → require adminLoggedIn === true     */
  /*                                                              */
  /*  Returns the profile on success, null if it redirected.      */
  /* ─────────────────────────────────────────────────────────── */
  async bootstrap(opts = {}) {
    const {
      requireLogin = true,
      requireRole = null,
      requireAdminLogin = false,
    } = opts;

    // Always re-validate against the backend. Cookie is source of truth.
    const profile = await this.syncSession();

    if (!profile) {
      if (requireLogin) {
        window.location.replace('login.html');
      }
      return null;
    }

    if (requireRole && requireRole.length) {
      if (requireRole.indexOf(profile.role) === -1) {
        // Staff-only page → send regular users home
        window.location.replace('index.html');
        return null;
      }
    }

    if (requireAdminLogin && !this.isAdminLoggedIn()) {
      // Staff must pass the password gate before entering admin.html
      // The admin page itself renders the password overlay; we just
      // signal "not fully authorised yet" by returning the profile.
      return profile;
    }

    return profile;
  },

  /* ─────────────────────────────────────────────────────────── */
  /*  Microsoft login (anonymous visitors)                        */
  /* ─────────────────────────────────────────────────────────── */
  loginWithMicrosoft() {
    const base = CONFIG.API_URL || '';
    const path = CONFIG.ENDPOINTS.student.microsoftLogin;
    window.location.href = base + '/' + path;
  },

  /* ─────────────────────────────────────────────────────────── */
  /*  Admin password login (staff already authenticated with MS)  */
  /* ─────────────────────────────────────────────────────────── */
  async adminLogin(password) {
    await API.adminLogin({ password });
    // Backend sets adminLogged_in = true; refresh our session to match.
    await this.syncSession();
    return this.getSession();
  },

  async logout() {
    try {
      await API.adminLogout();          // POST /v1/admin/logout (safe if not admin)
    } catch (e) {
      // ignore — we still clear local state
    }
    this.clearSession();
    window.location.href = 'login.html';
  },

  requireAuth(allowedRoles) {
    // Kept for backward compat with existing page scripts.
    if (!this.isLoggedIn()) {
      window.location.replace('login.html');
      return false;
    }
    if (allowedRoles && allowedRoles.length) {
      const role = this.getRole();
      if (allowedRoles.indexOf(role) === -1) {
        window.location.replace('index.html');
        return false;
      }
    }
    return true;
  },

  async changePassword(oldPassword, newPassword) {
    return await API.changePassword({
      oldPassword: oldPassword,
      password: newPassword,
      confirm_password: newPassword,
    });
  },
};