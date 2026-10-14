/**
 * 🔐 Login page — Microsoft OAuth
 */

document.addEventListener('DOMContentLoaded', async () => {
  if (document.getElementById('topbarPlaceholder')) renderTopbar();
  const footer = document.getElementById('footerPlaceholder');
  if (footer) footer.outerHTML = renderFooter();

  // ⚡ معالجة الرجوع من Microsoft callback
  const urlParams = new URLSearchParams(location.search);
  const loginStatus = urlParams.get('login');
  const loginError  = urlParams.get('error');

  if (loginError) {
    UI.error('Login failed: ' + decodeURIComponent(loginError));
    history.replaceState({}, '', 'login.html');
  }

  // لو مسجل دخول بالفعل → وجّه
  if (Auth.isLoggedIn()) {
    redirectByRole();
    return;
  }

  // جرب تجيب profile (لو الكوكي موجود)
  try {
    const profile = await API.getProfile();
    if (profile && profile.role) {
      Auth.setSession({
        id:    profile.id,
        name:  profile.name,
        email: profile.email,
        role:  profile.role,
        photo: profile.photo
      });
      redirectByRole();
      return;
    }
  } catch (err) {
    console.log('Not logged in:', err.message);
  }

  // زر Microsoft Login
  const msBtn = document.getElementById('msLoginBtn');
  if (msBtn) {
    msBtn.addEventListener('click', () => {
      const base = CONFIG.API_URL || '';
      window.location.href = base + '/' + CONFIG.ENDPOINTS.student.microsoftLogin;
    });
  }
});

function redirectByRole() {
  const role = Auth.getRole();

  if (role === CONFIG.ROLES.OWNER || role === CONFIG.ROLES.MODERATOR || role === CONFIG.ROLES.DOCTOR) {
    window.location.href = 'admin.html';
  } else {
    window.location.href = 'index.html';
  }
}