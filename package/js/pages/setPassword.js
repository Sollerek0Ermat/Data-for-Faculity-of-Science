/**
 * 🔑 Set / Reset Password page
 *
 * الحالات:
 *   A) Reset Password (نسي باسورده) → ?token=xxx
 *      - يجي من Microsoft OAuth
 *      - يستخدم API.resetPassword
 *
 *   B) First Time Set Password (أول مرة) → بدون token
 *      - لازم يكون مسجل دخول
 *      - يستخدم API.adminLogin
 *
 *   ملاحظة: الحالة (عايز يغير باسورده وهو عارفها)
 *   بتتعالج في changePassword.html (مش هنا)
 */

document.addEventListener('DOMContentLoaded', () => {
  renderTopbar();

  const urlParams  = new URLSearchParams(location.search);
  const resetToken = urlParams.get('token');
  const errorMsg   = urlParams.get('error');

  const h1   = document.querySelector('.login-card h1');
  const subP = document.querySelector('.login-card > p');
  const form = document.getElementById('setPwdForm');
  const btn  = document.getElementById('submitBtn');
  const msg  = document.getElementById('msg');

  /* ═══════════════════════════════════════════
     معالجة الأخطاء القادمة من الباك
     ═══════════════════════════════════════════ */
  if (errorMsg) {
    if (msg) {
      msg.textContent = '❌ ' + decodeURIComponent(errorMsg);
      msg.style.color = 'var(--danger)';
    }
    if (form) form.style.display = 'none';
    setTimeout(() => { location.href = 'admin-login.html'; }, 5000);
    return;
  }

  /* ═══════════════════════════════════════════
     تحديد الحالة
     ═══════════════════════════════════════════ */
  const isResetFlow = Boolean(resetToken);

  if (isResetFlow) {
    // الحالة A: Reset Password (نسي باسورده)
    if (h1)   h1.textContent = '🔑 Reset Password';
    if (subP) subP.textContent = 'Enter a new password for your account';
  } else {
    // الحالة B: First Time Set Password (أول مرة)
    if (!Auth.isLoggedIn()) {
      window.location.href = 'login.html';
      return;
    }
    if (h1)   h1.textContent = '🔑 Set Your Password';
    if (subP) subP.textContent = 'Create a password for your account';
  }

  /* ═══════════════════════════════════════════
     Submit Handler
     ═══════════════════════════════════════════ */
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
      if (isResetFlow) {
        /* ═══ الحالة A: Reset Password (نسيها) ═══ */
        await API.resetPassword({
          token: resetToken,
          newPassword: newPwd
        });
        msg.textContent = '✅ Password reset successfully';
      } else {
        /* ═══ الحالة B: First Time Set Password (أول مرة) ═══ */
        await API.adminLogin({
          email: Auth.getUser()?.email || '',
          password: newPwd
        });
        msg.textContent = '✅ Password saved';
      }

      msg.style.color = 'var(--success)';
      UI.success('Password saved');

      setTimeout(() => {
        window.location.href = 'admin.html';
      }, 1000);

    } catch (err) {
      console.error(err);

      const errMsg = (err.message || 'Failed').toLowerCase();

      // ✨ معالجة rate limiting
      if (errMsg.indexOf('minutes') !== -1 || errMsg.indexOf('try again') !== -1 || errMsg.indexOf('wait') !== -1) {
        msg.textContent = '⏳ ' + err.message;
        msg.style.color = 'var(--warning)';
      } else {
        msg.textContent = '❌ ' + (err.message || 'Failed');
        msg.style.color = 'var(--danger)';
      }

      btn.disabled = false;
    }
  });
});
