/**
 * 🌧️ Matrix Rain — Cyan (always on, transparent)
 */
(function () {
  'use strict';

  let canvas = document.getElementById('matrixCanvas');

  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = 'matrixCanvas';
    if (document.body.firstChild) {
      document.body.insertBefore(canvas, document.body.firstChild);
    } else {
      document.body.appendChild(canvas);
    }
  }

  // ✨ شيلنا الـ condition — المطر بيشتغل دايمًا
  canvas.style.display = 'block';

  const ctx = canvas.getContext('2d', { alpha: true });

  let width, height, columns, drops;
  let fontSize = 18;
  let frameInterval = 100;
  let lastFrame = 0;
  let rafId = null;
  let paused = false;

  const isMobile = window.innerWidth < 768;
  if (isMobile) {
    fontSize = 24;
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
    ctx.clearRect(0, 0, width, height);
  }

  const chars = '01アイウエオカキクケコ';

  function draw(timestamp) {
    if (paused) return;
    if (timestamp - lastFrame < frameInterval) {
      rafId = requestAnimationFrame(draw);
      return;
    }
    lastFrame = timestamp;

    // خلفية شفافة
    ctx.fillStyle = 'rgba(6, 9, 25, 0.08)';
    ctx.fillRect(0, 0, width, height);

    ctx.font = fontSize + 'px "JetBrains Mono", monospace';
    ctx.shadowBlur = 0;

    for (let i = 0; i < drops.length; i++) {
      const char = chars[Math.floor(Math.random() * chars.length)];
      const x = i * fontSize;
      const y = drops[i] * fontSize;

      if (Math.random() > 0.99) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      } else {
        ctx.fillStyle = 'rgba(0, 213, 232, 0.5)';
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
