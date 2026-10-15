/**
 * 🌐 Cyber Globe Injector — Neon Edition (Enhanced)
 */

(function () {
  'use strict';

  const GLOBE_HTML = `
    <div class="cyber-globe" aria-hidden="true">
      <svg class="globe-svg" viewBox="0 0 320 320" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="gl" cx="35%" cy="30%">
            <stop offset="0" stop-color="#67e8f9"/>
            <stop offset=".5" stop-color="#5b21b6"/>
            <stop offset="1" stop-color="#0b0f3a"/>
          </radialGradient>
          <linearGradient id="rg" x1="0" x2="1">
            <stop offset="0" stop-color="#00f2fe"/>
            <stop offset="1" stop-color="#ff007f"/>
          </linearGradient>
        </defs>

        <circle cx="160" cy="160" r="95" fill="url(#gl)"/>

        <g fill="none" stroke="#a5f3fc" stroke-opacity=".55" stroke-width=".8">
          <circle cx="160" cy="160" r="95"/>
          <ellipse cx="160" cy="160" rx="95" ry="30"/>
          <ellipse cx="160" cy="160" rx="95" ry="62"/>
          <ellipse cx="160" cy="160" rx="30" ry="95"/>
          <ellipse cx="160" cy="160" rx="62" ry="95"/>
          <line x1="65" y1="160" x2="255" y2="160"/>
          <line x1="160" y1="65" x2="160" y2="255"/>
        </g>

        <g fill="#e0f7ff">
          <circle cx="130" cy="120" r="1.8"/>
          <circle cx="185" cy="105" r="1.8"/>
          <circle cx="205" cy="150" r="1.8"/>
          <circle cx="150" cy="190" r="1.8"/>
          <circle cx="118" cy="165" r="1.8"/>
          <circle cx="190" cy="205" r="1.8"/>
          <circle cx="165" cy="140" r="1.8"/>
        </g>

        <g class="globe-spin-1" fill="none" stroke="url(#rg)" stroke-width="2.2">
          <ellipse cx="160" cy="160" rx="150" ry="46" transform="rotate(-25 160 160)"/>
          <circle cx="296" cy="112" r="5" fill="#00f2fe" stroke="none"/>
        </g>

        <g class="globe-spin-2" fill="none" stroke="url(#rg)" stroke-width="1.4" stroke-opacity=".8">
          <ellipse cx="160" cy="160" rx="132" ry="62" transform="rotate(38 160 160)"/>
          <circle cx="44" cy="218" r="4" fill="#ff007f" stroke="none"/>
        </g>
      </svg>
    </div>
  `;

  function injectGlobe() {
    document.querySelectorAll('.hero-home, .hero').forEach(hero => {
      hero.querySelectorAll('.cyber-globe').forEach(g => g.remove());
      hero.insertAdjacentHTML('beforeend', GLOBE_HTML);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectGlobe);
  } else {
    injectGlobe();
  }
})();
