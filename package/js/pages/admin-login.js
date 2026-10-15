/**
 * Admin Login
 */

document.addEventListener('DOMContentLoaded', async () => {
  renderTopbar();
  const footer = document.getElementById('footerPlaceholder');
  if (footer) footer.outerHTML = renderFooter();

  const card        = document.getElementById('adminCard');
  const title       = document.getElementById('adminTitle');
  const subtitle    = document.getElementById('adminSubtitle');
  const errorBanner = document.getElementById('errorBanner');
  const form        = document.getElementById('adminForm');
  const fields      = document.getElementById('passwordFields');
  const hint        = document.getElementById('hintText');
  const submitBtn   = document.getElementById('submitBtn');
  const msg         = document.getElementById('msg');

  const setMsg = (text, color) => {
    msg.textContent = text || '';
    msg.style.color = color || 'var(--muted)';
  };

  /* 1) Sync session */
  const profile = await Auth.syncSession();

  if (!profile || !profile.role) {
    window.location.href = 'login.html';
    return;
  }

  /* 2) Not staff → Access Denied */
  const staffRoles = ['owner', 'moderator', 'doctor'];
  if (staffRoles.indexOf(profile.role) === -1) {
    card.classList.add('error-state');
    title.textContent = '403 - Restricted Area';
    subtitle.textContent = 'Access Denied';
    errorBanner.style.display = 'block';
    errorBanner.innerHTML = [
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">',
      '  <circle cx="12" cy="12" r="10"/>',
      '  <line x1="15" y1="9" x2="9" y2="15"/>',
      '  <line x1="9" y1="9" x2="15" y2="15"/>',
      '</svg>',
      '<div>',
      '  <strong>Access Denied:</strong>',
      '  Your account (<em>' + escapeHtml(profile.email || '') + '</em>) does not have administrator privileges.',
      '</div>'
    ].join('');

    form.style.display = 'none';
    hint.style.display = 'none';
    const fb = document.getElementById('forgotBtn');
    if (fb) fb.style.display = 'none';

    setTimeout(() => { window.location.href = 'index.html'; }, 3000);
    return;
  }

  /* 3) Staff → show password form */
  const firstTime = !profile.hasPassword;

  title.textContent = 'Admin Access';
  subtitle.textContent = firstTime
    ? 'First time - create your admin password'
    : 'Welcome back, ' + (profile.name || 'admin');

  if (firstTime) {
    fields.innerHTML = [
      '<div class="input-group">',
      '  <label>New Password</label>',
      '  <div class="input-wrapper">',
      '    <input type="password" id="pwd1" placeholder="Min 8 characters" minlength="8" required>',
      '    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">',
      '      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>',
      '      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
      '    </svg>',
      '  </div>',
      '</div>',
      '<div class="input-group">',
      '  <label>Confirm Password</label>',
      '  <div class="input-wrapper">',
      '    <input type="password" id="pwd2" placeholder="Repeat password" minlength="8" required>',
      '    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">',
      '      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>',
      '      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
      '    </svg>',
      '  </div>',
      '</div>'
    ].join('');
    hint.style.display = 'block';
    hint.textContent = 'Enter a password (min 8 characters).';
  } else {
    fields.innerHTML = [
      '<div class="input-group">',
      '  <label>Password</label>',
      '  <div class="input-wrapper">',
      '    <input type="password" id="pwd1" placeholder="Enter your password" minlength="8" required>',
      '    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">',
      '      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>',
      '      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
      '    </svg>',
      '  </div>',
      '</div>'
    ].join('');
    hint.style.display = 'none';
  }

  /* 4) Submit */
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const pwd1 = document.getElementById('pwd1').value;
    const pwd2El = document.getElementById('pwd2');
    const pwd2 = pwd2El ? pwd2El.value : null;

    if (!pwd1 || pwd1.length < 8) {
      return setMsg('Password must be at least 8 characters', 'var(--danger)');
    }
    if (firstTime) {
      if (!pwd2 || pwd2.length < 8) {
        return setMsg('Please confirm your password', 'var(--danger)');
      }
      if (pwd1 !== pwd2) {
        return setMsg('Passwords do not match', 'var(--danger)');
      }
    }

    submitBtn.disabled = true;
    setMsg('Verifying...', 'var(--muted)');

    try {
      const payload = { password: pwd1 };
      if (firstTime) payload.confirm_password = pwd2;

      try {
        await API.adminLogin(payload);
      } catch (err) {
        const m = (err.message || '').toLowerCase();
        if (m.indexOf('already logged in') !== -1) {
          console.warn('[admin-login] Already logged in — redirecting');
          await Auth.syncSession();
          window.location.href = 'admin.html';
          return;
        }
        throw err;
      }

      await Auth.syncSession();
      localStorage.setItem('admin_password_set', '1');
      setMsg('Welcome!', 'var(--success)');

      setTimeout(() => { window.location.href = 'admin.html'; }, 600);

    } catch (err) {
      console.error('adminLogin error:', err);

      card.classList.remove('error-state');
      void card.offsetWidth;
      card.classList.add('error-state');

      const m = (err.message || '').toLowerCase();
      if (m.indexOf('incorrect') !== -1 || m.indexOf('wrong') !== -1) {
        setMsg('Incorrect password. Please try again.', 'var(--danger)');
      } else if (m.indexOf('attempts') !== -1) {
        setMsg(err.message, 'var(--warning)');
      } else {
        setMsg(err.message || 'Login failed', 'var(--danger)');
      }

      submitBtn.disabled = false;
    }
  });

  /* 5) Forgot Password → Microsoft OAuth */
  const forgotBtn = document.getElementById('forgotBtn');
  if (forgotBtn) {
    forgotBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (!confirm('You will be redirected to Microsoft to verify your identity, then you can set a new password.\n\nContinue?')) {
        return;
      }
      setMsg('Redirecting to Microsoft...', 'var(--muted)');
      setTimeout(() => {
        if (typeof API.forgotPassword === 'function') {
          API.forgotPassword();
        } else {
          const base = CONFIG.API_URL || '';
          window.location.href = base + '/' + CONFIG.ENDPOINTS.admin.forgotPassword;
        }
      }, 400);
    });
  }
});