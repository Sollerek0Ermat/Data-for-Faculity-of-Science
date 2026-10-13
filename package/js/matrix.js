/**
 * 🌧️ Matrix Rain — Optimized + Auto-disable on weak devices
 */
(function () {
  const canvas = document.getElementById('matrixCanvas');
  if (!canvas) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cores         = navigator.hardwareConcurrency || 8;
  const memory        = navigator.deviceMemory || 8;
  const isWeakDevice  = cores <= 4 || memory <= 4;

  if (reducedMotion || isWeakDevice) {
    canvas.style.display = 'none';
    document.body.style.backgroundImage =
      'radial-gradient(circle at 50% 40%, #0b3a6b 0%, #020d1d 70%)';
    return;
  }

  const ctx = canvas.getContext('2d', { alpha: false });

  let width, height, columns, drops;
  let fontSize = 22;
  let targetFPS = 24;
  let frameInterval = 1000 / targetFPS;
  let lastFrame = 0;
  let rafId = null;
  let paused = false;

  const isMobile = window.innerWidth < 768;
  if (isMobile) {
    fontSize = 28;
    targetFPS = 12;
    frameInterval = 1000 / targetFPS;
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

    ctx.fillStyle = '#020d1d';
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

    ctx.fillStyle = 'rgba(2, 13, 29, 0.15)';
    ctx.fillRect(0, 0, width, height);

    ctx.font = `${fontSize}px monospace`;
    ctx.shadowBlur = 0;

    for (let i = 0; i < drops.length; i++) {
      const char = chars[Math.floor(Math.random() * chars.length)];
      const x = i * fontSize;
      const y = drops[i] * fontSize;

      ctx.fillStyle = Math.random() > 0.99 ? '#ffffff' : 'rgba(0, 234, 255, 0.7)';
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
    frameInterval = 1000 / 8;
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => {
      frameInterval = 1000 / targetFPS;
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