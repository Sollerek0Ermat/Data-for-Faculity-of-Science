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

  /* ✨ قراءة error من URL */
  const _urlParams = new URLSearchParams(location.search);
  const _errorFromUrl = _urlParams.get('error');
  if (_errorFromUrl) {
    setMsg('❌ ' + decodeURIComponent(_errorFromUrl), 'var(--danger)');
    history.replaceState({}, document.title, location.pathname);
  }

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
      if (m.indexOf('minutes') !== -1 || m.indexOf('try again in') !== -1 || m.indexOf('wait') !== -1) {
        setMsg('⏳ ' + err.message, 'var(--warning)');
      } else if (m.indexOf('incorrect') !== -1 || m.indexOf('wrong') !== -1) {
        setMsg('Incorrect password. Please try again.', 'var(--danger)');
      } else if (m.indexOf('attempts') !== -1) {
        setMsg(err.message, 'var(--warning)');
      } else {
        setMsg(err.message || 'Login failed', 'var(--danger)');
      }

      submitBtn.disabled = false;
    }
  });

  /* 5) Forgot Password → Custom Modal → Microsoft OAuth */
  const forgotBtn = document.getElementById('forgotBtn');
  if (forgotBtn) {
    forgotBtn.addEventListener('click', function (e) {
      e.preventDefault();
      showNeonConfirm({
        title: 'Confirm Identity',
        message: 'You will be redirected to Microsoft to verify your identity.\n\nNote: You can only request this once every 10 minutes.',
        icon: 'shield',
        confirmText: 'Continue',
        cancelText: 'Cancel',
        onConfirm: function () {
          setMsg('Redirecting to Microsoft...', 'var(--muted)');
          setTimeout(function () {
            if (typeof API.forgotPassword === 'function') {
              API.forgotPassword();
            } else {
              const base = CONFIG.API_URL || '';
              window.location.href = base + '/' + CONFIG.ENDPOINTS.admin.forgotPassword;
            }
          }, 300);
        }
      });
    });
  }
});

/* ═══════════════════════════════════════════════════════════
   💬 NEON CONFIRM MODAL
   ═══════════════════════════════════════════════════════════ */
function showNeonConfirm(opts) {
  // شيل أي modal موجود
  var existing = document.querySelector('.neon-modal-overlay');
  if (existing) existing.remove();

  var icons = {
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
    warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'
  };

  var overlay = document.createElement('div');
  overlay.className = 'neon-modal-overlay';
  overlay.innerHTML =
    '<div class="neon-modal">' +
      '<div class="neon-modal-icon">' + (icons[opts.icon] || icons.info) + '</div>' +
      '<h3 class="neon-modal-title">' + (opts.title || 'Confirm') + '</h3>' +
      '<p class="neon-modal-message">' + (opts.message || '') + '</p>' +
      '<div class="neon-modal-actions">' +
        '<button type="button" class="neon-modal-btn neon-modal-btn-cancel">' + (opts.cancelText || 'Cancel') + '</button>' +
        '<button type="button" class="neon-modal-btn neon-modal-btn-confirm">' + (opts.confirmText || 'Continue') + '</button>' +
      '</div>' +
    '</div>';

  document.body.appendChild(overlay);

  var cancelBtn = overlay.querySelector('.neon-modal-btn-cancel');
  var confirmBtn = overlay.querySelector('.neon-modal-btn-confirm');

  function close() {
    overlay.style.animation = 'neonModalFadeIn 0.2s ease reverse forwards';
    setTimeout(function () { overlay.remove(); }, 200);
  }

  cancelBtn.addEventListener('click', close);
  confirmBtn.addEventListener('click', function () {
    close();
    if (typeof opts.onConfirm === 'function') opts.onConfirm();
  });

  overlay.addEventListener('click', function (ev) {
    if (ev.target === overlay) close();
  });

  function onKey(ev) {
    if (ev.key === 'Escape') {
      close();
      document.removeEventListener('keydown', onKey);
    }
  }
  document.addEventListener('keydown', onKey);
}

// اجعلها متاحة globally
window.showNeonConfirm = showNeonConfirm;
