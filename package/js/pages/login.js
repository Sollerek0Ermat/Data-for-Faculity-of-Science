/**
 * Login - Microsoft OAuth (Cookie-Only)
 */

document.addEventListener('DOMContentLoaded', async () => {
  if (document.getElementById('topbarPlaceholder')) renderTopbar();
  const footer = document.getElementById('footerPlaceholder');
  if (footer) footer.outerHTML = renderFooter();

  // Check cookie-based session
  const profile = await Auth.syncSession();
  if (profile && profile.role) {
    // Already authenticated → go to index (ALL roles)
    window.location.href = 'index.html';
    return;
  }

  // Not authenticated → show Microsoft button
  const msBtn = document.getElementById('msLoginBtn');
  if (!msBtn) return;

  msBtn.addEventListener('click', () => {
    Auth.loginWithMicrosoft();
  });
});