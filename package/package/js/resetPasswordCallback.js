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
      var errorText = decodeURIComponent(error);

      // ✨ حلل الـ error لو [object Object] أو نص مش مفهوم
      if (
        errorText === '[object Object]' ||
        errorText.indexOf('[object') !== -1 ||
        errorText.trim() === ''
      ) {
        errorText = 'Microsoft authentication failed. Please try again later.';
      }

      // ✨ لو الرسالة فيها rate limit، عرضها بشكل ألطف
      if (errorText.toLowerCase().indexOf('try again') !== -1 ||
          errorText.toLowerCase().indexOf('minutes') !== -1) {
        errorText = '⏳ ' + errorText;
      }

      statusMsg.textContent = '❌ ' + errorText;
      statusMsg.style.color = 'var(--danger)';
      setTimeout(function () { location.href = 'admin-login.html'; }, 5000);
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
