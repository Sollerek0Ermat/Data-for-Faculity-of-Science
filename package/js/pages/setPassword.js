/**
 * 🔑 Set / Reset Password page
 *
 * الحالات:
 *   A) Reset Password (نسي باسورده) → ?token=xxx
 *   B) First Time Set Password (أول مرة) → بدون token
 */

document.addEventListener('DOMContentLoaded', function () {
  renderTopbar();

  var urlParams  = new URLSearchParams(location.search);
  var resetToken = urlParams.get('token');
  var errorMsg   = urlParams.get('error');

  var h1   = document.querySelector('.login-card h1');
  var subP = document.querySelector('.login-card > p');
  var form = document.getElementById('setPwdForm');
  var btn  = document.getElementById('submitBtn');
  var msg  = document.getElementById('msg');

  function setMsg(text, color) {
    if (!msg) return;
    msg.textContent = text || '';
    msg.style.color = color || 'var(--muted)';
  }

  if (errorMsg) {
    setMsg('❌ ' + decodeURIComponent(errorMsg), 'var(--danger)');
    if (form) form.style.display = 'none';
    setTimeout(function () { location.href = 'admin-login.html'; }, 5000);
    return;
  }

  var isResetFlow = Boolean(resetToken);

  if (isResetFlow) {
    if (h1)   h1.textContent = '🔑 Reset Password';
    if (subP) subP.textContent = 'Enter a new password for your account';
  } else {
    if (!Auth.isLoggedIn()) {
      window.location.href = 'login.html';
      return;
    }
    if (h1)   h1.textContent = '🔑 Set Your Password';
    if (subP) subP.textContent = 'Create a password for your account';
  }

  if (!form) return;

  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    var newPwd     = document.getElementById('newPwd').value;
    var confirmPwd = document.getElementById('confirmPwd').value;

    setMsg('');

    if (newPwd !== confirmPwd) {
      return setMsg('❌ Passwords do not match', 'var(--danger)');
    }

    if (newPwd.length < 8) {
      return setMsg('❌ Password too short (min 8)', 'var(--danger)');
    }

    btn.disabled = true;
    setMsg('Saving...', 'var(--muted)');

    try {
      if (isResetFlow) {
        await API.resetPassword({
          token: resetToken,
          newPassword: newPwd
        });
        setMsg('✅ Password reset successfully', 'var(--success)');
      } else {
        await API.adminLogin({
          email: (Auth.getUser() && Auth.getUser().email) || '',
          password: newPwd
        });
        setMsg('✅ Password saved', 'var(--success)');
      }

      if (typeof UI !== 'undefined' && UI.success) UI.success('Password saved');

      setTimeout(function () {
        window.location.href = 'admin.html';
      }, 1000);

    } catch (err) {
      console.error(err);
      var errMsg = (err.message || 'Failed').toLowerCase();
      if (errMsg.indexOf('minutes') !== -1 || errMsg.indexOf('try again') !== -1 || errMsg.indexOf('wait') !== -1) {
        setMsg('⏳ ' + err.message, 'var(--warning)');
      } else {
        setMsg('❌ ' + (err.message || 'Failed'), 'var(--danger)');
      }
      btn.disabled = false;
    }
  });
});