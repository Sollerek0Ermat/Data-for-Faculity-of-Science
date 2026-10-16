/**
 * 🔑 Change Password page
 */

document.addEventListener('DOMContentLoaded', () => {
  if (!Auth.requireAuth()) return;

  renderTopbar();

  const form = document.getElementById('changeForm');
  const btn  = document.getElementById('submitBtn');
  const msg  = document.getElementById('msg');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const oldPwd     = document.getElementById('oldPwd').value;
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
      await Auth.changePassword(oldPwd, newPwd);

      msg.textContent = '✅ Password updated';
      msg.style.color = 'var(--success)';
      UI.success('Password updated');
      form.reset();
    } catch (err) {
      console.error(err);
      msg.textContent = '❌ ' + (err.message || 'Failed');
      msg.style.color = 'var(--danger)';
    } finally {
      btn.disabled = false;
    }
  });
});