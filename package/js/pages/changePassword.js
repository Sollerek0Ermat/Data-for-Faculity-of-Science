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
      msg.textContent = I18N.t('msg_password_mismatch');
      msg.style.color = 'var(--danger)';
      return;
    }

    if (newPwd.length < 6) {
      msg.textContent = I18N.t('msg_password_short');
      msg.style.color = 'var(--danger)';
      return;
    }

    btn.disabled = true;
    msg.textContent = 'Saving...';
    msg.style.color = 'var(--muted)';

    try {
      const res = await Auth.changePassword(oldPwd, newPwd);

      if (res.success) {
        msg.textContent = I18N.t('msg_password_updated');
        msg.style.color = 'var(--success)';
        UI.success(I18N.t('msg_password_updated'));
        form.reset();
        setTimeout(() => { btn.disabled = false; }, 1500);
      } else {
        msg.textContent = '❌ ' + (res.message || 'Failed');
        msg.style.color = 'var(--danger)';
        btn.disabled = false;
      }
    } catch (err) {
      console.error(err);
      msg.textContent = '❌ ' + (err.message || I18N.t('msg_error'));
      msg.style.color = 'var(--danger)';
      btn.disabled = false;
    }
  });
});