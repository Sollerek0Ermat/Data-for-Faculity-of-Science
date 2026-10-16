/**
 * 🌧️ Matrix Rain — Reliable init
 */
(function () {
  'use strict';

  function createCanvas() {
    var canvas = document.getElementById('matrixCanvas');
    if (canvas) return canvas;

    canvas = document.createElement('canvas');
    canvas.id = 'matrixCanvas';
    document.body.insertBefore(canvas, document.body.firstChild);
    return canvas;
  }

  function initMatrix() {
    var canvas = createCanvas();

    var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      canvas.style.display = 'none';
      return;
    }

    var ctx = canvas.getContext('2d', { alpha: true });

    var width, height, columns, drops;
    var fontSize = 18;
    var frameInterval = 1000 / 30;
    var lastFrame = 0;
    var rafId = null;
    var paused = false;

    if (window.innerWidth < 768) {
      fontSize = 22;
      frameInterval = 1000 / 24;
    }

    function resize() {
      width  = window.innerWidth;
      height = window.innerHeight;
      canvas.width  = width;
      canvas.height = height;
      canvas.style.width  = width + 'px';
      canvas.style.height = height + 'px';
      columns = Math.floor(width / fontSize);
      drops = [];
      for (var i = 0; i < columns; i++) drops.push(1);
      ctx.clearRect(0, 0, width, height);
    }

    var chars = '01アイウエオカキクケコ';

    function draw(timestamp) {
      if (paused) return;
      if (timestamp - lastFrame < frameInterval) {
        rafId = requestAnimationFrame(draw);
        return;
      }
      lastFrame = timestamp;

      ctx.fillStyle = 'rgba(6, 9, 25, 0.06)';
      ctx.fillRect(0, 0, width, height);

      ctx.font = fontSize + 'px "JetBrains Mono", monospace';

      for (var i = 0; i < drops.length; i++) {
        var char = chars[Math.floor(Math.random() * chars.length)];
        var x = i * fontSize;
        var y = drops[i] * fontSize;

        if (Math.random() > 0.93) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        } else if (Math.random() > 0.6) {
          ctx.fillStyle = 'rgba(190, 130, 255, 0.55)';
        } else {
          ctx.fillStyle = 'rgba(0, 213, 232, 0.45)';
        }

        ctx.fillText(char, x, y);

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

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop(); else start();
    });

    var resizeTimeout;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(resize, 250);
    });

    resize();
    start();
  }

  // ✨ تشغيل بعد ما الصفحة تحمّل كاملة
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMatrix);
  } else {
    initMatrix();
  }
})();
