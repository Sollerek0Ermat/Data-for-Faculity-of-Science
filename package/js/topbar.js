/**
 * Topbar - Cyberpunk / Neon Glassmorphism
 */

function renderTopbar(activePage) {
  activePage = activePage || '';

  const html = `
  <header class="topbar" id="topbar">
    <div class="topbar-inner">
      <button class="menu-toggle-btn" id="menuToggle" aria-label="Toggle menu" aria-expanded="false">
        <i class="fa-solid fa-bars" aria-hidden="true"></i>
      </button>

      <a href="index.html" class="brand" aria-label="DATA - Tanta University">
        <span class="brand-logo" aria-hidden="true"><i class="fa-solid fa-graduation-cap"></i></span>
        <span class="brand-text-wrap">
          <span class="brand-text">DATA</span>
          <span class="brand-sub">Tanta University</span>
        </span>
      </a>

      <nav class="nav" id="mainNav" aria-label="Primary">
        <a href="index.html" class="nav-link" data-nav-page="index.html">
          <i class="fa-solid fa-house" aria-hidden="true"></i><span>Home</span>
        </a>
        <a href="subjects.html" class="nav-link" data-nav-page="subjects.html">
          <i class="fa-solid fa-book-open" aria-hidden="true"></i><span>Courses</span>
        </a>
        <a href="doctors.html" class="nav-link" data-nav-page="doctors.html">
          <i class="fa-solid fa-user-doctor" aria-hidden="true"></i><span>Doctors</span>
        </a>
      </nav>

      <form class="topbar-search" id="topbarSearchForm" role="search" onsubmit="return false;">
        <i class="fa-solid fa-magnifying-glass search-icon-left" aria-hidden="true"></i>
        <input type="search" id="topbarSearch" name="q" placeholder="Search..." autocomplete="off" aria-label="Search">
        <kbd class="search-kbd" aria-hidden="true">/</kbd>
        <button type="submit" class="search-submit" id="topbarSearchBtn" aria-label="Search">
          <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
        </button>
      </form>
    </div>
  </header>`;

  const placeholder = document.getElementById('topbarPlaceholder');
  if (placeholder) placeholder.outerHTML = html;

  bindTopbarBehavior();
}

function bindTopbarBehavior() {
  const topbar = document.getElementById('topbar');
  const searchInput = document.getElementById('topbarSearch');
  const searchBtn = document.getElementById('topbarSearchBtn');
  const navLinks = document.querySelectorAll('.nav-link');
  const menuToggle = document.getElementById('menuToggle');
  const nav = document.getElementById('mainNav');
  if (!topbar) return;

  // Scroll
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      if (window.scrollY > 8) topbar.classList.add('scrolled');
      else topbar.classList.remove('scrolled');
      ticking = false;
    });
  }, { passive: true });

  // Active link
  const currentPath = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  navLinks.forEach(link => {
    const target = (link.dataset.navPage || link.getAttribute('href') || '').toLowerCase();
    if (target === currentPath) {
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
    }
  });

  // Search
  function goSearch() {
    const q = (searchInput.value || '').trim();
    if (!q) return;
    window.location.href = 'search.html?q=' + encodeURIComponent(q);
  }
  if (searchBtn) searchBtn.addEventListener('click', goSearch);
  if (searchInput) {
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); goSearch(); }
    });
  }

  // "/" shortcut
  document.addEventListener('keydown', (e) => {
    const t = e.target;
    const isTyping = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
    if (isTyping) return;
    if (e.key === '/') {
      e.preventDefault();
      searchInput.focus();
      if (searchInput.select) searchInput.select();
    }
  });

  // Mobile menu
  if (menuToggle && nav) {
    menuToggle.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      menuToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      const icon = menuToggle.querySelector('i');
      if (icon) {
        icon.classList.toggle('fa-bars', !open);
        icon.classList.toggle('fa-xmark', open);
      }
    });

    nav.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        nav.classList.remove('open');
        menuToggle.setAttribute('aria-expanded', 'false');
        const icon = menuToggle.querySelector('i');
        if (icon) { icon.classList.add('fa-bars'); icon.classList.remove('fa-xmark'); }
      });
    });

    document.addEventListener('click', (e) => {
      if (!nav.classList.contains('open')) return;
      if (nav.contains(e.target) || menuToggle.contains(e.target)) return;
      nav.classList.remove('open');
      menuToggle.setAttribute('aria-expanded', 'false');
      const icon = menuToggle.querySelector('i');
      if (icon) { icon.classList.add('fa-bars'); icon.classList.remove('fa-xmark'); }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && nav.classList.contains('open')) {
        nav.classList.remove('open');
        menuToggle.setAttribute('aria-expanded', 'false');
        const icon = menuToggle.querySelector('i');
        if (icon) { icon.classList.add('fa-bars'); icon.classList.remove('fa-xmark'); }
      }
    });
  }
}

function renderFooter() {
  const year = new Date().getFullYear();
  return [
    '<footer class="footer">',
    '<div class="footer-content">',
    '<p>© ' + year + ' — All Rights Reserved</p>',
    '<p class="footer-dev">Developed by <a href="https://wa.me/201289910513" target="_blank" style="color:#22d3ee;text-decoration:none;font-weight:700;">Abdellatif</a> &amp; <a href="https://wa.me/201206840247" target="_blank" style="color:#22d3ee;text-decoration:none;font-weight:700;">Kero Zaki</a></p>',
    '<a href="admin-login.html" class="footer-hidden-admin" title="Admin">&#x2699;&#xFE0F;</a>',
    '</div>',
    '</footer>'
  ].join('');
}