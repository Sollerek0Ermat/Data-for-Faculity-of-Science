/**
 * Admin Login - Uses existing Microsoft session (cookie) + password step
 *
 * Flow:
 *  1) Verify user is authenticated via Microsoft (cookie) AND is staff.
 *  2) If first time (no password) → new password + confirm.
 *  3) If returning → password only.
 *  4) POST /v1/admin/login with password (or password + confirm).
 *  5) Redirect to admin.html.
 */

document.addEventListener('DOMContentLoaded', async () => {
  renderTopbar();
  const footer = document.getElementById('footerPlaceholder');
  if (footer) footer.outerHTML = renderFooter();

  const subTitle = document.getElementById('subTitle');
  const msg = document.getElementById('msg');

  // ═══ 1) Verify Microsoft session ═══
  const profile = await Auth.syncSession();

  if (!profile || !profile.role) {
    // Not authenticated → login
    window.location.href = 'login.html';
    return;
  }

  const staffRoles = ['owner', 'moderator', 'doctor'];
  if (staffRoles.indexOf(profile.role) === -1) {
    if (msg) {
      msg.textContent = 'Your account does not have admin access.';
      msg.style.color = 'var(--danger)';
    }
    setTimeout(() => { window.location.href = 'index.html'; }, 2000);
    return;
  }

  // Hide Microsoft step, show password step
  const step1 = document.getElementById('step1');
  const step2 = document.getElementById('step2');
  if (step1) step1.style.display = 'none';
  if (step2) step2.style.display = 'block';

  // Determine first-time vs returning
  const hasPassword = profile.hasPassword === true;
  const firstTime = !hasPassword;

  if (subTitle) {
    subTitle.textContent = firstTime
      ? 'First time: set your admin password'
      : 'Welcome back ' + (profile.name || '') + ' - enter password';
  }

  // Build form fields dynamically
  const formContainer = document.getElementById('pwdForm');
  if (!formContainer) return;

  formContainer.innerHTML = [
    firstTime ? (
      '<div class="field"><label>New Password</label>' +
      '<input type="password" id="newPwd" placeholder="........" minlength="8" required></div>' +
      '<div class="field"><label>Confirm Password</label>' +
      '<input type="password" id="confirmPwd" placeholder="........" minlength="8" required></div>'
    ) : (
      '<div class="field"><label>Password</label>' +
      '<input type="password" id="pwd" placeholder="........" minlength="8" required></div>'
    ),
    '<button type="submit" class="btn btn-primary btn-block" id="submitBtn" style="height:52px">Continue</button>'
  ].join('');

  formContainer.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = document.getElementById('submitBtn');
    const setMsg = (text, color) => {
      if (msg) { msg.textContent = text; msg.style.color = color; }
    };

    try {
      let payload;

      if (firstTime) {
        const newPwd = document.getElementById('newPwd').value;
        const confirmPwd = document.getElementById('confirmPwd').value;

        if (!newPwd || newPwd.length < 8) {
          return setMsg('Password must be at least 8 characters', 'var(--danger)');
        }
        if (newPwd !== confirmPwd) {
          return setMsg('Passwords do not match', 'var(--danger)');
        }

        payload = { password: newPwd, confirm_password: confirmPwd };
      } else {
        const pwd = document.getElementById('pwd').value;
        if (!pwd || pwd.length < 8) {
          return setMsg('Password must be at least 8 characters', 'var(--danger)');
        }
        payload = { password: pwd };
      }

      submitBtn.disabled = true;
      setMsg('Verifying...', 'var(--muted)');

      await API.adminLogin(payload);

      // Sync session again (to capture adminLoggedIn)
      await Auth.syncSession();

      if (typeof UI !== 'undefined') UI.success('Welcome!');
      setTimeout(() => { window.location.href = 'admin.html'; }, 600);

    } catch (err) {
      console.error('adminLogin error:', err);
      submitBtn.disabled = false;
      setMsg(err.message || 'Login failed', 'var(--danger)');
    }
  });
});