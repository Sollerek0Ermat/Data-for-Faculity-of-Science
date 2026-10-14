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
  const centerBtn = document.getElementById('centerMsLoginBtn');
  if (centerBtn) {
    centerBtn.addEventListener('click', function () {
      Auth.loginWithMicrosoft();
    });
  }
  
})