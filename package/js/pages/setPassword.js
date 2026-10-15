/**
 * 🔑 Set / Reset Password page
 */

document.addEventListener('DOMContentLoaded', async () => {
  renderTopbar();

  const profile = await Auth.syncSession();
  if (!profile && !Auth.isLoggedIn()) {
    window.location.href = 'login.html';
    return;
  }

  const form = document.getElementById('setPwdForm');
  const btn  = document.getElementById('submitBtn');
  const msg  = document.getElementById('msg');

  const urlParams = new URLSearchParams(location.search);
  const isReset = urlParams.get('reset') === '1'
               || urlParams.get('mode') === 'reset'
               || location.pathname.toLowerCase().indexOf('reset') !== -1
               || sessionStorage.getItem('pending_pwd_reset') === '1'
               || (profile && profile.hasPassword);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const newPwd     = document.getElementById('newPwd').value;
    const confirmPwd = document.getElementById('confirmPwd').value;

    msg.textContent = '';

    if (newPwd !== confirmPwd) {
      msg.textContent = '❌ Passwords do not match';
      msg.style.color = 'var(--danger)';
      return;
    }

    if (newPwd.length < 8) {
      msg.textContent = '❌ Password too short (min 8)';
      msg.style.color = 'var(--danger)';
      return;
    }

    btn.disabled = true;
    msg.textContent = 'Saving...';
    msg.style.color = 'var(--muted)';

    try {
      if (isReset) {
        await API.resetPassword({
          password: newPwd,
          confirm_password: confirmPwd
        });
        sessionStorage.removeItem('pending_pwd_reset');
      } else {
        await API.adminLogin({
          password: newPwd,
          confirm_password: confirmPwd
        });
      }

      await Auth.syncSession();

      msg.textContent = '✅ Password updated successfully';
      msg.style.color = 'var(--success)';
      UI.success('Password saved');

      setTimeout(() => {
        window.location.href = 'admin.html';
      }, 800);
    } catch (err) {
      console.error(err);
      msg.textContent = '❌ ' + (err.message || 'Failed');
      msg.style.color = 'var(--danger)';
      btn.disabled = false;
    }
  });
});
