/**
 * Login - Microsoft OAuth (Cookie-Only)
 * + error message handler من URL
 */

document.addEventListener('DOMContentLoaded', async () => {
  if (document.getElementById('topbarPlaceholder')) renderTopbar();
  const footer = document.getElementById('footerPlaceholder');
  if (footer) footer.outerHTML = renderFooter();

  /* ═══════════════════════════════════════════
     ✨ قراءة message من URL
     - يدعم: message, error
     - يشيل %20 ويحولها لمسافات
     - يشيل أي encoding
     ═══════════════════════════════════════════ */
  const urlParams = new URLSearchParams(location.search);
  const messageFromUrl = urlParams.get('message') || urlParams.get('error');

  if (messageFromUrl) {
    // شيل الـ encoding + بدّل %20 بمسافة
    let cleanMessage = decodeURIComponent(messageFromUrl);
    cleanMessage = cleanMessage.replace(/%20/g, ' ');

    // اعرض الرسالة بشكل واضح
    showLoginError(cleanMessage);

    // امسح الـ query params من الـ URL (عشان refresh ميعرضهاش تاني)
    history.replaceState({}, document.title, location.pathname);
  }

  /* ═══════════════════════════════════════════
     Check cookie-based session
     ═══════════════════════════════════════════ */
  const profile = await Auth.syncSession();
  if (profile && profile.role) {
    // Already authenticated → go to index (ALL roles)
    window.location.href = 'index.html';
    return;
  }

  /* ═══════════════════════════════════════════
     Not authenticated → show Microsoft button
     ═══════════════════════════════════════════ */
  const msBtn = document.getElementById('msLoginBtn');
  if (!msBtn) return;

  msBtn.addEventListener('click', () => {
    Auth.loginWithMicrosoft();
  });
});

/* ═══════════════════════════════════════════
   ✨ عرض رسالة خطأ احترافية
   ═══════════════════════════════════════════ */
function showLoginError(message) {
  // شيل أي error قديم
  const existing = document.getElementById('loginErrorBanner');
  if (existing) existing.remove();

  const loginCard = document.querySelector('.login-card');
  if (!loginCard) return;

  const banner = document.createElement('div');
  banner.id = 'loginErrorBanner';
  banner.className = 'login-error-banner';
  banner.setAttribute('role', 'alert');
  banner.innerHTML = [
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">',
    '  <circle cx="12" cy="12" r="10"/>',
    '  <line x1="12" y1="8" x2="12" y2="12"/>',
    '  <line x1="12" y1="16" x2="12.01" y2="16"/>',
    '</svg>',
    '<div class="login-error-text">',
    '  <strong>Sign in failed</strong>',
    '  <span>' + escapeHtml(message) + '</span>',
    '</div>'
  ].join('');

  // ضيفه في أول الكارت (قبل الـ icon)
  loginCard.insertBefore(banner, loginCard.firstChild);

  // أضف animation
  requestAnimationFrame(() => banner.classList.add('show'));
}
