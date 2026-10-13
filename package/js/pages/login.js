/**
 * 🔐 Login page — Microsoft OAuth only
 */

document.addEventListener('DOMContentLoaded', () => {
  renderTopbar();

  if (Auth.isLoggedIn()) {
    window.location.href = 'admin.html';
    return;
  }

  const msBtn = document.getElementById('msLoginBtn');
  if (msBtn) {
    msBtn.addEventListener('click', () => {
      if (CONFIG.USE_MOCK) {
        UI.info('🪟 Signing in with Microsoft (mock)...');
        setTimeout(() => {
          Auth.setSession({
            email: 'student@science.tanta.edu.eg',
            name: 'Mock Student',
            role: 'user',
            token: 'mock_' + Date.now(),
          });
          window.location.href = 'setPassword.html';
        }, 800);
      } else {
        window.location.href = CONFIG.ENDPOINTS.student.microsoftLogin;
      }
    });
  }
});