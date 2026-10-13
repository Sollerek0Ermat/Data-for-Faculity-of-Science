/**
 * 🔐 Login page — Dev Mode
 */

document.addEventListener('DOMContentLoaded', async () => {
  if (document.getElementById('topbarPlaceholder')) {
    renderTopbar();
  }

  const footer = document.getElementById('footerPlaceholder');
  if (footer) footer.outerHTML = renderFooter();

  // ═══════════════════════════════════════════
  // 🛠️ DEV MODE — دخول مباشر بدون تحقق
  // ═══════════════════════════════════════════
  if (CONFIG.DEV_MODE) {
    // احفظ session وهمي
    Auth.setSession({
      id:    '1',
      name:  'Dev Admin',
      email: 'dev@science.tanta.edu.eg',
      role:  'owner',
    });

    // روح للأدمن علطول
    window.location.href = 'admin.html';
    return;
  }

  // ═══════════════════════════════════════════
  // 🔐 الوضع الطبيعي — Microsoft Login
  // ═══════════════════════════════════════════
  if (Auth.isLoggedIn()) {
    redirectByRole();
    return;
  }

  const msBtn = document.getElementById('msLoginBtn');
  if (msBtn) {
    msBtn.addEventListener('click', () => {
      const url = CONFIG.API_URL + '/' + CONFIG.ENDPOINTS.student.microsoftLogin;
      window.location.href = url;
    });
  }
});

function redirectByRole() {
  const role = Auth.getRole();
  if (role === CONFIG.ROLES.OWNER ||
      role === CONFIG.ROLES.MODERATOR ||
      role === CONFIG.ROLES.DOCTOR) {
    window.location.href = 'admin.html';
  } else {
    window.location.href = 'index.html';
  }
}