/**
 * 🔑 Set Password page (first time)
 */

document.addEventListener('DOMContentLoaded', () => {
  renderTopbar();

  if (!Auth.isLoggedIn()) {
    window.location.href = 'login.html';
    return;
  }

  const form = document.getElementById('setPwdForm');
  const btn  = document.getElementById('submitBtn');
  const msg  = document.getElementById('msg');

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
      // adminLogin يقبل password جديد لو user.password === null
      await API.adminLogin({
        email: Auth.getUser()?.email || '',
        password: newPwd,
      });

      msg.textContent = '✅ Password saved';
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