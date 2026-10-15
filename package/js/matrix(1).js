/**
 * 🌧️ Matrix Rain — Cyan only
 * Auto-injects canvas if not present
 */
(function () {
  'use strict';

  let canvas = document.getElementById('matrixCanvas');

  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = 'matrixCanvas';
    document.body.insertBefore(canvas, document.body.firstChild);
  }

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cores  = navigator.hardwareConcurrency || 8;
  const memory = navigator.deviceMemory || 8;

  if (reducedMotion || cores <= 4 || memory <= 4) {
    canvas.style.display = 'none';
    return;
  }

  const ctx = canvas.getContext('2d', { alpha: false });

  let width, height, columns, drops;
  let fontSize = 20;
  let frameInterval = 100;
  let lastFrame = 0;
  let rafId = null;
  let paused = false;

  const isMobile = window.innerWidth < 768;
  if (isMobile) {
    fontSize = 26;
    frameInterval = 150;
  }

  function resize() {
    width  = window.innerWidth;
    height = window.innerHeight;
    canvas.width  = width;
    canvas.height = height;
    canvas.style.width  = width + 'px';
    canvas.style.height = height + 'px';
    columns = Math.floor(width / fontSize);
    drops = Array(columns).fill(1);
    ctx.fillStyle = '#07111F';
    ctx.fillRect(0, 0, width, height);
  }

  const chars = '01アイウエオカキクケコ';

  function draw(timestamp) {
    if (paused) return;
    if (timestamp - lastFrame < frameInterval) {
      rafId = requestAnimationFrame(draw);
      return;
    }
    lastFrame = timestamp;

    ctx.fillStyle = 'rgba(7, 17, 31, 0.15)';
    ctx.fillRect(0, 0, width, height);

    ctx.font = fontSize + 'px "JetBrains Mono", monospace';
    ctx.shadowBlur = 0;

    for (let i = 0; i < drops.length; i++) {
      const char = chars[Math.floor(Math.random() * chars.length)];
      const x = i * fontSize;
      const y = drops[i] * fontSize;

      if (Math.random() > 0.99) {
        ctx.fillStyle = '#ffffff';
      } else {
        ctx.fillStyle = 'rgba(0, 213, 232, 0.75)';
      }

      ctx.fillText(char, x, y);

      if (y > height && Math.random() > 0.975) drops[i] = 0;
      drops[i] += 1;
    }

    rafId = requestAnimationFrame(draw);
  }

  function start() {
    if (rafId) return;
    paused = false;
    lastFrame = 0;
    rafId = requestAnimationFrame(draw);
  }

  function stop() {
    paused = true;
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  let scrollTimer;
  window.addEventListener('scroll', () => {
    frameInterval = 150;
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => {
      frameInterval = isMobile ? 150 : 100;
    }, 200);
  }, { passive: true });

  document.addEventListener('visibilitychange', () => {
    document.hidden ? stop() : start();
  });

  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(resize, 250);
  });

  resize();
  start();
})();