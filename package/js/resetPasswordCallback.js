/**
 * 🔑 Reset Password Callback Handler
 * يستقبل token أو error من الـ URL ويعمل redirect
 */
(function () {
  'use strict';

  function init() {
    var statusMsg = document.getElementById('statusMsg');
    if (!statusMsg) return;

    var params = new URLSearchParams(location.search);
    var token = params.get('token');
    var error = params.get('error');

    if (error) {
      statusMsg.textContent = '❌ ' + decodeURIComponent(error);
      statusMsg.style.color = 'var(--danger)';
      setTimeout(function () { location.href = 'admin-login.html'; }, 3000);
      return;
    }

    if (token) {
      statusMsg.textContent = '✅ Verified! Redirecting...';
      statusMsg.style.color = 'var(--success)';
      setTimeout(function () {
        location.href = 'setPassword.html?token=' + encodeURIComponent(token);
      }, 800);
      return;
    }

    statusMsg.textContent = 'No token received. Please try again.';
    setTimeout(function () { location.href = 'admin-login.html'; }, 3000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
