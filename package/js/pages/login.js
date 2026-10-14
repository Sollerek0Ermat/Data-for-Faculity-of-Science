/**
 * Login page.
 *
 * - Anonymous visitor        → "Sign in with Microsoft" button only.
 * - Session exists, non-staff → redirect to index.html (they're already in).
 * - Session exists, staff     → redirect to admin.html (password gate is there).
 */

document.addEventListener('DOMContentLoaded', async () => {
  const footer = document.getElementById('footerPlaceholder');
  if (footer) footer.outerHTML = renderFooter();

  // If the user has a session already, don't show login at all.
  const existing = Auth.getSession();
  if (existing) {
    if (['owner', 'moderator', 'doctor'].indexOf(existing.role) !== -1) {
      window.location.replace('admin.html');
    } else {
      window.location.replace('index.html');
    }
    return;
  }

  // Try to validate the cookie before showing anything.
  const profile = await Auth.syncSession();
  if (profile) {
    if (['owner', 'moderator', 'doctor'].indexOf(profile.role) !== -1) {
      window.location.replace('admin.html');
    } else {
      window.location.replace('index.html');
    }
    return;
  }

  // Not logged in → render the Microsoft button.
  renderTopbar();
  const msBtn = document.getElementById('msLoginBtn');
  if (msBtn) {
    // renderTopbar already binds loginWithMicrosoft, no-op here.
  }

  // Show a friendly error if we were redirected back with one.
  const params = new URLSearchParams(location.search);
  const err = params.get('error');
  if (err) {
    UI.error('Login failed: ' + decodeURIComponent(err));
    history.replaceState({}, '', 'login.html');
  }
});