/**
 * 🌐 Cyber Globe Injector
 * بيضيف الكرة الأرضية + الحلقات لأي صفحة فيها .hero-home
 */

(function () {
  'use strict';

  const GLOBE_HTML = `
    <div class="cyber-globe" aria-hidden="true">
      <!-- الحلقات المدارية -->
      <div class="globe-ring ring-1"></div>
      <div class="globe-ring ring-2"></div>
      <div class="globe-ring ring-3"></div>

      <!-- الكرة (SVG) -->
      <svg class="globe-svg" viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="globeBg" cx="38%" cy="32%" r="70%">
            <stop offset="0%"   stop-color="#4a9eff" stop-opacity=".55"/>
            <stop offset="55%"  stop-color="#0a4d99" stop-opacity=".35"/>
            <stop offset="100%" stop-color="#031030" stop-opacity=".95"/>
          </radialGradient>
          <radialGradient id="globeGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stop-color="#00D5E8" stop-opacity=".35"/>
            <stop offset="70%"  stop-color="#00D5E8" stop-opacity=".05"/>
            <stop offset="100%" stop-color="#00D5E8" stop-opacity="0"/>
          </radialGradient>
        </defs>

        <!-- توهج خارجي -->
        <circle cx="150" cy="150" r="150" fill="url(#globeGlow)"/>

        <!-- الكرة الأساسية -->
        <circle cx="150" cy="150" r="120" fill="url(#globeBg)"
                stroke="#00D5E8" stroke-width="1" stroke-opacity=".7"/>

        <!-- خطوط الطول -->
        <g stroke="#00D5E8" stroke-width=".5" fill="none" opacity=".55">
          <ellipse cx="150" cy="150" rx="30"  ry="120"/>
          <ellipse cx="150" cy="150" rx="60"  ry="120"/>
          <ellipse cx="150" cy="150" rx="90"  ry="120"/>
          <ellipse cx="150" cy="150" rx="120" ry="120"/>
        </g>

        <!-- خطوط العرض -->
        <g stroke="#00D5E8" stroke-width=".5" fill="none" opacity=".55">
          <ellipse cx="150" cy="60"  rx="104" ry="15"/>
          <ellipse cx="150" cy="100" rx="115" ry="18"/>
          <ellipse cx="150" cy="150" rx="120" ry="20"/>
          <ellipse cx="150" cy="200" rx="115" ry="18"/>
          <ellipse cx="150" cy="240" rx="104" ry="15"/>
        </g>

        <!-- القارات -->
        <g fill="#7FEAFF" opacity=".85">
          <circle cx="85"  cy="105" r="1.5"/>
          <circle cx="95"  cy="115" r="1.5"/>
          <circle cx="90"  cy="125" r="1.5"/>
          <circle cx="105" cy="120" r="1.5"/>
          <circle cx="100" cy="135" r="1.5"/>
          <circle cx="115" cy="185" r="1.5"/>
          <circle cx="110" cy="200" r="1.5"/>
          <circle cx="120" cy="210" r="1.5"/>
          <circle cx="160" cy="95"  r="1.5"/>
          <circle cx="170" cy="105" r="1.5"/>
          <circle cx="165" cy="115" r="1.5"/>
          <circle cx="170" cy="150" r="1.5"/>
          <circle cx="180" cy="160" r="1.5"/>
          <circle cx="175" cy="175" r="1.5"/>
          <circle cx="185" cy="185" r="1.5"/>
          <circle cx="200" cy="105" r="1.5"/>
          <circle cx="215" cy="115" r="1.5"/>
          <circle cx="205" cy="125" r="1.5"/>
          <circle cx="220" cy="135" r="1.5"/>
          <circle cx="215" cy="205" r="1.5"/>
          <circle cx="225" cy="210" r="1.5"/>
        </g>

        <!-- نقاط البيانات -->
        <g fill="#ffffff" opacity=".9">
          <circle cx="85"  cy="105" r=".8"/>
          <circle cx="160" cy="95"  r=".8"/>
          <circle cx="200" cy="105" r=".8"/>
          <circle cx="170" cy="150" r=".8"/>
          <circle cx="215" cy="205" r=".8"/>
        </g>
      </svg>
    </div>
  `;

  function injectGlobe() {
    document.querySelectorAll('.hero-home').forEach(hero => {
      /* لو الكرة موجودة مسبقًا، ما نكرّرهاش */
      if (hero.querySelector('.cyber-globe')) return;
      hero.insertAdjacentHTML('beforeend', GLOBE_HTML);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectGlobe);
  } else {
    injectGlobe();
  }
})();