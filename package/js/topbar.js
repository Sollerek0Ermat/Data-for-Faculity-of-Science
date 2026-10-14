/**
 * Topbar + Footer + Mobile Menu.
 * Shows "Sign in with Microsoft" if not logged in,
 * otherwise shows a profile chip (+ Admin link for staff).
 */

function renderTopbar(activePage) {
  activePage = activePage || '';

  const pages = [
    { href: 'index.html',    key: 'nav_home' },
    { href: 'subjects.html', key: 'nav_subjects' },
    { href: 'doctors.html',  key: 'nav_doctors' },
  ];

  const navLinks = pages.map(function (p) {
    const cls = (activePage === p.href) ? 'active' : '';
    return '<a href="' + p.href + '" class="' + cls + '">' + I18N.t(p.key) + '</a>';
  }).join('');

  const session = (typeof Auth !== 'undefined') ? Auth.getSession() : null;
  const isLoggedIn = !!session;
  const isStaff = isLoggedIn && ['owner', 'moderator', 'doctor'].indexOf(session.role) !== -1;

  // Right-hand slot: either the MS button or the profile chip
  let rightSlot = '';

  if (!isLoggedIn) {
    rightSlot = [
      '<button type="button" class="btn-ms-login" id="msLoginBtn">',
      '  <span class="ms-logo" aria-hidden="true"></span>',
      '  <span>Sign in with Microsoft</span>',
      '</button>',
    ].join('');
  } else {
    const initials = getInitialsTopbar(session.name);
    const adminLink = isStaff
      ? '<a href="admin.html" class="profile-menu-item">🛡️ Admin Dashboard</a>'
      : '';

    rightSlot = [
      '<div class="profile-chip" id="profileChip">',
      '  <div class="profile-avatar">' + escapeHtmlTopbar(initials) + '</div>',
      '  <span class="profile-name">' + escapeHtmlTopbar(session.name || 'User') + '</span>',
      '  <div class="profile-menu" id="profileMenu">',
      adminLink,
      '    <a href="#" class="profile-menu-item" id="logoutBtn">Logout</a>',
      '  </div>',
      '</div>',
    ].join('');
  }

  const html = [
    '<header class="topbar">',
    '<button class="menu-toggle-btn" id="menuToggle" aria-label="Toggle menu" aria-expanded="false">Menu</button>',
    '<a href="index.html" class="brand">',
    '  <div class="brand-logo"></div>',
    '  <span class="brand-text">DATA<span>.</span></span>',
    '</a>',
    '<nav class="nav" id="mainNav">',
    navLinks,
    '</nav>',
    '<div class="topbar-right" id="topbarRight">',
    rightSlot,
    '</div>',
    '</header>',
  ].join('');

  const placeholder = document.getElementById('topbarPlaceholder');
  if (placeholder) placeholder.outerHTML = html;

  // ── Wire up MS login button ─────────────────────────────────
  const msBtn = document.getElementById('msLoginBtn');
  if (msBtn) {
    msBtn.addEventListener('click', function () {
      Auth.loginWithMicrosoft();
    });
  }

  // ── Wire up profile dropdown + logout ───────────────────────
  const chip = document.getElementById('profileChip');
  const menu = document.getElementById('profileMenu');
  if (chip && menu) {
    chip.addEventListener('click', function (e) {
      // Don't toggle when clicking a menu item — let it navigate
      if (e.target.closest('.profile-menu-item')) return;
      menu.classList.toggle('open');
    });
    document.addEventListener('click', function (e) {
      if (!chip.contains(e.target)) menu.classList.remove('open');
    });
  }

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function (e) {
      e.preventDefault();
      Auth.logout();
    });
  }

  bindMobileMenu();
}

function bindMobileMenu() {
  const btn = document.getElementById('menuToggle');
  const nav = document.getElementById('mainNav');
  if (!btn || !nav) return;

  btn.addEventListener('click', function () {
    const open = nav.classList.toggle('open');
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    btn.textContent = open ? 'Close' : 'Menu';
  });

  nav.querySelectorAll('a').forEach(function (a) {
    a.addEventListener('click', function () {
      nav.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
      btn.textContent = 'Menu';
    });
  });
}

function renderFooter() {
  const year = new Date().getFullYear();
  return [
    '<footer class="footer">',
    '<div class="footer-content">',
    '<p>© ' + year + ' — All Rights Reserved</p>',
    '<p class="footer-dev">Developed by <a href="https://wa.me/201289910513" target="_blank" style="color:var(--cyan);text-decoration:none;font-weight:700;">Abdellatif</a> &amp; Kerollos Tamer</p>',
    '</div>',
    '</footer>',
  ].join('');
}

function getInitialsTopbar(name) {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function escapeHtmlTopbar(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
  });
}