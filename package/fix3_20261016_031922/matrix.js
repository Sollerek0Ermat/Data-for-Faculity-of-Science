/**
 * 🌧️ Matrix Rain — Optimized (30fps, less density, white head + purple tail)
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

  // ✨ احترام prefers-reduced-motion
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reducedMotion) {
    canvas.style.display = 'none';
    return;
  }

  const ctx = canvas.getContext('2d', { alpha: true });

  let width, height, columns, drops;
  let fontSize = 18;
  let frameInterval = 1000 / 30;  // ✨ 30 FPS بالظبط
  let lastFrame = 0;
  let rafId = null;
  let paused = false;

  const isMobile = window.innerWidth < 768;
  if (isMobile) {
    fontSize = 22;
    frameInterval = 1000 / 24;  // موبايل أبطأ
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

    // ✨ تلاشي أبطأ (0.06 بدل 0.08) — يخلي الذيل أطول
    ctx.fillStyle = 'rgba(6, 9, 25, 0.06)';
    ctx.fillRect(0, 0, width, height);

    ctx.font = fontSize + 'px "JetBrains Mono", monospace';
    ctx.shadowBlur = 0;

    for (let i = 0; i < drops.length; i++) {
      const char = chars[Math.floor(Math.random() * chars.length)];
      const x = i * fontSize;
      const y = drops[i] * fontSize;

      // ✨ رأس العمود: أبيض ناصع (7% من الوقت)
      if (Math.random() > 0.93) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
        ctx.shadowBlur = 6;
      }
      // ✨ الذيل: بنفسجي فاتح
      else if (Math.random() > 0.6) {
        ctx.fillStyle = 'rgba(190, 130, 255, 0.55)';
        ctx.shadowBlur = 0;
      }
      // ✨ الوسط: سيان باهت
      else {
        ctx.fillStyle = 'rgba(0, 213, 232, 0.45)';
        ctx.shadowBlur = 0;
      }

      ctx.fillText(char, x, y);

      // ✨ إعادة تعيين
      if (y > height && Math.random() > 0.985) drops[i] = 0;
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

  // ✨ إيقاف عند إخفاء التاب
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      stop();
    } else {
      start();
    }
  });

  let resizeTimeout;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(resize, 250);
  });

  resize();
  start();
})();
