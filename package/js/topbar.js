/**
 * 🧭 Topbar + Banner + Footer + Mobile Menu
 */

function renderTopbar(activePage = '') {
  const session = Auth.getSession();

  const pages = [
    { href: 'index.html',       key: 'nav_home' },
    { href: 'subjects.html',    key: 'nav_subjects' },
    { href: 'search.html',      key: 'nav_search' },
    { href: 'doctors.html',     key: 'nav_doctors' },
  ];

  const navLinks = pages.map(p =>
    `<a href="${p.href}" class="${activePage === p.href ? 'active' : ''}">${I18N.t(p.key)}</a>`
  ).join('');

  const authBlock = session
    ? `<a href="admin.html">${I18N.t('nav_dashboard')}</a>
       <button class="nav-logout" id="btnLogout">${I18N.t('nav_logout')}</button>`
    : '';

  const html = `
    <div class="top-banner">
      <div class="banner-track">
        <div class="banner-content">
          <span class="banner-phrase">★ ${I18N.t('banner')} ★</span>
        </div>
        <div class="banner-content">
          <span class="banner-phrase">★ ${I18N.t('banner')} ★</span>
        </div>
      </div>
    </div>

    <header class="topbar">
      <nav class="nav" id="mainNav">
        ${navLinks}
        ${authBlock}
      </nav>
    </header>
  `;

  const placeholder = document.getElementById('topbarPlaceholder');
  if (placeholder) placeholder.outerHTML = html;

  const btnLogout = document.getElementById('btnLogout');
  if (btnLogout) {
    btnLogout.addEventListener('click', () => Auth.logout());
  }

  bindMobileMenu();
}

function bindMobileMenu() {
  const btn = document.getElementById('menuToggle');
  const nav = document.getElementById('mainNav');
  if (!btn || !nav) return;

  btn.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    btn.textContent = open ? '✕' : '☰';
  });

  nav.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      nav.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
      btn.textContent = '☰';
    });
  });
}

function renderFooter() {
  return `
    <footer class="footer">
      <div class="footer-content">
        <p>${I18N.t('footer_rights')}</p>
        <p class="footer-dev">${I18N.t('footer_dev')}</p>
        <a href="login.html" class="footer-hidden-admin" title="Admin">⚙️</a>
      </div>
    </footer>
  `;
}