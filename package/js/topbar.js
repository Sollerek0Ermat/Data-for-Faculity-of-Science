/**
 * Topbar + Footer + Mobile Menu
 */

function renderTopbar(activePage) {
  activePage = activePage || '';

  const pages = [
    { href: 'index.html',    key: 'nav_home' },
    { href: 'subjects.html', key: 'nav_subjects' },
    { href: 'doctors.html',  key: 'nav_doctors' }
  ];

  const navLinks = pages.map(function(p) {
    return '<a href="' + p.href + '" class="' + (activePage === p.href ? 'active' : '') + '">' + I18N.t(p.key) + '</a>';
  }).join('');

  const isAdminPage = activePage === 'admin.html';
  const logoutBtn = isAdminPage ? '<a href="#" id="logoutBtn" style="color:var(--danger)">Logout</a>' : '';

  const html = [
    '<header class="topbar">',
    '<button class="menu-toggle-btn" id="menuToggle" aria-label="Toggle menu" aria-expanded="false">Menu</button>',
    '<a href="index.html" class="brand">',
    '<div class="brand-logo"></div>',
    '<span class="brand-text">DATA<span>.</span></span>',
    '</a>',
    '<nav class="nav" id="mainNav">',
    navLinks,
    logoutBtn,
    '</nav>',
    '<div class="topbar-search">',
    '<input type="search" id="topbarSearch" placeholder="Search...">',
    '<span class="search-icon">Search</span>',
    '</div>',
    '</header>'
  ].join('');

  const placeholder = document.getElementById('topbarPlaceholder');
  if (placeholder) placeholder.outerHTML = html;

  const searchInput = document.getElementById('topbarSearch');
  if (searchInput) {
    searchInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        const q = searchInput.value.trim();
        if (q) window.location.href = 'search.html?q=' + encodeURIComponent(q);
      }
    });
  }

  const logoutBtnEl = document.getElementById('logoutBtn');
  if (logoutBtnEl) {
    logoutBtnEl.addEventListener('click', async function(e) {
      e.preventDefault();
      if (confirm('Logout from admin?')) {
        try { await API.adminLogout(); } catch (err) {}
        Auth.clearSession();
        sessionStorage.clear();
        localStorage.removeItem('microsoft_verified');
        localStorage.removeItem('microsoft_verified_at');
        window.location.href = 'index.html';
      }
    });
  }

  bindMobileMenu();
}

function bindMobileMenu() {
  const btn = document.getElementById('menuToggle');
  const nav = document.getElementById('mainNav');
  if (!btn || !nav) return;

  btn.addEventListener('click', function() {
    const open = nav.classList.toggle('open');
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    btn.textContent = open ? 'Close' : 'Menu';
  });

  nav.querySelectorAll('a').forEach(function(a) {
    a.addEventListener('click', function() {
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
    '<p class="footer-dev">Developed by <a href="https://wa.me/201289910513" target="_blank" style="color:var(--cyan);text-decoration:none;font-weight:700;">Abdellatif</a> &amp; <a href="https://wa.me/201206840247" target="_blank" style="color:var(--cyan);text-decoration:none;font-weight:700;">Kero Zaki</a></p>',
    '<a href="admin-login.html" class="footer-hidden-admin" title="Admin">&#x2699;&#xFE0F;</a>',
    '</div>',
    '</footer>'
  ].join('');
}